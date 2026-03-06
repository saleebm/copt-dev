"use client";

import React, { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TooltipProps = {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  delayDuration?: number;
  disabled?: boolean;
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = "top",
  className,
  delayDuration = 500,
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = useCallback(() => {
    if (disabled) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
    }, delayDuration);
  }, [delayDuration, disabled]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsAnimating(false);

    // Delay hiding to allow exit animation
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    animationTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150); // Match the animation duration
  }, []);

  // Clean up timeouts on unmount
  React.useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    },
    []
  );

  const getTooltipPosition = () => {
    switch (side) {
      case "top":
        return "bottom-full left-1/2 -translate-x-1/2 mb-2";
      case "bottom":
        return "top-full left-1/2 -translate-x-1/2 mt-2";
      case "left":
        return "right-full top-1/2 -translate-y-1/2 mr-2";
      case "right":
        return "left-full top-1/2 -translate-y-1/2 ml-2";
      default:
        return "bottom-full left-1/2 -translate-x-1/2 mb-2";
    }
  };

  const getArrowPosition = () => {
    switch (side) {
      case "top":
        return "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-background";
      case "bottom":
        return "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-background";
      case "left":
        return "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-background";
      case "right":
        return "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-background";
      default:
        return "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-background";
    }
  };

  const getAnimationClasses = () => {
    const baseClasses = "transition-all duration-150 ease-out";

    if (!isAnimating) {
      switch (side) {
        case "top":
          return `${baseClasses} opacity-0 translate-y-1 scale-95`;
        case "bottom":
          return `${baseClasses} opacity-0 -translate-y-1 scale-95`;
        case "left":
          return `${baseClasses} opacity-0 translate-x-1 scale-95`;
        case "right":
          return `${baseClasses} opacity-0 -translate-x-1 scale-95`;
        default:
          return `${baseClasses} opacity-0 translate-y-1 scale-95`;
      }
    }

    return `${baseClasses} opacity-100 translate-x-0 translate-y-0 scale-100`;
  };

  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative inline-block"
      onBlur={hideTooltip}
      onFocus={showTooltip}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}

      {isVisible && (
        <div
          aria-hidden={!isAnimating}
          className={cn(
            "pointer-events-none absolute z-50",
            getTooltipPosition()
          )}
          role="tooltip"
        >
          {/* Tooltip Content */}
          <div
            className={cn(
              "relative rounded-md border border-border/50 bg-background px-3 py-2 font-medium text-foreground text-sm shadow-lg backdrop-blur-sm",
              "max-w-xs break-words font-mono",
              // Subtle gradient background for depth
              "bg-gradient-to-br from-background to-background/95",
              // Enhanced shadow for floating effect
              "shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
              // Subtle border glow
              "ring-1 ring-primary/10",
              getAnimationClasses(),
              className
            )}
          >
            {content}

            {/* Arrow */}
            <div
              aria-hidden="true"
              className={cn("absolute h-0 w-0 border-4", getArrowPosition())}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Higher-order component for easy wrapping
type WithTooltipProps = {
  tooltip: string;
  side?: "top" | "bottom" | "left" | "right";
  delayDuration?: number;
  disabled?: boolean;
  className?: string;
};

export function withTooltip<P extends object>(
  Component: React.ComponentType<P>
) {
  return ({
    ref,
    ...props
  }: P & WithTooltipProps & { ref?: React.RefObject<HTMLElement | null> }) => {
    const {
      tooltip,
      side,
      delayDuration,
      disabled,
      className,
      ...componentProps
    } = props;

    return (
      <Tooltip
        className={className}
        content={tooltip}
        delayDuration={delayDuration}
        disabled={disabled}
        side={side}
      >
        <Component {...(componentProps as P)} ref={ref} />
      </Tooltip>
    );
  };
}

export default Tooltip;
