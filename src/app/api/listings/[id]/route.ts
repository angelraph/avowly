import { handler, type RouteCtx } from "@/lib/http";
import { getListing, HttpError } from "@/lib/store";

/** A seller's own view of their listing's status (used by My deals). */
export const GET = handler(async (req: Request, { params }: RouteCtx) => {
  const { id } = await params;
  const key = new URL(req.url).searchParams.get("k");
  const listing = await getListing(id);
  if (key !== listing.sellerKey) throw new HttpError(403, "Not your listing");
  return { id: listing.id, title: listing.title, mode: listing.mode, status: listing.status, priceCents: listing.priceCents };
});
