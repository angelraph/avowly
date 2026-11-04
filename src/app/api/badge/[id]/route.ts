import { eq } from "drizzle-orm";
import { BRAND_MARK } from "@/lib/brandMark";
import { getDb, schema } from "@/lib/db";
import type { RouteCtx } from "@/lib/http";
import { formatMoney } from "@/lib/money";

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/**
 * A live "Verified with Avowly" badge any marketplace post or website can embed. It reads the
 * listing's real status, so a sold or unverified item can't keep showing as available.
 */
export async function GET(_req: Request, { params }: RouteCtx) {
  const { id } = await params;
  const db = await getDb();
  const [l] = await db
    .select({ status: schema.listings.status, priceCents: schema.listings.priceCents })
    .from(schema.listings)
    .where(eq(schema.listings.id, id));

  const state =
    !l || l.status === "draft"
      ? { word: "NOT VERIFIED", color: "#68657A" }
      : l.status === "verified"
        ? { word: "VERIFIED", color: "#1F6B4A" }
        : l.status === "reserved"
          ? { word: "ON HOLD", color: "#4F25C9" }
          : { word: "SOLD", color: "#68657A" };
  const line = l && l.status === "verified" ? `${formatMoney(l.priceCents)} · pay into a PayPal hold` : "Protected handoffs with Avowly";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="72" viewBox="0 0 320 72" role="img" aria-label="Avowly: ${esc(state.word)}">
  <rect x="0.5" y="0.5" width="319" height="71" rx="10" fill="#FFFFFF" stroke="#E7E5F0"/>
  <image x="12" y="12" width="48" height="48" href="${BRAND_MARK}"/>
  <text x="72" y="31" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="12" font-weight="700" letter-spacing="1.6" fill="${state.color}">${esc(state.word)} WITH AVOWLY</text>
  <text x="72" y="52" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="14" fill="#15131F">${esc(line)}</text>
</svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } });
}
