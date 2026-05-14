import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactElement } from "react";
import { siteConfig } from "@/lib/site-config";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png" as const;

const LOGO_REL_PATH = "public/post-pics/golden_red_light_eye.png";

let logoPromise: Promise<Buffer> | null = null;
function getLogoBuffer(): Promise<Buffer> {
  if (!logoPromise) {
    logoPromise = readFile(join(process.cwd(), LOGO_REL_PATH));
  }
  return logoPromise;
}

let fontPromise: Promise<ArrayBuffer> | null = null;
async function loadFont(): Promise<ArrayBuffer> {
  // Older WebKit UA → Google Fonts returns WOFF (Satori supports TTF/OTF/WOFF, not WOFF2).
  const cssRes = await fetch(
    "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    }
  );
  const css = await cssRes.text();
  const matches = Array.from(
    css.matchAll(
      /src:\s*url\((https:\/\/[^)]+)\)\s*format\('(woff2?|truetype|opentype)'\)/g
    )
  );
  // Prefer non-WOFF2 since Satori can't decode WOFF2. Fall back to the last match.
  const decodable = matches.filter((m) => m[2] !== "woff2");
  const chosen = decodable[decodable.length - 1] ?? matches[matches.length - 1];
  if (!chosen) {
    throw new Error("Could not parse a font URL from Google Fonts CSS");
  }
  const fontRes = await fetch(chosen[1]);
  return fontRes.arrayBuffer();
}

function getFontBuffer(): Promise<ArrayBuffer> {
  if (!fontPromise) {
    fontPromise = loadFont();
  }
  return fontPromise;
}

// Satori (next/og) accepts ArrayBuffer/typed-array for <img src> at runtime,
// but React's <img> types only allow string. The cast is the documented escape
// hatch — both `next build` and `tsc --noEmit` agree once the directive is gone.
export async function loadOgAssets() {
  const [logo, font] = await Promise.all([getLogoBuffer(), getFontBuffer()]);
  return {
    logoSrc: Uint8Array.from(logo).buffer as unknown as string,
    fonts: [
      {
        name: "Space Grotesk",
        data: font,
        style: "normal" as const,
        weight: 700 as const,
      },
    ],
  };
}

interface OgFrameProps {
  eyebrow?: string;
  footer?: string;
  logoSrc: string;
  title: string;
}

export function OgFrame({
  title,
  eyebrow,
  footer,
  logoSrc,
}: OgFrameProps): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        background:
          "radial-gradient(circle at 20% 30%, #1a0606 0%, #000000 60%)",
        color: "#f5f5f5",
        fontFamily: "Space Grotesk",
        padding: 72,
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 360,
          height: 360,
          marginRight: 72,
          flexShrink: 0,
        }}
      >
        <img
          alt={siteConfig.ogImageAlt}
          height={360}
          src={logoSrc}
          width={360}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
        }}
      >
        {eyebrow ? (
          <div
            style={{
              fontSize: 28,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#ef4444",
              marginBottom: 24,
            }}
          >
            {eyebrow}
          </div>
        ) : null}

        <div
          style={{
            fontSize: title.length > 60 ? 56 : 72,
            lineHeight: 1.05,
            fontWeight: 700,
            color: "#fafafa",
            display: "flex",
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 24,
            color: "#a3a3a3",
            paddingTop: 48,
          }}
        >
          <span style={{ display: "flex" }}>{siteConfig.name}</span>
          {footer ? <span style={{ display: "flex" }}>{footer}</span> : null}
        </div>
      </div>
    </div>
  );
}
