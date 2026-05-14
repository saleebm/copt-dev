import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const logoData = await readFile(
    join(process.cwd(), "public/post-pics/golden_red_light_eye.png")
  );
  // Satori accepts ArrayBuffer for <img src> at runtime; React types do not.
  const logoSrc = Uint8Array.from(logoData).buffer as unknown as string;
  return new ImageResponse(
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
      <img alt="" height={32} src={logoSrc} width={32} />
    </div>,
    { ...size }
  );
}
