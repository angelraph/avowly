/**
 * Tells the right party what just happened to their money: browser push (works with the
 * page closed, no account needed) and email when configured. Failures are logged and
 * never interrupt the payment flow.
 */
import { and, eq, inArray } from "drizzle-orm";
import { after } from "next/server";
import webpush from "web-push";
import { getDb, schema } from "./db";
import type { Deal, Listing } from "./db/schema";
import { env } from "./env";
import { logEvent } from "./store";

export type Audience = "seller" | "buyer";
export type Message = { title: string; body: string };

let vapidReady: boolean | null = null;
function pushConfigured(): boolean {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  vapidReady = !!(pub && priv);
  if (vapidReady) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://avowly.vercel.app", pub!, priv!);
  return vapidReady;
}

function linkFor(audience: Audience, listing: Listing, deal: Deal | null): string {
  const base = env.appUrl();
  if (!deal) return `${base}/l/${listing.id}?k=${listing.sellerKey}`;
  return `${base}/d/${deal.id}?k=${audience === "seller" ? listing.sellerKey : deal.buyerKey}`;
}

async function sendPush(audience: Audience, listing: Listing, deal: Deal | null, msg: Message, url: string) {
  if (!pushConfigured()) return;
  const db = await getDb();
  const subs = await db
    .select()
    .from(schema.pushSubscriptions)
    .where(
      audience === "seller"
        ? and(eq(schema.pushSubscriptions.role, "seller"), eq(schema.pushSubscriptions.listingId, listing.id))
        : and(eq(schema.pushSubscriptions.role, "buyer"), eq(schema.pushSubscriptions.dealId, deal?.id ?? "")),
    );
  if (!subs.length) return;
  const gone: string[] = [];
  const statuses: number[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        const res = await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys },
          JSON.stringify({ title: msg.title, body: msg.body, url, tag: deal?.id ?? listing.id }),
          { TTL: 60 * 60 * 24 },
        );
        statuses.push(res.statusCode);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        statuses.push(status ?? 0);
        if (status === 404 || status === 410) gone.push(s.endpoint);
        else console.error("Push failed", status, err);
      }
    }),
  );
  if (gone.length) await db.delete(schema.pushSubscriptions).where(inArray(schema.pushSubscriptions.endpoint, gone));
  // Record what the push service answered, so "did they get told?" has an answer in the deal history.
  await logEvent({
    dealId: deal?.id ?? null,
    listingId: listing.id,
    type: "notify.push",
    payload: { audience, title: msg.title, devices: subs.length, accepted: statuses.filter((s) => s >= 200 && s < 300).length, statuses },
  });
}

/** Sent the moment notifications are turned on, so people find out now if their phone blocks them. */
export async function sendConfirmation(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, title: string): Promise<boolean> {
  if (!pushConfigured()) return false;
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title: "Notifications are on", body: `You'll get updates here about "${title}".`, url: env.appUrl(), tag: "confirm" }),
      { TTL: 60 * 10 },
    );
    return true;
  } catch (err) {
    console.error("Push confirmation failed", (err as { statusCode?: number }).statusCode, err);
    return false;
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Which email service is configured: Gmail (reaches anyone, no domain needed) or Resend. */
export function emailProvider(): "gmail" | "resend" | null {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return "gmail";
  if (process.env.RESEND_API_KEY) return "resend";
  return null;
}

function emailHtml(msg: Message, url: string) {
  return `<div style="font-family:system-ui,sans-serif;max-width:480px"><h2 style="margin:0 0 8px">${escapeHtml(msg.title)}</h2><p style="color:#363c4a">${escapeHtml(msg.body)}</p><p><a href="${url}" style="display:inline-block;background:#15131F;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none">Open in Avowly</a></p><p style="color:#6b7385;font-size:12px">Avowly: money moves only when the thing does. You get this because you asked for updates on this deal.</p></div>`;
}

export type EmailResult = { sent: boolean; provider: "gmail" | "resend" | null; error?: string };

/** Sends one email. Never throws; the result says what happened so callers can record it. */
export async function sendEmail(to: string, msg: Message, url: string): Promise<EmailResult> {
  const provider = emailProvider();
  if (!provider) return { sent: false, provider, error: "Email isn't set up on this server" };
  const text = `${msg.body}\n\nOpen in Avowly: ${url}`;
  try {
    if (provider === "gmail") {
      const { createTransport } = await import("nodemailer");
      const transport = createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
      await transport.sendMail({ from: `Avowly <${process.env.GMAIL_USER}>`, to, subject: msg.title, text, html: emailHtml(msg, url) });
      return { sent: true, provider };
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Avowly <onboarding@resend.dev>", to: [to], subject: msg.title, text, html: emailHtml(msg, url) }),
    });
    if (res.ok) return { sent: true, provider };
    const body = await res.text();
    console.error("Email failed", res.status, body);
    // Resend's test sender only reaches the account owner's own inbox until a domain is verified.
    const restricted = res.status === 403 && /own email|verify a domain/i.test(body);
    return { sent: false, provider, error: restricted ? "This server can only email its owner until a sending domain is verified" : `Email service answered ${res.status}` };
  } catch (err) {
    console.error("Email failed", err);
    // Gmail answers 535 when given the account password instead of an App Password.
    if ((err as { code?: string }).code === "EAUTH")
      return { sent: false, provider, error: "The email account rejected the server's login. It needs a Google App Password, not the normal password" };
    return { sent: false, provider, error: "The email service couldn't be reached" };
  }
}

async function emailParty(audience: Audience, listing: Listing, deal: Deal | null, msg: Message, url: string) {
  const to = audience === "seller" ? listing.notifyEmail : deal?.buyerEmail;
  // PayPal sandbox accounts use example.com addresses, which have no inbox.
  if (!to || !emailProvider() || /@([\w-]+\.)*example\.com$/i.test(to)) return;
  const result = await sendEmail(to, msg, url);
  // The address itself is never logged, only whether it went.
  await logEvent({ dealId: deal?.id ?? null, listingId: listing.id, type: "notify.email", payload: { audience, title: msg.title, sent: result.sent, provider: result.provider } });
}

export async function notify(audience: Audience, listing: Listing, deal: Deal | null, msg: Message) {
  const url = linkFor(audience, listing, deal);
  await Promise.allSettled([sendPush(audience, listing, deal, msg, url), emailParty(audience, listing, deal, msg, url)]).then((results) =>
    results.forEach((r) => r.status === "rejected" && console.error("Notify failed", r.reason)),
  );
}

/** Sends after the HTTP response, so a slow push service never delays a payment step. */
export function notifyLater(audience: Audience, listing: Listing, deal: Deal | null, msg: Message) {
  after(() => notify(audience, listing, deal, msg));
}
