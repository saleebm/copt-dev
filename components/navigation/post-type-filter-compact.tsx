"use client";

import { useCallback, useMemo } from "react";
import { PostType } from "@/lib/generated/prisma";
import { cn } from "@/lib/utils";
import styles from "./post-type-filter.module.css";

type PostTypeCount = {
  type: PostType;
  count: number;
  percentage: number;
};

type PostTypeFilterCompactProps = {
  postTypeCounts: PostTypeCount[];
  selectedTypes?: PostType[];
  onTypeToggle?: (type: PostType) => void;
  onFilterChange?: (types: PostType[]) => void;
  className?: string;
};

// Define display order and styling for post types using CSS module classes
const POST_TYPE_CONFIG = {
  // Primary types (Blog & Concrete)
  [PostType.BLOG]: {
    label: "Blog",
    short: "B",
    order: 1,
    primary: true,
    color: styles.blogText,
    bgActive: styles.blogBg,
    borderActive: styles.blogActive,
    description: "Personal writings",
  },
  [PostType.CONCRETE]: {
    label: "Concrete",
    short: "C",
    order: 2,
    primary: true,
    color: styles.concreteText,
    bgActive: styles.concreteBg,
    borderActive: styles.concreteActive,
    description: "Core pages",
  },
  // Secondary types (Finding & Sight)
  [PostType.FINDING]: {
    label: "Findings",
    short: "F",
    order: 3,
    primary: false,
    color: styles.findingText,
    bgActive: styles.findingBg,
    borderActive: styles.findingActive,
    description: "Discoveries",
  },
  [PostType.SIGHT]: {
    label: "Sights",
    short: "S",
    order: 4,
    primary: false,
    color: styles.sightText,
    bgActive: styles.sightBg,
    borderActive: styles.sightActive,
    description: "Visual content",
  },
};

export function PostTypeFilterCompact({
  postTypeCounts,
  selectedTypes = Object.values(PostType),
  onTypeToggle,
  onFilterChange,
  className,
}: PostTypeFilterCompactProps) {
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

  // Sort types by configured order
  const sortedTypes = useMemo(
    () =>
      Object.values(PostType).sort(
        (a, b) => POST_TYPE_CONFIG[a].order - POST_TYPE_CONFIG[b].order
      ),
    []
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
    <div className={cn(styles.filterBarContainer, className)}>
      {/* Terminal prompt indicator */}
      <span className={styles.terminalPrompt}>▸</span>

      {/* Primary types - larger buttons */}
      <div className={styles.primaryTypesGroup}>
        {sortedTypes
          .filter((type) => POST_TYPE_CONFIG[type].primary)
          .map((type) => {
            const config = POST_TYPE_CONFIG[type];
            const count = getTypeCount(type);
            const isActive = activeTypes.has(type);

            return (
              <button
                aria-label={`${isActive ? "Disable" : "Enable"} ${config.label} filter`}
                aria-pressed={isActive}
                className={cn(
                  styles.filterButton,
                  styles.filterButtonPrimary,
                  isActive
                    ? [styles.filterButtonActive, config.borderActive]
                    : styles.filterButtonInactive
                )}
                key={type}
                onClick={() => handleToggleType(type)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      styles.typeLabel,
                      isActive ? config.color : styles.typeLabelInactive
                    )}
                  >
                    {config.label}
                  </span>
                  <span
                    className={cn(
                      styles.typeCount,
                      isActive
                        ? styles.typeCountActive
                        : styles.typeCountInactive
                    )}
                  >
                    {count.count}
                  </span>
                </div>
              </button>
            );
          })}
      </div>

      {/* Separator */}
      <span className={styles.separator}>│</span>

      {/* Secondary types - smaller buttons */}
      <div className={styles.secondaryTypesGroup}>
        {sortedTypes
          .filter((type) => !POST_TYPE_CONFIG[type].primary)
          .map((type) => {
            const config = POST_TYPE_CONFIG[type];
            const count = getTypeCount(type);
            const isActive = activeTypes.has(type);

            return (
              <button
                aria-label={`${isActive ? "Disable" : "Enable"} ${config.label} filter`}
                aria-pressed={isActive}
                className={cn(
                  styles.filterButton,
                  styles.filterButtonSecondary,
                  isActive
                    ? [styles.filterButtonActive, config.borderActive]
                    : styles.filterButtonInactive
                )}
                key={type}
                onClick={() => handleToggleType(type)}
                title={`${config.label}: ${config.description} (${count.count} posts)`}
                type="button"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      isActive ? config.color : styles.typeLabelInactive
                    )}
                  >
                    {config.short}
                  </span>
                  <span
                    className={cn(
                      styles.typeCount,
                      isActive
                        ? styles.typeCountActive
                        : styles.typeCountInactive
                    )}
                  >
                    {count.count}
                  </span>
                </div>
              </button>
            );
          })}
      </div>

      {/* Stats display */}
      <div className={styles.statsContainer}>
        <span className={styles.statsCount}>
          {stats.activeCount}/{stats.totalCount}
        </span>
        <span
          className={cn(
            styles.statsPercentage,
            stats.percentage === 100
              ? styles.statsPercentageComplete
              : styles.statsPercentagePartial
          )}
        >
          {stats.percentage}%
        </span>
      </div>
    </div>
  );
}
