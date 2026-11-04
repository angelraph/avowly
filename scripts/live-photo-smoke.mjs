// Confirms the photo pipeline (privacy check, pixelation, AI reading) runs on the deployed site.
// Uploads a plain generated image: the listing must come back "not verified", not crash.
import sharp from "sharp";

const U = process.argv[2] ?? "https://avowly.vercel.app";
const created = await fetch(`${U}/api/listings`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ mode: "sale", title: "Photo pipeline smoke test", location: "Test", priceCents: 1000, sellerName: "Test", sellerPaypalEmail: "test@example.com" }),
});
const listing = await created.json();
if (!created.ok) throw new Error(`create failed: ${JSON.stringify(listing)}`);

const jpeg = await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 200, g: 190, b: 170 } } }).jpeg().toBuffer();
const form = new FormData();
form.set("key", listing.sellerKey);
form.append("photos", new Blob([jpeg], { type: "image/jpeg" }), "plain.jpg");
const started = Date.now();
const res = await fetch(`${U}/api/listings/${listing.id}/verify`, { method: "POST", body: form });
const body = await res.json();
console.log(`verify: ${res.status} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log(res.ok ? `verified: ${body.verdict.verified} | reasons: ${body.verdict.reasons.join(" ")}` : `error: ${body.error}`);
