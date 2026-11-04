import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { ogCard, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Avowly scam check result";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const [row] = await db.select().from(schema.scamChecks).where(eq(schema.scamChecks.id, id));
  return ogCard({
    badge: row?.level === "high" ? "High risk" : row?.level === "caution" ? "Caution" : "Scam check",
    tone: row?.level === "high" ? "oxblood" : "brass",
    title: row?.headline ?? "Is this listing a scam?",
    line: row?.reasons[0] ?? "Check any marketplace listing for free.",
    footer: "Free scam check by Avowly",
    photoId: null,
  });
}
