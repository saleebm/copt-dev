"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PostType } from "@/lib/generated/prisma";

// Storage key for localStorage
const STORAGE_KEY = "mobile-nav-state";

// Default state values
const DEFAULT_STATE = {
  activeTab: "latest" as TabId,
  selectedPostTypes: [PostType.BLOG, PostType.CONCRETE] as PostType[],
  browseMode: "nodes" as BrowseMode,
  scrollPositions: {
    topics: 0,
    search: 0,
    reading: 0,
    latest: 0,
  },
  expandedCategories: [] as string[],
  searchQuery: "",
  lastClosedAt: 0,
};

export type TabId = "topics" | "search" | "reading" | "latest";
export type BrowseMode = "nodes" | "index";

// Map legacy tab IDs (session/browse/timeline) to current ones for state migration.
function migrateLegacyTabId(value: unknown): TabId {
  if (
    value === "topics" ||
    value === "search" ||
    value === "reading" ||
    value === "latest"
  ) {
    return value;
  }
  if (value === "browse") {
    return "topics";
  }
  if (value === "session") {
    return "reading";
  }
  if (value === "timeline") {
    return "latest";
  }
  return DEFAULT_STATE.activeTab;
}

export interface MobileNavState {
  activeTab: TabId;
  browseMode: BrowseMode;
  expandedCategories: string[];
  lastClosedAt: number;
  scrollPositions: Record<TabId, number>;
  searchQuery: string;
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
    topics: false,
    search: false,
    reading: false,
    latest: false,
  });

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<MobileNavState> & {
          activeTab?: unknown;
        };
        setState({
          activeTab: migrateLegacyTabId(parsed.activeTab),
          selectedPostTypes:
            parsed.selectedPostTypes && parsed.selectedPostTypes.length > 0
              ? parsed.selectedPostTypes
              : DEFAULT_STATE.selectedPostTypes,
          browseMode: parsed.browseMode || DEFAULT_STATE.browseMode,
          scrollPositions: {
            ...DEFAULT_STATE.scrollPositions,
            ...parsed.scrollPositions,
          },
          expandedCategories:
            parsed.expandedCategories || DEFAULT_STATE.expandedCategories,
          searchQuery: parsed.searchQuery || DEFAULT_STATE.searchQuery,
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

  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setState(DEFAULT_STATE);
    scrollRestorationRef.current = {
      topics: false,
      search: false,
      reading: false,
      latest: false,
    };
  }, []);

  // Clear scroll restoration flags when menu opens
  const onMenuOpen = useCallback(() => {
    scrollRestorationRef.current = {
      topics: false,
      search: false,
      reading: false,
      latest: false,
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

    // Drawer-level search query
    searchQuery: state.searchQuery,
    setSearchQuery,

    // Menu lifecycle
    recordClose,
    onMenuOpen,
    lastClosedAt: state.lastClosedAt,

    // Reset
    resetToDefaults,
  };
}
