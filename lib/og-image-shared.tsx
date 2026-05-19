import { readFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";
import type { ReactElement } from "react";
import { siteConfig } from "@/lib/site-config";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png" as const;

const LOGO_REL_PATH = "public/post-pics/golden_red_light_eye.png";
const PUBLIC_DIR = join(process.cwd(), "public");

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
  const chosen = decodable.at(-1) ?? matches.at(-1);
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

// Loads an image from /public for embedding in an OG card.
// Returns null if the path escapes /public or the file is missing,
// so callers can fall back to the logo-only frame.
export async function loadOgPublicImage(
  publicPath: string
): Promise<string | null> {
  // Strip query string + leading slash, then resolve under public/ and confirm
  // the resolved path is still inside public/ (defense against path traversal).
  const cleaned = publicPath.split("?")[0].split("#")[0].replace(/^\/+/, "");
  const resolved = normalize(join(PUBLIC_DIR, cleaned));
  if (!(resolved === PUBLIC_DIR || resolved.startsWith(PUBLIC_DIR + sep))) {
    return null;
  }
  try {
    const buf = await readFile(resolved);
    return Uint8Array.from(buf).buffer as unknown as string;
  } catch {
    return null;
  }
}

// Extracts the first markdown image from a post's content.
// SIGHT posts embed their hero image as the first `![alt](src)` line.
export function extractFirstMarkdownImage(
  content: string
): { alt: string; src: string } | null {
  const match = content.match(/!\[([^\]]*)\]\(([^)\s]+)/);
  if (!match) {
    return null;
  }
  return { alt: match[1], src: match[2] };
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
        {/* biome-ignore lint/performance/noImgElement: ImageResponse runs Satori, which only renders native <img>, not next/image */}
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

interface OgSightFrameProps {
  alt: string;
  eyebrow?: string;
  footer?: string;
  imageSrc: string;
  title: string;
}

// Full-bleed image card for SIGHT posts: the sight's own photo fills the
// 1200×630 canvas with a darkened bottom strip carrying the eyebrow, title,
// brand mark, and date.
export function OgSightFrame({
  title,
  alt,
  eyebrow,
  footer,
  imageSrc,
}: OgSightFrameProps): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#000000",
        color: "#f5f5f5",
        fontFamily: "Space Grotesk",
        position: "relative",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: ImageResponse runs Satori, which only renders native <img>, not next/image */}
      <img
        alt={alt}
        height={OG_SIZE.height}
        src={imageSrc}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          position: "absolute",
          top: 0,
          left: 0,
        }}
        width={OG_SIZE.width}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          padding: "56px 64px 48px",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.95) 100%)",
        }}
      >
        {eyebrow ? (
          <div
            style={{
              fontSize: 24,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#ef4444",
              marginBottom: 16,
              display: "flex",
            }}
          >
            {eyebrow}
          </div>
        ) : null}

        <div
          style={{
            fontSize: title.length > 60 ? 48 : 60,
            lineHeight: 1.05,
            fontWeight: 700,
            color: "#fafafa",
            display: "flex",
            textShadow: "0 2px 24px rgba(0,0,0,0.6)",
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#d4d4d4",
          }}
        >
          <span style={{ display: "flex" }}>{siteConfig.name}</span>
          {footer ? <span style={{ display: "flex" }}>{footer}</span> : null}
        </div>
      </div>
    </div>
  );
}
