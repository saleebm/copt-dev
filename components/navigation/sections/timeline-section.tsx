"use client";

import { useEffect, useState } from "react";
import { ChronicleTab } from "@/components/navigation/chronicle-tab";
import { useNavigationContext } from "@/components/navigation/navigation-context";
import { PostTypeFilterBar } from "@/components/navigation/post-type-filter-bar";
import { TerminalModeSwitcher } from "@/components/navigation/terminal-mode-switcher";
import { TimelineTab } from "@/components/navigation/timeline-tab";
import type { useMobileNavigationState } from "@/hooks/use-mobile-navigation-state";
import { PostType } from "@/lib/generated/prisma";
import styles from "@/styles/navigation.module.css";

interface TimelineSectionProps {
  navState?: ReturnType<typeof useMobileNavigationState>;
  onNavigate?: () => void;
}

const TIMELINE_MODES = [
  { value: "live" as const, label: "Live" },
  { value: "chronicle" as const, label: "Chronicle" },
] as const;

type ViewMode = (typeof TIMELINE_MODES)[number]["value"];

/**
 * TIMELINE section wrapper for the vertical accordion
 * Merges TimelineTab (live timeline) and ChronicleTab (AI chronicle) functionality
 * Preserves all existing navigation, filtering, and data fetching
 */
export function TimelineSection({
  onNavigate,
}: Omit<TimelineSectionProps, "navState">) {
  const { selectedPostTypes, handleTypeToggle, postTypeCounts } =
    useNavigationContext();
  const [viewMode, setViewMode] = useState<ViewMode>("live");

  // Persist view mode preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nav-timeline-mode");
      if (saved === "live" || saved === "chronicle") {
        setViewMode(saved);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nav-timeline-mode", viewMode);
    }
  }, [viewMode]);

  // Determine if we should show AI content types
  const hasAIContent = selectedPostTypes.some(
    (type) => type === PostType.FINDING || type === PostType.SIGHT
  );

  return (
    <div className={styles.timelineSectionWrapper}>
      {/* View mode switcher - only show if AI content is selected */}
      {hasAIContent && (
        <TerminalModeSwitcher
          activeMode={viewMode}
          modes={TIMELINE_MODES}
          onModeChange={setViewMode}
        />
      )}

      {/* Post type filter bar - shared by both views */}
      <div className={styles.timelineFilters}>
        <PostTypeFilterBar
          onTypeToggle={handleTypeToggle}
          postTypeCounts={postTypeCounts}
          selectedTypes={selectedPostTypes}
        />
      </div>

      {/* Preserve all existing component functionality */}
      <div className={styles.timelineContent}>
        {viewMode === "live" ? (
          <TimelineTab onNavigate={onNavigate} />
        ) : (
          <ChronicleTab onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}
