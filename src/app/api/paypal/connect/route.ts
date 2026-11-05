import { NextResponse } from "next/server";
import { authorizeUrl, stateFor } from "@/lib/paypalIdentity";
import { getListing } from "@/lib/store";

/** Seller taps "Verify with PayPal": send them to PayPal's own login page. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const listingId = url.searchParams.get("l") ?? "";
  const key = url.searchParams.get("k") ?? "";
  const listing = await getListing(listingId).catch(() => null);
  if (!listing || key !== listing.sellerKey) return NextResponse.json({ error: "Only the seller can verify this listing" }, { status: 403 });
  return NextResponse.redirect(authorizeUrl(stateFor(listing.id, listing.sellerKey)));
}
