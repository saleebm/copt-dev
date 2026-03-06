"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePostStackState } from "@/components/post-stack/post-stack-provider-xstate";
import { useNavClick } from "@/hooks/use-nav-click";
import { getCategoryPosts } from "@/lib/actions/navigation-actions";
import type { PostType } from "@/lib/generated/prisma";
import { cn } from "@/lib/utils";
import navStyles from "@/styles/navigation.module.css";
import type { CategoryNode } from "@/types/navigation";
import type { PostId } from "@/types/post";
import { CategoryBreadcrumbs } from "./category-breadcrumbs";
import { CategoryTree } from "./category-tree";
import { ChildCategoriesPopout } from "./child-categories-popout";
import { useNavigationContext } from "./navigation-context";
import {
  type PostForNavigation,
  PostListItem,
} from "./navigation-shared-components";
import { PostTypeFilterBar } from "./post-type-filter-bar";

type EnhancedCategoryTabProps = {
  onNavigate?: () => void;
};

export function EnhancedCategoryTab({ onNavigate }: EnhancedCategoryTabProps) {
  const { scrollState } = usePostStackState();
  const { handleClickPostObj } = useNavClick(onNavigate);
  const {
    selectedPostTypes,
    handleTypeToggle,
    categories,
    postTypeCounts,
    loading,
    error,
  } = useNavigationContext();
  const shouldCloseOnSettleRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(
    null
  );
  const [categoryPosts, setCategoryPosts] = useState<PostForNavigation[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Filter categories by selected post types first
  const typeFilteredCategories = React.useMemo(() => {
    if (!categories.length) {
      return categories;
    }

    // Recursive filter function to prune categories with no posts for selected types
    const filterByPostType = (node: CategoryNode): CategoryNode | null => {
      // Calculate post count for selected types
      const selectedTypeCount = selectedPostTypes.reduce(
        (sum, type) => sum + (node.postTypes?.[type] || 0),
        0
      );

      // Filter children recursively
      const filteredChildren = node.children
        .map((child) => filterByPostType(child))
        .filter((child) => child !== null) as CategoryNode[];

      // Calculate total count including children
      const childrenCount = filteredChildren.reduce(
        (sum, child) => sum + (child.postCount || 0),
        0
      );
      const totalCount = selectedTypeCount + childrenCount;

      // Include node if it has posts for selected types OR has children with posts
      if (totalCount > 0) {
        return {
          ...node,
          postCount: selectedTypeCount,
          totalPostCount: totalCount,
          children: filteredChildren,
        };
      }

      return null;
    };

    return categories
      .map((cat) => filterByPostType(cat))
      .filter((cat) => cat !== null) as CategoryNode[];
  }, [categories, selectedPostTypes]);

  // Filter categories based on search query
  const filteredCategories = React.useMemo(() => {
    if (!searchQuery) {
      return typeFilteredCategories;
    }

    const query = searchQuery.toLowerCase();

    // Recursive filter function
    const filterNode = (node: CategoryNode): CategoryNode | null => {
      const nameMatches = node.name.toLowerCase().includes(query);
      const pathMatches = node.path.toLowerCase().includes(query);

      // Filter children recursively
      const filteredChildren = node.children
        .map((child) => filterNode(child))
        .filter((child) => child !== null) as CategoryNode[];

      // Include node if it matches or has matching children
      if (nameMatches || pathMatches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    };

    return typeFilteredCategories
      .map((cat) => filterNode(cat))
      .filter((cat) => cat !== null) as CategoryNode[];
  }, [typeFilteredCategories, searchQuery]);

  const handleCategoryClick = useCallback(
    async (category: CategoryNode) => {
      // Always try to fetch posts for this category and its subcategories
      setSelectedCategory(category);
      setLoadingPosts(true);

      try {
        // Convert category path to array for hierarchical matching
        const categoryPath = category.path.split("/");

        type RawPost = {
          slug: string;
          type: PostType | string;
          title: string;
          lastEdited?: Date;
          createdAt?: Date;
          tags?: Array<{ name: string }>;
          categories?: Array<{ name: string }>;
        };

        // Fetch posts for this category filtered by selected types
        const posts = (await getCategoryPosts(
          categoryPath,
          selectedPostTypes
        )) as RawPost[];

        const filteredPosts = posts.map((post: RawPost) => ({
          id: post.slug as PostId,
          slug: post.slug as PostId,
          title: post.title,
          type: post.type as PostType,
          lastEdited: post.lastEdited || post.createdAt || new Date(),
          tags: post.tags?.map((t) => ({ name: t.name })) || [],
          categories: post.categories?.map((c) => ({ name: c.name })) || [],
        }));

        // Store posts (already filtered by type on server)
        setCategoryPosts(filteredPosts);
      } catch (_err) {
        setCategoryPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    },
    [selectedPostTypes]
  );

  const handlePostClick = useCallback(
    (post: PostForNavigation) => {
      // Mark that we want to close after scroll settles
      shouldCloseOnSettleRef.current = true;
      // Delegate to unified nav click flow (handles add + settle alignment)
      handleClickPostObj({ id: post.id as PostId }).catch(() => {
        // Silently handle navigation errors
      });
      // DO NOT call onNavigate() here - that causes the race!
    },
    [handleClickPostObj]
  );

  // Defer panel close until scroll settles to avoid race condition
  useEffect(() => {
    if (scrollState === "settling" && shouldCloseOnSettleRef.current) {
      onNavigate?.(); // NOW it's safe to close
      shouldCloseOnSettleRef.current = false;
    }
  }, [scrollState, onNavigate]);

  // Refetch posts when filter changes while viewing a category
  useEffect(() => {
    if (selectedCategory) {
      // Refetch posts with new filter
      handleCategoryClick(selectedCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCategory, // Refetch posts with new filter
    handleCategoryClick,
  ]);

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setCategoryPosts([]);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="terminal-prompt font-mono text-sm">
          <span className="inline-block animate-pulse">
            Loading navigation...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="terminal-error font-mono text-sm">
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  // Show post list if a category is selected
  if (selectedCategory && !loadingPosts) {
    return (
      <div className="flex h-full flex-col bg-black">
        {/* Post Type Filter - Always visible */}
        <PostTypeFilterBar
          className="mb-2"
          onTypeToggle={handleTypeToggle}
          postTypeCounts={postTypeCounts}
          selectedTypes={selectedPostTypes}
        />

        {/* Breadcrumb Navigation */}
        <div className="border-white/10 border-b p-3">
          <CategoryBreadcrumbs
            category={selectedCategory}
            onNavigate={(cat) => {
              if (cat) {
                handleCategoryClick(cat);
              } else {
                handleBackToCategories();
              }
            }}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-white/60 text-xs">
              {categoryPosts.length} posts
            </span>
            {selectedCategory.children &&
              selectedCategory.children.length > 0 && (
                <ChildCategoriesPopout
                  category={selectedCategory}
                  onCategoryClick={handleCategoryClick}
                  selectedPostTypes={selectedPostTypes}
                />
              )}
          </div>
        </div>

        {/* Prominent Back Button - Below filters */}
        <div className="border-white/10 border-b px-3 py-2">
          <button
            aria-label="Back to all categories"
            className="terminal-interactive w-full border border-white/20 px-3 py-2 text-left font-mono text-sm transition-all hover:border-white/40 hover:bg-white/5"
            onClick={handleBackToCategories}
            type="button"
          >
            <span className="mr-2">←</span>
            Back to All Categories
          </button>
        </div>

        {/* Post list */}
        <div className="custom-scrollbar flex-1 overflow-y-auto">
          {categoryPosts.length === 0 ? (
            <div className="p-4 text-center text-white/40 text-xs">
              <span className="mb-2 block">∅</span>
              <span>No posts in this category</span>
            </div>
          ) : (
            <div>
              {categoryPosts.map((post) => (
                <PostListItem
                  key={post.id}
                  onClick={handlePostClick}
                  post={post}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loadingPosts) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="terminal-prompt font-mono text-sm">
          <span className="inline-block animate-pulse">Loading posts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-black">
      {/* Post Type Filter - Always visible */}
      <PostTypeFilterBar
        className="mb-2"
        onTypeToggle={handleTypeToggle}
        postTypeCounts={postTypeCounts}
        selectedTypes={selectedPostTypes}
      />

      {/* Search Bar */}
      <div className={cn(navStyles.navHeader)}>
        <div className="flex items-center gap-2">
          <span className="terminal-prompt text-sm">❯</span>
          <input
            aria-label="Search topics"
            className={cn(navStyles.searchInput, "font-mono")}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="search topics..."
            type="text"
            value={searchQuery}
          />
          {searchQuery && (
            <button
              aria-label="Clear search"
              className="text-white/40 text-xs hover:text-white/60"
              onClick={() => setSearchQuery("")}
              type="button"
            >
              [clear]
            </button>
          )}
        </div>
      </div>

      {/* Category Tree */}
      <div className="flex-1 overflow-hidden">
        <CategoryTree
          categories={filteredCategories}
          onCategoryClick={handleCategoryClick}
        />
      </div>
    </div>
  );
}
