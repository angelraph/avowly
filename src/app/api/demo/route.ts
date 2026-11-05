import { getDb, schema } from "@/lib/db";
import { handler } from "@/lib/http";
import { newPossessionCode } from "@/lib/policy";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { HttpError, logEvent, newId, newKey } from "@/lib/store";

/** Documentation example IMEIs (valid check digits, no real phone). Matches public/demo/imei-right.png. */
const DEMO_IMEIS = ["490154203237518", "490154203237526"];

/**
 * Creates a judge demo: a sample phone listing that is already verified, so anyone can run a
 * full protected sale in the PayPal sandbox without an item or a second person. Payment,
 * AI checks, capture and payout are all real; only the seller's listing photos are skipped.
 * Demo listings never appear in search, agent results or the home page numbers.
 */
export const POST = handler(async (req: Request) => {
  await rateLimit(`demo:ip:${clientIp(req)}`, 10, 3600);
  // Strip invisible characters (e.g. a byte-order mark from a Windows shell) that PayPal rejects as an invalid receiver.
  const sellerEmail = process.env.SANDBOX_SELLER_EMAIL?.replace(/[﻿​\s]/g, "");
  if (!sellerEmail) throw new HttpError(503, "Demo mode isn't set up on this server");

  const id = newId();
  const sellerKey = newKey();
  const now = new Date();
  const db = await getDb();
  await db.insert(schema.listings).values({
    id,
    mode: "sale",
    title: "Demo Phone X (sample)",
    description: "A judge demo. The seller's possession check is pre-filled with a sample phone; everything after this is real: the PayPal hold, the AI scan at the handoff, capture and payout.",
    priceCents: 12000,
    location: "Demo",
    sellerName: "Demo seller",
    sellerPaypalEmail: sellerEmail,
    sellerKey,
    possessionCode: newPossessionCode(),
    status: "verified",
    demo: true,
    verifiedAt: now,
    verification: { demo: true },
    fingerprint: {
      category: "phone",
      make: "Demo",
      model: "Phone X",
      identifiers: DEMO_IMEIS.map((value) => ({ kind: "IMEI", value })),
      distinctiveFeatures: [],
      hasAntiTheftLock: true,
      batteryHealthPercent: null,
      conditionNotes: [],
      readAt: now.toISOString(),
    },
  });
  await logEvent({ listingId: id, type: "listing.created", payload: { demo: true } });
  return { listingId: id, sellerKey };
});
