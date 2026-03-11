"use client";

import React from "react";
import { PostType } from "@/lib/generated/prisma";
import { cn } from "@/lib/utils";

interface PostListItemProps {
  isSelected?: boolean;
  onClick: (slug: string) => void;
  slug: string;
  title: string;
  type: PostType;
}

export function PostListItem({
  slug,
  title,
  type,
  onClick,
  isSelected = false,
}: PostListItemProps) {
  return (
    <button
      aria-label={`Navigate to ${title}`}
      className={cn(
        // Base layout and spacing
        "group relative w-full text-left",
        "px-4 py-3",
        // Typography - using monospace font
        "font-mono text-xs",
        // Border and separation
        "border-white/5 border-b",
        // Background and hover states
        "bg-transparent",
        "hover:bg-white/[0.02]",
        "transition-all duration-200",
        // Focus states
        "focus:outline-none",
        "focus:bg-white/[0.03]",
        "focus:border-l-2 focus:border-l-primary/60",
        // Active/selected state
        isSelected && "border-l-2 border-l-primary bg-white/[0.04]"
      )}
      onClick={() => onClick(slug)}
      type="button"
    >
      {/* Content container with proper flex layout */}
      <div className="flex items-start gap-3">
        {/* Bullet/indicator */}
        <span
          className={cn(
            "mt-0.5 flex-shrink-0 text-white/30",
            "transition-colors duration-200 group-hover:text-primary/60"
          )}
        >
          ▸
        </span>

        {/* Title with proper wrapping */}
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "block",
              "text-white/70",
              "group-hover:text-white/90",
              "transition-colors duration-200",
              // Text wrapping
              "break-words",
              "whitespace-normal",
              "leading-relaxed"
            )}
          >
            {title}
          </span>
        </div>

        {/* Post type badge */}
        <span
          className={cn(
            "flex-shrink-0",
            "px-1.5 py-0.5",
            "text-[10px]",
            "font-mono",
            "uppercase",
            "tracking-wider",
            "border border-white/10",
            "rounded-sm",
            "transition-all duration-200",
            // Type-specific colors
            type === PostType.FINDING &&
              "border-chart-2/30 text-chart-2 group-hover:border-chart-2/50",
            type === PostType.SIGHT &&
              "border-chart-3/30 text-chart-3 group-hover:border-chart-3/50",
            type === PostType.BLOG &&
              "border-chart-4/30 text-chart-4 group-hover:border-chart-4/50",
            type === PostType.CONCRETE &&
              "border-chart-5/30 text-chart-5 group-hover:border-chart-5/50"
          )}
        >
          {type.slice(0, 3)}
        </span>
      </div>

      {/* Subtle hover accent line */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-[1px] w-0",
          "bg-gradient-to-r from-primary/60 to-transparent",
          "group-hover:w-full",
          "transition-all duration-300 ease-out"
        )}
      />
    </button>
  );
}

// Export a memoized version for performance in long lists
export const MemoizedPostListItem = React.memo(PostListItem);
