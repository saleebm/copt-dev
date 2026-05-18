import { AsciiArtWrapper } from "@/components/ascii-art-wrapper";
import { FACE_ASCII } from "@/lib/assets/face-ascii";

interface FaceAsciiProps {
  className?: string;
  height?: string | number;
  hero?: boolean;
  size?: "default" | "lg";
}

export function FaceAscii({ className, height, hero, size }: FaceAsciiProps) {
  return (
    <AsciiArtWrapper
      asciiArt={FACE_ASCII}
      className={className}
      height={height}
      hero={hero}
      size={size}
    />
  );
}
