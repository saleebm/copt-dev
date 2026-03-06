"use client";

import { useCallback, useEffect, useState } from "react";
import { EnhancedCategoryTab } from "@/components/navigation/enhanced-category-tab";
import { EnhancedTagsTab } from "@/components/navigation/enhanced-tags-tab";
import { TerminalModeSwitcher } from "@/components/navigation/terminal-mode-switcher";
import type { useMobileNavigationState } from "@/hooks/use-mobile-navigation-state";
import styles from "@/styles/navigation.module.css";

type BrowseSectionProps = {
  onNavigate?: () => void;
  navState?: ReturnType<typeof useMobileNavigationState>;
};

const BROWSE_MODES = [
  { value: "nodes" as const, label: "Categories" },
  { value: "index" as const, label: "Tags" },
] as const;

type BrowseMode = (typeof BROWSE_MODES)[number]["value"];

/**
 * BROWSE section wrapper for the vertical accordion
 * Combines Categories (nodes) and Tags (index) with mode switching
 * Preserves all existing navigation functionality and handlers
 */
export function BrowseSection({ onNavigate, navState }: BrowseSectionProps) {
  // Use persisted browse mode from navState if available
  const [localMode, setLocalMode] = useState<BrowseMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nav-browse-mode");
      if (saved === "nodes" || saved === "index") {
        return saved as BrowseMode;
      }
    }
    return "nodes";
  });

  // Use navState if available, otherwise fall back to local state
  const mode = navState?.browseMode || localMode;
  const setMode = navState?.setBrowseMode || setLocalMode;

  // Sync with navState on mount if available
  useEffect(() => {
    if (navState?.isRestored && navState.browseMode) {
      setLocalMode(navState.browseMode);
    }
  }, [navState?.isRestored, navState?.browseMode]);

  // Handle mode change and persist to localStorage
  const handleModeChange = useCallback(
    (newMode: BrowseMode) => {
      setMode(newMode);
      // Also update localStorage for non-mobile cases
      if (!navState && typeof window !== "undefined") {
        localStorage.setItem("nav-browse-mode", newMode);
      }
    },
    [setMode, navState]
  );

  return (
    <div className={styles.browseSectionWrapper}>
      <TerminalModeSwitcher
        activeMode={mode}
        modes={BROWSE_MODES}
        onModeChange={handleModeChange}
      />

      {/* Preserve all existing component functionality */}
      <div className={styles.browseContent}>
        {mode === "nodes" ? (
          <EnhancedCategoryTab onNavigate={onNavigate} />
        ) : (
          <EnhancedTagsTab onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}
