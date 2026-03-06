"use client";

import { RabbitholeTrackTab } from "@/components/navigation/rabbithole-track-tab";
import type { useMobileNavigationState } from "@/hooks/use-mobile-navigation-state";
import styles from "@/styles/navigation.module.css";

type SessionSectionProps = {
  onNavigate?: () => void;
  navState?: ReturnType<typeof useMobileNavigationState>;
};

/**
 * SESSION section wrapper for the vertical accordion
 * Preserves all existing RabbitholeTrackTab functionality and state management
 */
export function SessionSection({
  onNavigate,
}: Omit<SessionSectionProps, "navState"> = {}) {
  return (
    <div className={styles.sessionSectionWrapper}>
      {/* Preserve all existing functionality by using the component as-is */}
      <RabbitholeTrackTab onNavigate={onNavigate} />
    </div>
  );
}
