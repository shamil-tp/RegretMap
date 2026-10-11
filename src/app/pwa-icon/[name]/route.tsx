import { ImageResponse } from "next/og";

/*
 * PWA / home-screen icons generated from the RegretMap "RM" stamp (red with a
 * black ink border). Prerendered at build time — no image files to maintain.
 *
 *   /pwa-icon/192.png           standard icon
 *   /pwa-icon/512.png           standard icon
 *   /pwa-icon/maskable-512.png  full-bleed, content inside the 80% safe zone
 *   /pwa-icon/apple-180.png     iOS home screen
 */

const ICONS = {
  "192.png": { size: 192, maskable: false },
  "512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
  "apple-180.png": { size: 180, maskable: true },
} as const;

type IconName = keyof typeof ICONS;

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_request: Request, { params }: RouteContext<"/pwa-icon/[name]">) {
  const { name } = await params;
  const icon = ICONS[name as IconName];
  if (!icon) return new Response("Not found", { status: 404 });
  const { size, maskable } = icon;

  // Maskable icons fill the canvas; the stamp stays within the safe zone.
  const stamp = Math.round(size * (maskable ? 0.62 : 0.8));
  const border = Math.max(4, Math.round(size * 0.035));
  const shadow = Math.round(size * 0.04);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: maskable ? "#FFD600" : "transparent",
        }}
      >
        <div
          style={{
            width: stamp,
            height: stamp,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#FF3B30",
            border: `${border}px solid #000000`,
            borderRadius: Math.round(stamp * 0.22),
            boxShadow: `${shadow}px ${shadow}px 0 0 #000000`,
            color: "#FFFFFF",
            fontSize: Math.round(stamp * 0.42),
            fontWeight: 800,
            letterSpacing: -Math.round(stamp * 0.02),
          }}
        >
          RM
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=604800, immutable" },
    },
  );
}
