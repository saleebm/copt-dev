import { ImageResponse } from "next/og";
import {
  loadOgAssets,
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
} from "@/lib/og-image-shared";
import { siteConfig } from "@/lib/site-config";

export const alt = siteConfig.ogImageAlt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const { logoSrc, fonts } = await loadOgAssets();
  return new ImageResponse(
    (
      <OgFrame
        eyebrow={siteConfig.name}
        footer="writing & work"
        logoSrc={logoSrc}
        title={siteConfig.description}
      />
    ),
    { ...size, fonts }
  );
}
