import { eq } from "drizzle-orm";
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
      ? { word: "NOT VERIFIED", color: "#6F6A62" }
      : l.status === "verified"
        ? { word: "VERIFIED", color: "#1F6B4A" }
        : l.status === "reserved"
          ? { word: "ON HOLD", color: "#7A5532" }
          : { word: "SOLD", color: "#6F6A62" };
  const line = l && l.status === "verified" ? `${formatMoney(l.priceCents)} · pay into a PayPal hold` : "Protected handoffs with Avowly";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="72" viewBox="0 0 320 72" role="img" aria-label="Avowly: ${esc(state.word)}">
  <rect x="0.5" y="0.5" width="319" height="71" rx="10" fill="#FBF9F5" stroke="#E6E1D6"/>
  <g transform="translate(12 12) scale(0.75)">
    <path d="M9 55 L32 9 L55 55" stroke="#141413" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M24.5 38.5 L30.5 44.5 L39.5 33.5" stroke="#A67C52" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="72" y="31" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="12" font-weight="700" letter-spacing="1.6" fill="${state.color}">${esc(state.word)} WITH AVOWLY</text>
  <text x="72" y="52" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="14" fill="#141413">${esc(line)}</text>
</svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } });
}
