/**
 * Log in with PayPal for sellers. The seller signs in on PayPal's own page; Avowly receives a
 * one-time code, swaps it for the account's verified email, name and verification status, and
 * shows "PayPal verified seller". Payouts then go to that PayPal account. Avowly never sees the
 * seller's PayPal password.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

// "profile" is refused by PayPal for this app ("invalid scope"); email and verification status are enough.
const SCOPES = "openid email https://uri.paypal.com/services/paypalattributes";

export function redirectUri(): string {
  return `${env.appUrl()}/api/paypal/callback`;
}

/** Ties PayPal's redirect back to one listing and its seller, without putting the seller key in the URL. */
export function stateFor(listingId: string, sellerKey: string): string {
  const mac = createHmac("sha256", sellerKey).update(`paypal-login:${listingId}`).digest("base64url").slice(0, 24);
  return `${listingId}.${mac}`;
}

export function checkState(state: string, sellerKey: string): boolean {
  const listingId = state.split(".")[0] ?? "";
  const want = Buffer.from(stateFor(listingId, sellerKey));
  const got = Buffer.from(state);
  return want.length === got.length && timingSafeEqual(want, got);
}

export function authorizeUrl(state: string): string {
  const web = env.paypalApiBase().includes("sandbox") ? "https://www.sandbox.paypal.com" : "https://www.paypal.com";
  const q = new URLSearchParams({
    flowEntry: "static",
    client_id: env.paypalClientId(),
    response_type: "code",
    scope: SCOPES,
    redirect_uri: redirectUri(),
    state,
  });
  return `${web}/connect?${q}`;
}

export type PayPalUser = { email: string; verifiedAccount: boolean | null; name: string | null };

/** Swaps the one-time code for the signed-in account's verified details. */
export async function userFromCode(code: string): Promise<PayPalUser> {
  const basic = Buffer.from(`${env.paypalClientId()}:${env.paypalClientSecret()}`).toString("base64");
  const tokenRes = await fetch(`${env.paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code }),
  });
  const token = (await tokenRes.json()) as { access_token?: string; error_description?: string };
  if (!tokenRes.ok || !token.access_token) throw new Error(`PayPal login failed: ${token.error_description ?? tokenRes.status}`);

  const infoRes = await fetch(`${env.paypalApiBase()}/v1/identity/openidconnect/userinfo?schema=openid`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const info = (await infoRes.json()) as {
    email?: string;
    emails?: { value: string; primary?: boolean; confirmed?: boolean }[];
    name?: string;
    verified_account?: string | boolean;
  };
  if (!infoRes.ok) throw new Error(`PayPal user info failed: ${infoRes.status}`);
  const email = info.email ?? info.emails?.find((e) => e.primary)?.value ?? info.emails?.[0]?.value;
  if (!email) throw new Error("PayPal didn't share an email for this account");
  const v = info.verified_account;
  return { email: email.toLowerCase(), verifiedAccount: v === undefined ? null : v === true || v === "true", name: info.name ?? null };
}
