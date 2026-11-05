/** Real activity counts for the home page. Only what the event log actually records; judge demos don't count. */
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "./db";

export type Stats = { verifiedListings: number; protectedDeals: number; wrongItemsStopped: number; heldCents: number };

export async function loadStats(): Promise<Stats> {
  const db = await getDb();
  const [verified] = await db
    .select({ n: count() })
    .from(schema.listings)
    .where(and(inArray(schema.listings.status, ["verified", "reserved", "closed"]), eq(schema.listings.demo, false)));
  const [deals] = await db
    .select({ n: count(), cents: sql<number>`coalesce(sum(${schema.deals.authorizedCents}), 0)` })
    .from(schema.deals)
    .innerJoin(schema.listings, eq(schema.listings.id, schema.deals.listingId))
    .where(and(sql`${schema.deals.authorizedAt} is not null`, eq(schema.listings.demo, false)));
  const [stopped] = await db
    .select({ n: count() })
    .from(schema.events)
    .innerJoin(schema.listings, eq(schema.listings.id, schema.events.listingId))
    .where(and(eq(schema.events.type, "handoff.mismatch"), eq(schema.listings.demo, false)));
  const [stoppedNoListing] = await db
    .select({ n: count() })
    .from(schema.events)
    .innerJoin(schema.deals, eq(schema.deals.id, schema.events.dealId))
    .innerJoin(schema.listings, eq(schema.listings.id, schema.deals.listingId))
    .where(and(eq(schema.events.type, "handoff.mismatch"), sql`${schema.events.listingId} is null`, eq(schema.listings.demo, false)));
  return {
    verifiedListings: Number(verified?.n ?? 0),
    protectedDeals: Number(deals?.n ?? 0),
    wrongItemsStopped: Number(stopped?.n ?? 0) + Number(stoppedNoListing?.n ?? 0),
    heldCents: Number(deals?.cents ?? 0),
  };
}
