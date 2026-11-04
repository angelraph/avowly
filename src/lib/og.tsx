import { ImageResponse } from "next/og";
import { loadPhotos } from "./store";

export const OG_SIZE = { width: 1200, height: 630 };

async function photoDataUrl(photoId: string | null): Promise<string | null> {
  if (!photoId) return null;
  const [photo] = await loadPhotos([photoId]);
  if (!photo || !/jpeg|png/.test(photo.mime)) return null;
  return `data:${photo.mime};base64,${Buffer.from(photo.data).toString("base64")}`;
}

/** The preview card shown when an Avowly link is pasted into WhatsApp, Facebook, X, iMessage. */
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
              <path d="M9 55 L32 9 L55 55" stroke="#141413" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M24.5 38.5 L30.5 44.5 L39.5 33.5" stroke="#A67C52" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ fontSize: 38, fontWeight: 700 }}>Avowly</div>
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
