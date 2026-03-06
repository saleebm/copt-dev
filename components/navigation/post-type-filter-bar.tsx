"use client";

import * as React from "react";
import { PostType } from "@/lib/generated/prisma";
import { cn } from "@/lib/utils";
import styles from "./post-type-filter.module.css";

type PostTypeCount = {
  type: PostType;
  count: number;
  percentage: number;
};

type PostTypeFilterBarProps = {
  selectedTypes?: PostType[];
  onTypeToggle?: (type: PostType) => void;
  postTypeCounts?: PostTypeCount[];
  className?: string;
};

// Get all PostType values dynamically from the enum
const getAllPostTypes = (): PostType[] => Object.values(PostType) as PostType[];

// Map post types to their CSS module style classes
const typeStyles = {
  [PostType.BLOG]: {
    border: styles.blogBorder,
    bg: styles.blogBg,
    text: styles.blogText,
    hover: styles.blogHover,
    active: styles.blogActive,
  },
  [PostType.CONCRETE]: {
    border: styles.concreteBorder,
    bg: styles.concreteBg,
    text: styles.concreteText,
    hover: styles.concreteHover,
    active: styles.concreteActive,
  },
  [PostType.FINDING]: {
    border: styles.findingBorder,
    bg: styles.findingBg,
    text: styles.findingText,
    hover: styles.findingHover,
    active: styles.findingActive,
  },
  [PostType.SIGHT]: {
    border: styles.sightBorder,
    bg: styles.sightBg,
    text: styles.sightText,
    hover: styles.sightHover,
    active: styles.sightActive,
  },
} as const;

// Fallback styles for any new PostType values not yet defined
const getFallbackStyles = () => ({
  border: styles.fallbackBorder,
  bg: styles.fallbackBg,
  text: styles.fallbackText,
  hover: styles.fallbackHover,
  active: styles.fallbackActive,
});

const PostTypeFilterBar: React.FC<PostTypeFilterBarProps> = ({
  selectedTypes = getAllPostTypes(),
  onTypeToggle = () => {
    // Default no-op handler
  },
  postTypeCounts = [],
  className,
}) => {
  const allTypes = getAllPostTypes();

  const handleToggle = React.useCallback(
    (type: PostType) => {
      // Prevent deselecting if it's the last selected type
      if (selectedTypes.length === 1 && selectedTypes.includes(type)) {
        return;
      }
      onTypeToggle(type);
    },
    [selectedTypes, onTypeToggle]
  );

  const getTypeCount = React.useCallback(
    (type: PostType) =>
      postTypeCounts.find((tc) => tc.type === type)?.count || 0,
    [postTypeCounts]
  );

  const isPrimary = React.useCallback(
    (type: PostType) => type === PostType.BLOG || type === PostType.CONCRETE,
    []
  );

  const isSelected = React.useCallback(
    (type: PostType) => selectedTypes.includes(type),
    [selectedTypes]
  );

  const renderTypeButton = React.useCallback(
    (type: PostType) => {
      const styleSet = typeStyles[type] || getFallbackStyles();
      const primary = isPrimary(type);
      const selected = isSelected(type);
      const count = getTypeCount(type);
      const disabled = selectedTypes.length === 1 && selected;

      return (
        <button
          aria-label={`${selected ? "Deselect" : "Select"} ${type.toLowerCase()} posts`}
          aria-pressed={selected}
          className={cn(
            styles.filterButton,
            primary ? styles.filterButtonPrimary : styles.filterButtonSecondary,
            selected
              ? [styles.filterButtonActive, styleSet.active]
              : styles.filterButtonInactive,
            disabled && styles.filterButtonDisabled
          )}
          disabled={disabled}
          key={type}
          onClick={() => handleToggle(type)}
          title={`${type}: ${count} posts`}
          type="button"
        >
          <span
            className={cn(
              styles.typeLabel,
              selected
                ? [styleSet.text, styles.typeLabelActive]
                : styles.typeLabelInactive
            )}
          >
            {type.charAt(0) + type.slice(1).toLowerCase()}
          </span>
          <span
            className={cn(
              styles.typeCount,
              selected ? styles.typeCountActive : styles.typeCountInactive
            )}
          >
            {count}
          </span>
        </button>
      );
    },
    [isPrimary, isSelected, getTypeCount, selectedTypes.length, handleToggle]
  );

  // Separate primary and secondary types
  const primaryTypes = React.useMemo(
    () => allTypes.filter((type) => isPrimary(type)),
    [allTypes, isPrimary]
  );

  const secondaryTypes = React.useMemo(
    () => allTypes.filter((type) => !isPrimary(type)),
    [allTypes, isPrimary]
  );

  return (
    <div className={cn(styles.filterBarContainer, className)}>
      <div className={styles.filterBarContent}>
        {/* Terminal prompt indicator */}
        <span className={styles.terminalPrompt}>▸</span>

        {/* Primary types - larger buttons */}
        <div className={styles.primaryTypesGroup}>
          {primaryTypes.map(renderTypeButton)}
        </div>

        {/* Separator - only show if we have secondary types */}
        {secondaryTypes.length > 0 && (
          <span className={styles.separator}>│</span>
        )}

        {/* Secondary types - smaller buttons */}
        {secondaryTypes.length > 0 && (
          <div className={styles.secondaryTypesGroup}>
            {secondaryTypes.map(renderTypeButton)}
          </div>
        )}

        {/* Stats display */}
        <div className={styles.statsContainer}>
          <span className={styles.statsCount}>
            {selectedTypes.length}/{allTypes.length}
          </span>
          <span
            className={cn(
              styles.statsPercentage,
              selectedTypes.length === allTypes.length
                ? styles.statsPercentageComplete
                : styles.statsPercentagePartial
            )}
          >
            {Math.round((selectedTypes.length / allTypes.length) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export { PostTypeFilterBar, type PostTypeFilterBarProps, type PostTypeCount };
