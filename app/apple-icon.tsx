import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const logoData = await readFile(
    join(process.cwd(), "public/post-pics/golden_red_light_eye.png")
  );
  const logoSrc = Uint8Array.from(logoData).buffer;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
        }}
      >
        {/* @ts-expect-error Satori accepts ArrayBuffer for <img src> at runtime */}
        <img src={logoSrc} width={160} height={160} alt="" />
      </div>
    ),
    { ...size }
  );
}
