/**
 * Meetup check-in. The seller's phone shows a QR code (and the same 6-digit code). The code is
 * derived from the deal and the seller's private key, so only the person holding the seller's
 * link can show it: when the buyer scans it, they know they're meeting the real seller.
 * Nothing is stored; the code can always be recomputed.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";

export function checkinCode(dealId: string, sellerKey: string): string {
  const mac = createHmac("sha256", sellerKey).update(`checkin:${dealId}`).digest();
  return String(mac.readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

export function checkinMatches(dealId: string, sellerKey: string, given: string): boolean {
  const want = Buffer.from(checkinCode(dealId, sellerKey));
  const got = Buffer.from(given.replace(/\D/g, "").slice(0, 6).padStart(6, "x"));
  return got.length === want.length && timingSafeEqual(got, want);
}

export function checkinUrl(base: string, dealId: string, code: string): string {
  return `${base}/d/${dealId}?checkin=${code}`;
}

/** The QR as an inline SVG string, so the seller's page needs no extra request. */
export async function checkinQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#15131F", light: "#ffffff" } });
}
