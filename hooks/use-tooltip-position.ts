import { type RefObject, useCallback, useEffect, useState } from "react";

type UseTooltipPositionProps = {
  termRef: RefObject<HTMLElement | null>;
  tooltipRef: RefObject<HTMLElement | null>;
  isVisible: boolean;
};

type TooltipPosition = {
  x: number;
  y: number;
};

export function useTooltipPosition({
  termRef,
  tooltipRef,
  isVisible,
}: UseTooltipPositionProps): TooltipPosition {
  const [position, setPosition] = useState<TooltipPosition>({ x: 0, y: 0 });

  const updatePosition = useCallback(() => {
    if (termRef.current && tooltipRef.current) {
      const termRect = termRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const _viewportHeight = window.innerHeight;

      let x = termRect.left + termRect.width / 2 - tooltipRect.width / 2;
      let y = termRect.top - tooltipRect.height - 8;

      // Adjust horizontal position if tooltip would overflow
      if (x < 8) {
        x = 8;
      } else if (x + tooltipRect.width > viewportWidth - 8) {
        x = viewportWidth - tooltipRect.width - 8;
      }

      // Adjust vertical position if tooltip would overflow
      if (y < 8) {
        y = termRect.bottom + 8;
      }

      setPosition({ x, y });
    }
  }, [termRef.current, tooltipRef.current]);

  useEffect(() => {
    if (isVisible) {
      // Use a slight delay to ensure the tooltip is rendered
      const timeoutId = setTimeout(updatePosition, 0);

      window.addEventListener("scroll", updatePosition, { passive: true });
      window.addEventListener("resize", updatePosition);

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener("scroll", updatePosition);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isVisible, updatePosition]);

  return position;
}
