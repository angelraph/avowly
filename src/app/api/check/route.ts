import { getDb, schema } from "@/lib/db";
import { handler } from "@/lib/http";
import { parseDollarsToCents } from "@/lib/money";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { runScamCheck } from "@/lib/scamcheck";
import { HttpError, newId } from "@/lib/store";

export const maxDuration = 60;

/**
 * The free scam check. The pasted text and screenshots are only sent for analysis and are
 * never stored; only the verdict is kept, so the result can be shared.
 */
export const POST = handler(async (req: Request) => {
  await rateLimit(`check:ip:${clientIp(req)}`, 12, 3600);
  const form = await req.formData();
  const text = String(form.get("text") ?? "").trim().slice(0, 6000);
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 4);
  if (!text && files.length === 0) throw new HttpError(400, "Paste the listing or add a screenshot");
  if (text && text.length < 15 && files.length === 0) throw new HttpError(400, "Paste a little more of the listing or messages");

  const images = [];
  for (const f of files) {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw new HttpError(400, `Unsupported image type ${f.type}`);
    if (f.size > 4 * 1024 * 1024) throw new HttpError(400, "Each screenshot must be under 4 MB");
    images.push({ mime: f.type, data: new Uint8Array(await f.arrayBuffer()) });
  }

  const priceText = String(form.get("price") ?? "").trim();
  let askingCents: number | null = null;
  if (priceText) {
    try {
      askingCents = parseDollarsToCents(priceText);
    } catch {
      throw new HttpError(400, "Enter the asking price as a number, like 250");
    }
  }

  const result = await runScamCheck({ text, images, askingCents });
  const id = newId();
  const db = await getDb();
  await db.insert(schema.scamChecks).values({
    id,
    level: result.level,
    score: result.score,
    headline: result.headline,
    reasons: result.reasons,
    product: result.product,
    priceMessage: result.price && result.price.level !== "unknown" ? result.price.message : null,
  });
  return { id };
});
