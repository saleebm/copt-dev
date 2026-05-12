"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTooltipPosition } from "@/hooks/use-tooltip-position";

interface HlexiconProps {
  className?: string;
  definition: string;
  term: string;
}

export function Hlexicon({ term, definition, className = "" }: HlexiconProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const termRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const tooltipPosition = useTooltipPosition({
    termRef,
    tooltipRef,
    isVisible: isTooltipVisible,
  });

  // Ensure we're client-side before using portals
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseEnter = () => {
    setIsTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    setIsTooltipVisible(false);
  };

  const handleClick = () => {
    setIsTooltipVisible(!isTooltipVisible);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsTooltipVisible(!isTooltipVisible);
    } else if (event.key === "Escape") {
      setIsTooltipVisible(false);
    }
  };

  const tooltipElement =
    isTooltipVisible && mounted ? (
      <div
        className="fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 fixed z-50 max-w-xs animate-in rounded-lg border border-border bg-popover p-3 font-normal text-foreground text-sm shadow-lg backdrop-blur-sm duration-200 data-[state=closed]:animate-out"
        id={`hlexicon-tooltip-${term.replace(/\s+/g, "-")}`}
        ref={tooltipRef}
        role="tooltip"
        style={{
          left: tooltipPosition.x,
          top: tooltipPosition.y,
        }}
      >
        <div className="mb-1 font-semibold text-primary text-xs uppercase tracking-wide">
          {term}
        </div>
        <div className="text-muted-foreground leading-relaxed">
          {definition}
        </div>
        <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 transform border-border border-r border-b bg-popover" />
      </div>
    ) : null;

  return (
    <>
      <button
        aria-describedby={`hlexicon-tooltip-${term.replace(/\s+/g, "-")}`}
        aria-expanded={isTooltipVisible}
        className={`hlexicon-term -mx-0.5 cursor-help rounded-sm bg-transparent p-0 px-0.5 font-medium text-primary/90 underline decoration-1 decoration-primary/40 decoration-dotted underline-offset-2 transition-all duration-200 hover:text-primary hover:decoration-2 hover:decoration-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:ring-offset-1 ${className}
                `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        ref={termRef}
        type="button"
      >
        {term}
      </button>

      {/* Render tooltip via Portal to avoid HTML structure issues */}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(tooltipElement, document.body)}
    </>
  );
}

export default Hlexicon;
