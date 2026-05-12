"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PostType } from "@/lib/generated/prisma";

// Storage key for localStorage
const STORAGE_KEY = "mobile-nav-state";

// Default state values
const DEFAULT_STATE = {
  activeTab: "session" as TabId,
  selectedPostTypes: [PostType.BLOG, PostType.CONCRETE] as PostType[],
  browseMode: "nodes" as BrowseMode,
  scrollPositions: {
    session: 0,
    browse: 0,
    timeline: 0,
  },
  expandedCategories: [] as string[],
  lastClosedAt: 0,
};

export type TabId = "session" | "browse" | "timeline";
export type BrowseMode = "nodes" | "index";

export interface MobileNavState {
  activeTab: TabId;
  browseMode: BrowseMode;
  expandedCategories: string[];
  lastClosedAt: number;
  scrollPositions: Record<TabId, number>;
  selectedPostTypes: PostType[];
}

/**
 * Hook for managing and persisting mobile navigation state
 * Handles tab selection, filters, scroll positions, and expansion states
 */
export function useMobileNavigationState() {
  const [state, setState] = useState<MobileNavState>(DEFAULT_STATE);
  const [isRestored, setIsRestored] = useState(false);
  const scrollRestorationRef = useRef<Record<TabId, boolean>>({
    session: false,
    browse: false,
    timeline: false,
  });

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as MobileNavState;
        // Validate and merge with defaults to handle missing fields
        setState({
          activeTab: parsed.activeTab || DEFAULT_STATE.activeTab,
          selectedPostTypes:
            parsed.selectedPostTypes?.length > 0
              ? parsed.selectedPostTypes
              : DEFAULT_STATE.selectedPostTypes,
          browseMode: parsed.browseMode || DEFAULT_STATE.browseMode,
          scrollPositions: {
            ...DEFAULT_STATE.scrollPositions,
            ...parsed.scrollPositions,
          },
          expandedCategories:
            parsed.expandedCategories || DEFAULT_STATE.expandedCategories,
          lastClosedAt: parsed.lastClosedAt || 0,
        });
      }
    } catch {
      // Silently handle localStorage errors
    } finally {
      setIsRestored(true);
    }
  }, []);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (!isRestored) {
      return; // Don't save until initial load is complete
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Silently handle localStorage errors
    }
  }, [state, isRestored]);

  // Update active tab
  const setActiveTab = useCallback((tab: TabId) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  // Update selected post types
  const setSelectedPostTypes = useCallback((types: PostType[]) => {
    setState((prev) => ({ ...prev, selectedPostTypes: types }));
  }, []);

  // Toggle post type filter
  const togglePostType = useCallback((type: PostType) => {
    setState((prev) => {
      const current = prev.selectedPostTypes;
      if (current.includes(type)) {
        // Don't allow deselecting all types
        const newTypes = current.filter((t) => t !== type);
        return newTypes.length > 0
          ? { ...prev, selectedPostTypes: newTypes }
          : prev;
      }
      return { ...prev, selectedPostTypes: [...current, type] };
    });
  }, []);

  // Update browse mode
  const setBrowseMode = useCallback((mode: BrowseMode) => {
    setState((prev) => ({ ...prev, browseMode: mode }));
  }, []);

  // Save scroll position for a tab
  const saveScrollPosition = useCallback((tab: TabId, position: number) => {
    setState((prev) => ({
      ...prev,
      scrollPositions: {
        ...prev.scrollPositions,
        [tab]: position,
      },
    }));
  }, []);

  // Get scroll position for a tab
  const getScrollPosition = useCallback(
    (tab: TabId): number => state.scrollPositions[tab] || 0,
    [state.scrollPositions]
  );

  // Check if scroll has been restored for a tab
  const isScrollRestored = useCallback(
    (tab: TabId): boolean => scrollRestorationRef.current[tab],
    []
  );

  // Mark scroll as restored for a tab
  const markScrollRestored = useCallback((tab: TabId) => {
    scrollRestorationRef.current[tab] = true;
  }, []);

  // Toggle category expansion
  const toggleCategoryExpansion = useCallback((categoryPath: string) => {
    setState((prev) => {
      const expanded = prev.expandedCategories;
      if (expanded.includes(categoryPath)) {
        return {
          ...prev,
          expandedCategories: expanded.filter((p) => p !== categoryPath),
        };
      }
      return {
        ...prev,
        expandedCategories: [...expanded, categoryPath],
      };
    });
  }, []);

  // Check if category is expanded
  const isCategoryExpanded = useCallback(
    (categoryPath: string): boolean =>
      state.expandedCategories.includes(categoryPath),
    [state.expandedCategories]
  );

  // Record menu close time
  const recordClose = useCallback(() => {
    setState((prev) => ({ ...prev, lastClosedAt: Date.now() }));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setState(DEFAULT_STATE);
    scrollRestorationRef.current = {
      session: false,
      browse: false,
      timeline: false,
    };
  }, []);

  // Clear scroll restoration flags when menu opens
  const onMenuOpen = useCallback(() => {
    scrollRestorationRef.current = {
      session: false,
      browse: false,
      timeline: false,
    };
  }, []);

  return {
    // State
    state,
    isRestored,

    // Tab management
    activeTab: state.activeTab,
    setActiveTab,

    // Post type filters
    selectedPostTypes: state.selectedPostTypes,
    setSelectedPostTypes,
    togglePostType,

    // Browse mode
    browseMode: state.browseMode,
    setBrowseMode,

    // Scroll position management
    saveScrollPosition,
    getScrollPosition,
    isScrollRestored,
    markScrollRestored,

    // Category expansion
    toggleCategoryExpansion,
    isCategoryExpanded,
    expandedCategories: state.expandedCategories,

    // Menu lifecycle
    recordClose,
    onMenuOpen,
    lastClosedAt: state.lastClosedAt,

    // Reset
    resetToDefaults,
  };
}
