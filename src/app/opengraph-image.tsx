import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/*
 * Site-wide social preview (Open Graph and Twitter), in the neo-brutalist
 * brand style of the "RM" stamp icon. Prerendered at build time.
 */

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#F7F6F2",
          borderBottom: "24px solid #FFD600",
          color: "#111111",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div
            style={{
              width: 120,
              height: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#FF3B30",
              border: "6px solid #000000",
              borderRadius: 26,
              boxShadow: "8px 8px 0 0 #000000",
              color: "#FFFFFF",
              fontSize: 52,
              fontWeight: 800,
            }}
          >
            RM
          </div>
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -3 }}>{SITE_NAME}</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 60, fontWeight: 800, letterSpacing: -2 }}>{SITE_TAGLINE}</div>
        <div style={{ marginTop: 20, fontSize: 32, color: "#555555", maxWidth: 1000, lineHeight: 1.35 }}>
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    size,
  );
}
