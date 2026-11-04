import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** App icon (browser tab, notifications, Home Screen): the brass latch on paper. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#F4F1EA", borderRadius: 112 }}>
        <svg width="400" height="400" viewBox="0 0 64 64" fill="none">
          <path d="M50 17.5 L32 7.5 L12.5 18.5 L12.5 45.5 L32 56.5 L50 46.5" stroke="#A67C52" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M26.5 20 H37.5 Q40 20 40 22.5 V37.6 L32 42.6 L24 37.6 V22.5 Q24 20 26.5 20 Z" fill="#141413" />
          <path d="M27.6 31.2 L30.9 34.4 L36.6 28.2" stroke="#D9B98F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size,
  );
}
