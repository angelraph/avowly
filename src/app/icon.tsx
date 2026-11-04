import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** App icon (browser tab, notifications, Home Screen): the Avowly mark on paper. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#F4F1EA", borderRadius: 112 }}>
        <svg width="400" height="400" viewBox="0 0 64 64" fill="none">
          <path d="M9 55 L32 9 L55 55" stroke="#141413" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24.5 38.5 L30.5 44.5 L39.5 33.5" stroke="#A67C52" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size,
  );
}
