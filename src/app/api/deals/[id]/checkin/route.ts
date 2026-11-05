import { z } from "zod";
import { checkinMatches } from "@/lib/checkin";
import { handler, type RouteCtx } from "@/lib/http";
import { notifyLater } from "@/lib/notify";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { dealEvents, getDeal, HttpError, logEvent, requireRole } from "@/lib/store";

const body = z.object({ key: z.string().min(10), code: z.string().min(1).max(20) });

/** The buyer scanned (or typed) the code on the seller's screen at the meetup. */
export const POST = handler(async (req: Request, { params }: RouteCtx) => {
  const { id } = await params;
  const parsed = body.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, "Enter the 6-digit code from the seller's screen");
  const { deal, listing } = await getDeal(id);
  requireRole(deal, listing, parsed.data.key, "buyer");
  if (listing.mode !== "sale" || listing.delivery !== "meetup") throw new HttpError(400, "Check-in is for in-person sales");
  if (deal.status !== "held") throw new HttpError(409, `Deal is ${deal.status}`);
  await rateLimit(`checkin:${id}:${clientIp(req)}`, 8, 3600);

  if (!checkinMatches(deal.id, listing.sellerKey, parsed.data.code)) {
    await logEvent({ dealId: id, type: "handoff.checkin_failed" });
    throw new HttpError(400, "That code doesn't match this seller. Ask them to open their Avowly deal and show you the code there.");
  }
  const already = (await dealEvents(id)).some((e) => e.type === "handoff.checkin");
  if (!already) {
    await logEvent({ dealId: id, type: "handoff.checkin" });
    notifyLater("seller", listing, deal, { title: "Buyer checked in", body: `The buyer confirmed it's you for "${listing.title}". Next they'll scan the item.` });
  }
  return { checkedIn: true };
});
