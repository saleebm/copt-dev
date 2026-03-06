"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { PostType } from "@/lib/generated/prisma";
import type {
  CategoryNode,
  PostTypeCount,
  TagWithMetadata,
} from "@/types/navigation";

type NavigationProviderProps = {
  children: ReactNode;
  // Server-provided navigation data
  categories: CategoryNode[];
  tags: TagWithMetadata[];
  postTypeCounts: PostTypeCount[];
};

type NavigationContextType = {
  selectedPostTypes: PostType[];
  setSelectedPostTypes: (types: PostType[]) => void;
  handleTypeToggle: (type: PostType) => void;
  resetToDefaults: () => void;
  // Server-provided navigation data (no loading needed)
  categories: CategoryNode[];
  tags: TagWithMetadata[];
  postTypeCounts: PostTypeCount[];
  // Loading states (always false since data comes from server)
  loading: boolean;
  error: string | null;
};

// Default filters: Exclude AI-generated types from main tabs per segregation rules
const DEFAULT_POST_TYPES: PostType[] = [PostType.BLOG, PostType.CONCRETE];

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

/**
 * NavigationProvider
 *
 * Accepts pre-fetched navigation data from the server and provides it to navigation components.
 * This eliminates client-side data fetching and enables instant category/tag display.
 *
 * The navigation data (categories, tags, postTypeCounts) is fetched server-side in
 * post-stack-data-fetcher.tsx for optimal performance and PPR compatibility.
 */
export function NavigationProvider({
  children,
  categories,
  tags,
  postTypeCounts,
}: NavigationProviderProps) {
  const [selectedPostTypes, setSelectedPostTypes] =
    useState<PostType[]>(DEFAULT_POST_TYPES);

  const handleTypeToggle = useCallback((type: PostType) => {
    setSelectedPostTypes((prev) => {
      if (prev.includes(type)) {
        // Don't allow deselecting all types
        const newTypes = prev.filter((t) => t !== type);
        return newTypes.length > 0 ? newTypes : prev;
      }
      return [...prev, type];
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setSelectedPostTypes(DEFAULT_POST_TYPES);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        selectedPostTypes,
        setSelectedPostTypes,
        handleTypeToggle,
        resetToDefaults,
        categories,
        tags,
        postTypeCounts,
        loading: false, // No loading needed - data comes from server
        error: null, // No errors possible - server handles fetching
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error(
      "useNavigationContext must be used within a NavigationProvider"
    );
  }
  return context;
}
