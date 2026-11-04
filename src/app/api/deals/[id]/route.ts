import { handler, type RouteCtx } from "@/lib/http";
import { holdClock } from "@/lib/policy";
import { decisionView, timelinePayload } from "@/lib/sanitize";
import { dealEvents, getDeal, HttpError, photoIds, roleFor } from "@/lib/store";

/**
 * Live state of a deal for its two parties. Deal IDs appear on public proof pages, so the
 * ID alone grants nothing: a seller or buyer key is required.
 */
export const GET = handler(async (req: Request, { params }: RouteCtx) => {
  const { id } = await params;
  const key = new URL(req.url).searchParams.get("k");
  const { deal, listing } = await getDeal(id);
  const role = roleFor(deal, listing, key);
  if (!role) throw new HttpError(403, "This is a private deal link. Open it from your own deal or seller link.");

  const [events, handoff, pickup, ret] = await Promise.all([
    dealEvents(id),
    photoIds({ listingId: listing.id, dealId: id, stage: "handoff" }),
    photoIds({ listingId: listing.id, dealId: id, stage: "pickup" }),
    photoIds({ listingId: listing.id, dealId: id, stage: "return" }),
  ]);
  return {
    role,
    listing: {
      id: listing.id,
      mode: listing.mode,
      title: listing.title,
      sellerName: listing.sellerName,
      priceCents: listing.priceCents,
      depositCents: listing.depositCents,
      currency: listing.currency,
      hasAntiTheftLock: listing.fingerprint?.hasAntiTheftLock ?? false,
      distinctiveFeatures: listing.fingerprint?.distinctiveFeatures ?? [],
      identifierKinds: [...new Set(listing.fingerprint?.identifiers.map((i) => i.kind) ?? [])],
      accessories: listing.accessories,
    },
    deal: {
      id: deal.id,
      status: deal.status,
      authorizedCents: deal.authorizedCents,
      capturedCents: deal.capturedCents,
      feeCents: deal.feeCents,
      paidOutCents: deal.paidOutCents,
      authorizedAt: deal.authorizedAt,
      decision: decisionView(deal.decision),
      pickupInspection: deal.pickupInspection,
      clock: deal.authorizedAt ? holdClock(deal.authorizedAt) : null,
    },
    photos: { handoff, pickup, return: ret },
    events: events.map((e) => ({ type: e.type, at: e.createdAt, payload: timelinePayload(e.payload) })),
  };
});
