import { Suspense } from "react";
import AsciiArtRenderer from "./ascii-art-renderer";

interface AsciiArtWrapperProps {
  asciiArt?: string;
  className?: string;
  height?: string | number;
  hero?: boolean;
  src?: string;
}

/**
 * Simple server wrapper component for AsciiArtRenderer that provides a stable container.
 * Pre-calculates ASCII art metadata on the server to improve initial sizing.
 */
export function AsciiArtWrapper({
  asciiArt,
  src,
  className = "",
  height,
  hero = false,
}: AsciiArtWrapperProps) {
  if (!(asciiArt || src)) {
    return null;
  }

  // When src is provided without asciiArt, render with src and let the client fetch it
  if (!asciiArt && src) {
    const heroContainerStyle = hero
      ? { height: "auto" as const, minHeight: "45vh" }
      : { height: "auto" as const, minHeight: "200px" };

    return (
      <div
        className="flex w-full min-w-0 items-center justify-center overflow-hidden"
        style={heroContainerStyle}
      >
        <Suspense
          fallback={
            <div
              className="flex w-full items-center justify-center text-muted-foreground text-sm"
              style={{ height: "128px" }}
            >
              Loading ASCII art...
            </div>
          }
        >
          <AsciiArtRenderer
            asciiArt=""
            asciiCategory="extremely-large"
            className={className}
            estimatedHeight={400}
            fontSizeEstimates={{ mobile: 0.06, tablet: 0.12, desktop: 0.2 }}
            hero={hero}
            lineCount={77}
            maxLineLength={170}
            src={src}
          />
        </Suspense>
      </div>
    );
  }

  // At this point asciiArt is guaranteed to be defined (early returns handle undefined cases)
  const resolvedAsciiArt = asciiArt as string;

  // Pre-calculate ASCII art metadata on the server
  const lines = resolvedAsciiArt.split("\n");
  const lineCount = lines.length;
  const maxLineLength = Math.max(...lines.map((line) => line.length));

  // Determine ASCII art category for better initial sizing
  const getAsciiCategory = () => {
    if (maxLineLength > 120 || lineCount > 40) {
      return "extremely-large";
    }
    if (maxLineLength > 60 || lineCount > 20) {
      return "large";
    }
    return "normal";
  };

  const asciiCategory = getAsciiCategory();

  // Calculate conservative initial font size estimates for different screen sizes
  const getInitialFontSizeEstimates = () => {
    // Target font sizes based on your requirements
    const targetMobile = 0.08; // Under 420px
    const targetTablet = 0.15; // 420px - 768px
    const targetDesktop = 0.3; // Over 768px

    // Conservative character width ratio
    const charWidthRatio = maxLineLength > 120 ? 0.52 : 0.62;

    // Estimate for different screen sizes with your target values
    const mobileWidth = 350;
    const tabletWidth = 600;
    const desktopWidth = 700; // Conservative desktop estimate accounting for sidebar

    const maxSizeConfig: Record<
      string,
      { mobile: number; tablet: number; desktop: number }
    > = {
      "extremely-large": { mobile: 0.12, tablet: 0.2, desktop: 0.3 },
      large: { mobile: 0.15, tablet: 0.25, desktop: 0.4 },
      default: { mobile: 0.2, tablet: 0.3, desktop: 0.42 },
    };

    const getMaxSizeForWidth = (width: number): number => {
      const config = maxSizeConfig[asciiCategory] || maxSizeConfig.default;

      if (width < 420) {
        return config.mobile;
      }
      if (width < 768) {
        return config.tablet;
      }
      return config.desktop;
    };

    const minSizeMap: Record<string, number> = {
      "extremely-large": 0.02,
      large: 0.03,
      default: 0.05,
    };

    const getMinSize = (): number =>
      minSizeMap[asciiCategory] || minSizeMap.default;

    const calculateForWidth = (width: number, targetSize: number) => {
      const availableWidth = width * 0.92;
      const calculatedFontSize =
        availableWidth / (maxLineLength * charWidthRatio) / 16;

      const minSize = getMinSize();
      const maxSize = getMaxSizeForWidth(width);

      // Prefer calculated size, but if it's way off from target, blend with target
      const boundedCalculated = Math.max(
        minSize,
        Math.min(maxSize, calculatedFontSize)
      );

      // If calculated size is reasonable, use it; otherwise blend with target
      if (Math.abs(boundedCalculated - targetSize) < targetSize * 0.3) {
        return boundedCalculated;
      }
      // Blend calculated with target (70% calculated, 30% target)
      return boundedCalculated * 0.7 + targetSize * 0.3;
    };

    return {
      mobile: calculateForWidth(mobileWidth, targetMobile),
      tablet: calculateForWidth(tabletWidth, targetTablet),
      desktop: calculateForWidth(desktopWidth, targetDesktop),
    };
  };

  const fontSizeEstimates = getInitialFontSizeEstimates();

  // Calculate estimated height based on actual expected font sizes to prevent jumping
  const getEstimatedHeight = () => {
    // Use the actual font sizes that will likely be used
    let expectedFontSize: number;

    // For server-side estimation, assume desktop size for conservative estimate
    // since that's where height issues are most problematic
    if (asciiCategory === "extremely-large") {
      expectedFontSize = 0.3; // Desktop target for extremely-large
    } else if (asciiCategory === "large") {
      expectedFontSize = 0.25; // Conservative estimate for large
    } else {
      expectedFontSize = 0.2; // Conservative estimate for normal
    }

    // Convert rem to pixels (assuming 16px base)
    const fontSizeInPx = expectedFontSize * 16;

    // Calculate height: lineCount * fontSize * lineHeight + padding
    const calculatedHeight = Math.ceil(lineCount * fontSizeInPx * 1.1 + 32);

    // Add some buffer for extremely large ASCII to prevent any overflow
    const buffer = asciiCategory === "extremely-large" ? 64 : 32;

    return calculatedHeight + buffer;
  };

  const estimatedHeight = getEstimatedHeight();

  const getHeightStyle = () => {
    if (hero) {
      return { height: "55vh", minHeight: "300px" };
    }
    if (height) {
      return { height: typeof height === "number" ? `${height}px` : height };
    }
    return { height: "auto" as const, minHeight: `${estimatedHeight}px` };
  };
  const heightStyle = getHeightStyle();

  return (
    <div
      className="flex w-full min-w-0 items-center justify-center overflow-hidden"
      style={heightStyle}
    >
      <Suspense
        fallback={
          <div
            className="flex w-full items-center justify-center text-muted-foreground text-sm"
            style={{ height: `${Math.min(estimatedHeight, 128)}px` }}
          >
            Loading ASCII art...
          </div>
        }
      >
        <AsciiArtRenderer
          asciiArt={resolvedAsciiArt}
          asciiCategory={asciiCategory}
          className={className}
          estimatedHeight={estimatedHeight}
          fontSizeEstimates={fontSizeEstimates}
          hero={hero}
          lineCount={lineCount}
          maxLineLength={maxLineLength}
        />
      </Suspense>
    </div>
  );
}
