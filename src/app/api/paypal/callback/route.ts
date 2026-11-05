import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { checkState, userFromCode } from "@/lib/paypalIdentity";
import { getListing, logEvent, updateListing } from "@/lib/store";

/** PayPal sends the seller back here after they log in (or cancel). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  const listing = await getListing(state.split(".")[0] ?? "").catch(() => null);
  if (!listing || !checkState(state, listing.sellerKey)) return NextResponse.json({ error: "This PayPal login link isn't valid" }, { status: 400 });
  const back = (result: "ok" | "error") => NextResponse.redirect(`${env.appUrl()}/l/${listing.id}?k=${encodeURIComponent(listing.sellerKey)}&paypal=${result}`);
  if (!code) return back("error");

  try {
    const user = await userFromCode(code);
    const paypalIdentity = { ...user, at: new Date().toISOString() };
    // Payouts follow the account the seller proved they own.
    await updateListing(listing.id, { paypalIdentity, sellerPaypalEmail: user.email });
    await logEvent({ listingId: listing.id, type: "listing.paypal_verified", payload: { verifiedAccount: user.verifiedAccount } });
    return back("ok");
  } catch (err) {
    console.error("PayPal login failed", err);
    await logEvent({ listingId: listing.id, type: "listing.paypal_verify_failed" });
    return back("error");
  }
}
