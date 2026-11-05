import { z } from "zod";
import { handler, type RouteCtx } from "@/lib/http";
import { notifyLater } from "@/lib/notify";
import { getDeal, HttpError, logEvent, requireRole, updateDeal } from "@/lib/store";

const body = z.object({
  key: z.string().min(10),
  carrier: z.string().trim().min(2, "Add the carrier, e.g. DHL or USPS").max(40),
  tracking: z.string().trim().min(4, "Add the tracking number").max(60).regex(/^[A-Za-z0-9 -]+$/, "Tracking numbers use letters, numbers and dashes"),
});

/** Shipped sale: the seller records carrier and tracking. The money stays held until the buyer scans it on arrival. */
export const POST = handler(async (req: Request, { params }: RouteCtx) => {
  const { id } = await params;
  const parsed = body.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, [...new Set(parsed.error.issues.map((i) => i.message))].join("; "));
  const { deal, listing } = await getDeal(id);
  requireRole(deal, listing, parsed.data.key, "seller");
  if (listing.mode !== "sale" || listing.delivery !== "shipping") throw new HttpError(400, "This sale is a meetup, not shipped");
  if (deal.status !== "held") throw new HttpError(409, `Deal is ${deal.status}`);

  const shipping = { carrier: parsed.data.carrier, tracking: parsed.data.tracking.toUpperCase(), at: new Date().toISOString() };
  await updateDeal(id, { shipping });
  await logEvent({ dealId: id, type: "deal.shipped", payload: { carrier: shipping.carrier, tracking: shipping.tracking } });
  notifyLater("buyer", listing, deal, {
    title: "Your item is on its way",
    body: `"${listing.title}" shipped with ${shipping.carrier}, tracking ${shipping.tracking}. When it arrives, scan it in Avowly before you release the payment.`,
  });
  return { shipping };
});
