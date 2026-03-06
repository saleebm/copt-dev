"use client";

import { useCallback, useEffect, useState } from "react";
import { PostType } from "@/lib/generated/prisma";

const STORAGE_KEY = "nav-content-filter";

// Default to showing only Blog and Concrete posts for a cleaner view
const DEFAULT_TYPES = new Set([PostType.BLOG, PostType.CONCRETE]);

type UseContentFilterReturn = {
  selectedTypes: Set<PostType>;
  setSelectedTypes: (types: Set<PostType>) => void;
  filterPosts: <T extends { type?: PostType | string }>(posts: T[]) => T[];
  isDefaultFilter: boolean;
  resetFilter: () => void;
};

export function useContentFilter(): UseContentFilterReturn {
  const [selectedTypes, setSelectedTypesState] =
    useState<Set<PostType>>(DEFAULT_TYPES);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PostType[];
        setSelectedTypesState(new Set(parsed));
      }
    } catch (_error) {
      // Silently handle localStorage errors
    }
  }, []);

  // Save preferences to localStorage
  const setSelectedTypes = useCallback((types: Set<PostType>) => {
    setSelectedTypesState(types);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(types)));
    } catch (_error) {
      // Silently handle localStorage errors
    }
  }, []);

  // Filter posts based on selected types
  const filterPosts = useCallback(
    <T extends { type?: PostType | string }>(posts: T[]): T[] => {
      return posts.filter((post) => {
        if (!post.type) {
          return true; // Include posts without type
        }
        return selectedTypes.has(post.type as PostType);
      });
    },
    [selectedTypes]
  );

  // Check if using default filter
  const isDefaultFilter =
    selectedTypes.size === 2 &&
    selectedTypes.has(PostType.BLOG) &&
    selectedTypes.has(PostType.CONCRETE);

  // Reset to default filter
  const resetFilter = useCallback(() => {
    setSelectedTypes(DEFAULT_TYPES);
  }, [setSelectedTypes]);

  return {
    selectedTypes,
    setSelectedTypes,
    filterPosts,
    isDefaultFilter,
    resetFilter,
  };
}

// Utility function to count posts by type
export function countPostsByType<T extends { type?: PostType | string }>(
  posts: T[]
): Record<PostType, number> {
  const counts: Partial<Record<PostType, number>> = {};

  for (const post of posts) {
    if (post.type) {
      const type = post.type as PostType;
      counts[type] = (counts[type] || 0) + 1;
    }
  }

  return {
    [PostType.BLOG]: counts[PostType.BLOG] || 0,
    [PostType.CONCRETE]: counts[PostType.CONCRETE] || 0,
    [PostType.FINDING]: counts[PostType.FINDING] || 0,
    [PostType.SIGHT]: counts[PostType.SIGHT] || 0,
  };
}
