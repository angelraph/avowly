import { createHash } from "node:crypto";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { handler } from "@/lib/http";
import { sendConfirmation } from "@/lib/notify";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { getDeal, getListing, HttpError, roleFor } from "@/lib/store";

const body = z.object({
  key: z.string().min(10),
  listingId: z.string().optional(),
  dealId: z.string().optional(),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string().min(10), auth: z.string().min(4) }),
  }),
});

export const GET = handler(async () => ({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null }));

/**
 * Subscribes this browser to updates. The key proves the role: a seller key follows
 * every deal on the listing, a buyer key follows only their deal.
 */
export const POST = handler(async (req: Request) => {
  const parsed = body.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, "Invalid subscription");
  const { key, listingId, dealId, subscription } = parsed.data;
  await rateLimit(`push:ip:${clientIp(req)}`, 30, 3600);

  let role: "seller" | "buyer";
  let resolvedListingId: string;
  let resolvedDealId: string | null = null;
  let title: string;
  if (dealId) {
    const { deal, listing } = await getDeal(dealId);
    const r = roleFor(deal, listing, key);
    if (!r) throw new HttpError(403, "Not a party to this deal");
    role = r;
    resolvedListingId = listing.id;
    resolvedDealId = r === "buyer" ? deal.id : null;
    title = listing.title;
  } else if (listingId) {
    const listing = await getListing(listingId);
    if (key !== listing.sellerKey) throw new HttpError(403, "Only the seller can follow this listing");
    role = "seller";
    resolvedListingId = listing.id;
    title = listing.title;
  } else {
    throw new HttpError(400, "listingId or dealId is required");
  }

  const db = await getDb();
  // One row per device per thing it follows, so a second deal doesn't silence the first.
  const id = createHash("sha256").update([subscription.endpoint, role, resolvedListingId, resolvedDealId ?? ""].join("|")).digest("hex");
  await db
    .insert(schema.pushSubscriptions)
    .values({ id, endpoint: subscription.endpoint, keys: subscription.keys, role, listingId: resolvedListingId, dealId: resolvedDealId })
    .onConflictDoUpdate({ target: schema.pushSubscriptions.id, set: { keys: subscription.keys } });
  const delivered = await sendConfirmation(subscription, title);
  return { subscribed: true, role, delivered };
});
