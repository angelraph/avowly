import { ImageResponse } from "next/og";
import { loadPhotos } from "./store";

export const OG_SIZE = { width: 1200, height: 630 };

async function photoDataUrl(photoId: string | null): Promise<string | null> {
  if (!photoId) return null;
  const [photo] = await loadPhotos([photoId]);
  if (!photo || !/jpeg|png/.test(photo.mime)) return null;
  return `data:${photo.mime};base64,${Buffer.from(photo.data).toString("base64")}`;
}

/** The preview card shown when a Clasp link is pasted into WhatsApp, Facebook, X, iMessage. */
export async function ogCard(input: {
  badge: string;
  title: string;
  line: string;
  footer: string;
  photoId: string | null;
  tone?: "brass" | "oxblood" | "green";
}) {
  const photo = await photoDataUrl(input.photoId);
  const color = input.tone === "oxblood" ? "#8F2D2A" : input.tone === "green" ? "#1F6B4A" : "#7A5532";
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#F4F1EA", color: "#141413", fontFamily: "sans-serif" }}>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" width={480} height={630} style={{ objectFit: "cover", width: 480, height: 630 }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
              <path d="M50 17.5 L32 7.5 L12.5 18.5 L12.5 45.5 L32 56.5 L50 46.5" stroke="#A67C52" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M26.5 20 H37.5 Q40 20 40 22.5 V37.6 L32 42.6 L24 37.6 V22.5 Q24 20 26.5 20 Z" fill="#141413" />
              <path d="M27.6 31.2 L30.9 34.4 L36.6 28.2" stroke="#D9B98F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ fontSize: 38, fontWeight: 700 }}>Clasp</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color }}>{input.badge}</div>
            <div style={{ fontSize: photo ? 50 : 62, fontWeight: 700, lineHeight: 1.1 }}>{input.title.slice(0, 70)}</div>
            <div style={{ fontSize: 30, color: "#6F6A62", lineHeight: 1.3 }}>{input.line}</div>
          </div>
          <div style={{ fontSize: 24, color: "#6F6A62" }}>{input.footer}</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
