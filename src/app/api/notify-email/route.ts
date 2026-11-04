import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { handler } from "@/lib/http";
import { emailProvider, sendEmail } from "@/lib/notify";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { getDeal, getListing, HttpError, logEvent, roleFor } from "@/lib/store";

const body = z.object({
  key: z.string().min(10),
  dealId: z.string().optional(),
  listingId: z.string().optional(),
  email: z.string().trim().toLowerCase().email("That doesn't look like an email address").max(200),
});

/** Whether this server can send email, so the page only offers what works. */
export const GET = handler(async () => ({ enabled: emailProvider() !== null }));

/**
 * Sets where a party's deal updates are emailed and sends a test right away. The key proves
 * the role: a seller key sets the listing's address, a buyer key sets that deal's buyer address.
 */
export const POST = handler(async (req: Request) => {
  const parsed = body.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, [...new Set(parsed.error.issues.map((i) => i.message))].join("; "));
  const { key, dealId, listingId, email } = parsed.data;
  await rateLimit(`notify-email:ip:${clientIp(req)}`, 10, 3600);
  if (!emailProvider()) throw new HttpError(503, "Email isn't set up on this server yet");

  const db = await getDb();
  let role: "seller" | "buyer";
  let title: string;
  let link: string;
  let logDealId: string | null = null;
  let logListingId: string;
  if (dealId) {
    const { deal, listing } = await getDeal(dealId);
    const r = roleFor(deal, listing, key);
    if (!r) throw new HttpError(403, "Not a party to this deal");
    role = r;
    title = listing.title;
    link = `${env.appUrl()}/d/${deal.id}?k=${key}`;
    logDealId = deal.id;
    logListingId = listing.id;
    if (r === "buyer") await db.update(schema.deals).set({ buyerEmail: email }).where(eq(schema.deals.id, deal.id));
    else await db.update(schema.listings).set({ notifyEmail: email }).where(eq(schema.listings.id, listing.id));
  } else if (listingId) {
    const listing = await getListing(listingId);
    if (key !== listing.sellerKey) throw new HttpError(403, "Only the seller can set this");
    role = "seller";
    title = listing.title;
    link = `${env.appUrl()}/l/${listing.id}?k=${key}`;
    logListingId = listing.id;
    await db.update(schema.listings).set({ notifyEmail: email }).where(eq(schema.listings.id, listing.id));
  } else {
    throw new HttpError(400, "listingId or dealId is required");
  }

  const result = await sendEmail(
    email,
    { title: "Avowly updates are on", body: `You'll get an email here each time money moves on "${title}": when it's held, checked, paid or returned.` },
    link,
  );
  await logEvent({ dealId: logDealId, listingId: logListingId, type: "notify.email_set", payload: { audience: role, sent: result.sent, provider: result.provider } });
  return { saved: true, role, sent: result.sent, error: result.error ?? null };
});
