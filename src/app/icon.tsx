import { ImageResponse } from "next/og";
import { BRAND_MARK } from "@/lib/brandMark";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** App icon (browser tab, notifications, Home Screen): the Avowly mark on paper. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#F7F6FB", borderRadius: 112 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_MARK} width={430} height={430} alt="" />
      </div>
    ),
    size,
  );
}
