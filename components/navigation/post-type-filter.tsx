"use client";

import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PostType } from "@/lib/generated/prisma";
import { cn } from "@/lib/utils";
import type { PostTypeCount } from "@/types/navigation";

interface PostTypeFilterProps {
  className?: string;
  onFilterChange?: (types: PostType[]) => void;
  onTypeToggle?: (type: PostType) => void;
  postTypeCounts: PostTypeCount[];
  selectedTypes?: PostType[];
}

// Terminal-style post type descriptions
const POST_TYPE_INFO = {
  [PostType.FINDING]: {
    label: "Findings",
    short: "F",
    color: "post-type-finding",
    bgColor: "bg-chart-2",
    description: "External discoveries & research",
    icon: "◈",
  },
  [PostType.SIGHT]: {
    label: "Sights",
    short: "S",
    color: "post-type-sight",
    bgColor: "bg-chart-3",
    description: "Visual & media content",
    icon: "◉",
  },
  [PostType.BLOG]: {
    label: "Blog",
    short: "B",
    color: "post-type-blog",
    bgColor: "bg-chart-4",
    description: "Personal writings & thoughts",
    icon: "◊",
  },
  [PostType.CONCRETE]: {
    label: "Concrete",
    short: "C",
    color: "post-type-concrete",
    bgColor: "bg-chart-5",
    description: "Core pages & information",
    icon: "▪",
  },
};

export function PostTypeFilter({
  postTypeCounts,
  selectedTypes = Object.values(PostType),
  onTypeToggle,
  onFilterChange,
  className,
}: PostTypeFilterProps) {
  // Convert array to Set for efficient lookups
  const activeTypes = useMemo(() => new Set(selectedTypes), [selectedTypes]);

  // Get count for a specific type
  const getTypeCount = useCallback(
    (type: PostType) => {
      const countData = postTypeCounts.find((c) => c.type === type);
      return countData || { count: 0, percentage: 0 };
    },
    [postTypeCounts]
  );

  // Toggle a post type filter
  const handleToggleType = useCallback(
    (type: PostType) => {
      const currentTypes = new Set(selectedTypes);
      if (currentTypes.has(type)) {
        // Don't allow deselecting all types
        if (currentTypes.size > 1) {
          currentTypes.delete(type);
        }
      } else {
        currentTypes.add(type);
      }

      // Notify parent of change
      const typesArray = Array.from(currentTypes);
      onFilterChange?.(typesArray);
      onTypeToggle?.(type);
    },
    [selectedTypes, onTypeToggle, onFilterChange]
  );

  // Select all types
  const handleSelectAll = useCallback(() => {
    const allTypes = Object.values(PostType);
    onFilterChange?.(allTypes);
  }, [onFilterChange]);

  // Select only one type
  const handleSelectOnly = useCallback(
    (type: PostType) => {
      onFilterChange?.([type]);
    },
    [onFilterChange]
  );

  // Calculate totals
  const stats = useMemo(() => {
    const activeCount = selectedTypes.reduce((sum, type) => {
      const count = getTypeCount(type);
      return sum + count.count;
    }, 0);

    const totalCount = postTypeCounts.reduce((sum, c) => sum + c.count, 0);

    return {
      activeCount,
      totalCount,
      percentage:
        totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0,
    };
  }, [selectedTypes, postTypeCounts, getTypeCount]);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border border-white/20 bg-black p-4",
        className
      )}
    >
      {/* Terminal header */}
      <div className="mb-2 flex items-center gap-2 text-white/40 text-xs">
        <span className="terminal-prompt">❯</span>
        <span>filter --type</span>
      </div>

      {/* Filter toggles */}
      <div className="grid grid-cols-2 gap-2">
        {Object.values(PostType).map((type) => {
          const info = POST_TYPE_INFO[type];
          const count = getTypeCount(type);
          const isActive = activeTypes.has(type);

          return (
            <Button
              aria-label={`${isActive ? "Disable" : "Enable"} ${info.label} filter`}
              aria-pressed={isActive}
              className={cn(
                "relative overflow-hidden",
                "h-auto p-3 font-mono text-xs",
                "border transition-all duration-200",
                "hover:scale-[1.02]",
                isActive
                  ? cn(
                      "border-white/40 bg-white/5",
                      "hover:border-white/60 hover:bg-white/10"
                    )
                  : "border-white/20 bg-black/50 opacity-50 hover:opacity-75"
              )}
              key={type}
              onClick={() => handleToggleType(type)}
              variant="ghost"
            >
              {/* Background gradient effect */}
              {isActive && (
                <div
                  className={cn(
                    "absolute top-0 right-0 h-24 w-24",
                    info.bgColor,
                    "rounded-full opacity-10 blur-xl",
                    "-mt-12 -mr-12"
                  )}
                />
              )}

              <div className="relative z-10 w-full">
                {/* Type header */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-lg",
                        isActive ? info.color : "text-white/40"
                      )}
                    >
                      {info.icon}
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        isActive ? "text-white" : "text-white/60"
                      )}
                    >
                      {info.label}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 text-xs",
                      isActive
                        ? "bg-white/10 text-white/80"
                        : "bg-white/5 text-white/40"
                    )}
                  >
                    [{info.short}]
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={cn(isActive ? "text-white/70" : "text-white/40")}
                  >
                    {count.count} posts
                  </span>
                  <span
                    className={cn(
                      isActive ? info.color : "text-white/30",
                      "opacity-60"
                    )}
                  >
                    {count.percentage}%
                  </span>
                </div>

                {/* Description */}
                <div
                  className={cn(
                    "mt-1 text-xs",
                    isActive ? "text-white/50" : "text-white/30"
                  )}
                >
                  {info.description}
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex items-center justify-between border-white/10 border-t pt-2">
        <div className="flex gap-2">
          <button
            aria-label="Select all post types"
            className="terminal-interactive font-mono text-xs"
            onClick={handleSelectAll}
            type="button"
          >
            [all]
          </button>
          {Object.values(PostType).map((type) => (
            <button
              aria-label={`Show only ${POST_TYPE_INFO[type].label}`}
              className="font-mono text-white/40 text-xs transition-colors hover:text-white/60"
              key={type}
              onClick={() => handleSelectOnly(type)}
              type="button"
            >
              [{POST_TYPE_INFO[type].short}]
            </button>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-white/10 border-t pt-2 text-white/40 text-xs">
        <span>
          showing: {stats.activeCount}/{stats.totalCount} posts
        </span>
        <span className="terminal-prompt">{stats.percentage}%</span>
      </div>
    </div>
  );
}
