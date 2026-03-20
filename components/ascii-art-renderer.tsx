"use client";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Props for the AsciiArtRenderer component.
 */
interface AsciiArtRendererProps {
  asciiArt: string;
  asciiCategory: "normal" | "large" | "extremely-large";
  className?: string;
  estimatedHeight: number;
  fontSizeEstimates: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  hero?: boolean;
  lineCount: number;
  maxLineLength: number;
  src?: string;
}

/**
 * A React component that renders pre-formatted ASCII art and auto-scales it to fit its container width.
 * Height is completely fluid - no height constraints or animations that cause container jumping.
 */
const AsciiArtRenderer = ({
  asciiArt: asciiArtProp,
  src,
  className = "",
  maxLineLength: maxLineLengthProp,
  asciiCategory: asciiCategoryProp,
  fontSizeEstimates,
  estimatedHeight,
  hero = false,
}: AsciiArtRendererProps) => {
  const [fetchedArt, setFetchedArt] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const isInitializedRef = useRef(false);
  const [showContent, setShowContent] = useState(false);
  const lastCalculatedWidthRef = useRef<number | null>(null);
  const initialFontSize = hero
    ? Math.max(fontSizeEstimates.mobile, 0.25)
    : fontSizeEstimates.mobile;
  const fontSizeRef = useRef(initialFontSize);

  const applyFontSize = useCallback((size: number) => {
    fontSizeRef.current = size;
    if (preRef.current) {
      // biome-ignore lint/style/useTemplate: <explanation>
      preRef.current.style.fontSize = size + "rem";
    }
  }, []);

  const asciiArt = asciiArtProp || fetchedArt || "";

  // Recalculate metadata from fetched content
  const lines = asciiArt.split("\n");
  const maxLineLength = asciiArt
    ? Math.max(...lines.map((l) => l.length))
    : maxLineLengthProp;
  const asciiCategory = (() => {
    if (!asciiArt) {
      return asciiCategoryProp;
    }
    if (maxLineLength > 120 || lines.length > 40) {
      return "extremely-large";
    }
    if (maxLineLength > 60 || lines.length > 20) {
      return "large";
    }
    return "normal";
  })();

  // Fetch ASCII art from src if asciiArt prop is empty
  useEffect(() => {
    if (asciiArtProp || !src) {
      return;
    }
    fetch(src)
      .then((res) => res.text())
      .then(setFetchedArt);
  }, [asciiArtProp, src]);

  const actualLineCount = lines.length;

  // Ref always holds the latest calculation function — bypasses React Compiler memoization
  const calculateFontSizeRef = useRef<(containerWidth: number) => number>(
    () => initialFontSize
  );

  // Update ref on every render with current closure values
  calculateFontSizeRef.current = (containerWidth: number) => {
    const targetMobile = 0.08;
    const targetTablet = 0.15;
    const targetDesktop = 0.3;

    const availableWidth = containerWidth * 0.92;
    const charWidthRatio = maxLineLength > 120 ? 0.52 : 0.62;

    let calculatedFontSize = availableWidth / (maxLineLength * charWidthRatio);
    calculatedFontSize /= 16;

    let minSize: number;
    let maxSize: number;

    if (asciiCategory === "extremely-large") {
      minSize = 0.02;
      if (containerWidth < 420) {
        maxSize = 0.12;
      } else if (containerWidth < 768) {
        maxSize = 0.2;
      } else {
        maxSize = 0.3;
      }
    } else if (asciiCategory === "large") {
      minSize = 0.03;
      if (containerWidth < 420) {
        maxSize = 0.15;
      } else if (containerWidth < 768) {
        maxSize = 0.25;
      } else {
        maxSize = 0.4;
      }
    } else {
      minSize = 0.05;
      if (containerWidth < 420) {
        maxSize = 0.2;
      } else if (containerWidth < 768) {
        maxSize = 0.3;
      } else {
        maxSize = 0.42;
      }
    }

    const boundedCalculated = Math.max(
      minSize,
      Math.min(maxSize, calculatedFontSize)
    );

    // Hero mode: on narrow screens, size by viewport height instead of width
    // so the art fills a meaningful portion of the card. Horizontal overflow
    // is clipped by the parent's overflow-hidden.
    if (hero && containerWidth < 768) {
      const vh = typeof window !== "undefined" ? window.innerHeight : 844;
      const targetHeight = vh * 0.5;
      const heightBasedSize = targetHeight / (actualLineCount * 1.1) / 16;
      return Math.max(boundedCalculated, Math.min(heightBasedSize, 0.35));
    }

    let targetSize: number;
    if (containerWidth < 420) {
      targetSize = targetMobile;
    } else if (containerWidth < 768) {
      targetSize = targetTablet;
    } else {
      targetSize = targetDesktop;
    }

    if (Math.abs(boundedCalculated - targetSize) < targetSize * 0.3) {
      return boundedCalculated;
    }
    return boundedCalculated * 0.7 + targetSize * 0.3;
  };

  useEffect(() => {
    if (!(containerRef.current && asciiArt)) {
      return;
    }

    const container = containerRef.current;

    const checkAndCalculate = () => {
      const containerWidth = container.clientWidth;

      if (containerWidth === 0) {
        setTimeout(checkAndCalculate, 50);
        return;
      }

      const newFontSize = calculateFontSizeRef.current(containerWidth);

      if (!isInitializedRef.current) {
        applyFontSize(newFontSize);
        lastCalculatedWidthRef.current = containerWidth;
        isInitializedRef.current = true;
        setTimeout(() => setShowContent(true), 50);
        return;
      }

      if (lastCalculatedWidthRef.current) {
        const widthDiff = Math.abs(
          containerWidth - lastCalculatedWidthRef.current
        );
        if (widthDiff < 42) {
          return;
        }
      }

      if (Math.abs(newFontSize - fontSizeRef.current) > 0.02) {
        applyFontSize(newFontSize);
      }

      lastCalculatedWidthRef.current = containerWidth;
    };

    const timeoutId = setTimeout(checkAndCalculate, 50);
    let resizeTimeoutId: NodeJS.Timeout;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container && isInitializedRef.current) {
          clearTimeout(timeoutId);
          if (resizeTimeoutId) {
            clearTimeout(resizeTimeoutId);
          }
          resizeTimeoutId = setTimeout(checkAndCalculate, 300);
          break;
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      clearTimeout(timeoutId);
      if (resizeTimeoutId) {
        clearTimeout(resizeTimeoutId);
      }
      resizeObserver.disconnect();
    };
  }, [asciiArt, applyFontSize]);

  if (!asciiArt) {
    return (
      <div
        className="flex w-full items-center justify-center overflow-hidden p-1"
        style={{ minHeight: `${estimatedHeight}px` }}
      />
    );
  }

  const containerClasses = hero
    ? "w-full flex items-center justify-center overflow-hidden"
    : "w-full flex items-center justify-center p-1 overflow-hidden";
  const preClasses =
    `whitespace-pre text-foreground select-none ${className}`.trim();

  return (
    <motion.div
      animate={{ opacity: showContent ? 1 : 0 }}
      className={containerClasses}
      initial={{ opacity: 0 }}
      ref={containerRef}
      style={
        hero
          ? { height: "100%", minHeight: 0 }
          : { minHeight: `${estimatedHeight}px` }
      }
      transition={{ duration: 0.3 }}
    >
      <pre
        className={preClasses}
        ref={preRef}
        style={{
          // biome-ignore lint/style/useTemplate: <explanation>
          fontSize: initialFontSize + "rem",
          lineHeight: 1.1,
          margin: 0,
          padding: 0,
        }}
      >
        {asciiArt}
      </pre>
    </motion.div>
  );
};

export default AsciiArtRenderer;
