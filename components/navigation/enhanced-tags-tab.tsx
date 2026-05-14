"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useNavClick } from "@/hooks/use-nav-click";
import { getPostsByTagNameAction } from "@/lib/actions/navigation-actions";
import type { PostType } from "@/lib/generated/prisma";
import { cn } from "@/lib/utils";
import navStyles from "@/styles/navigation.module.css";
import type { TagWithMetadata } from "@/types/navigation";
import type { PostId } from "@/types/post";
import { useNavigationContext } from "./navigation-context";
import type { PostForNavigation } from "./navigation-shared-components";
import { PostListItem as SharedPostListItem } from "./navigation-shared-components";
import { PostTypeFilterBar } from "./post-type-filter-bar";
import { TagCloud } from "./tag-cloud";

// Define the PostNavItem type locally
interface PostNavItem {
  id: PostId;
  title: string;
  type: PostType;
}

interface EnhancedTagsTabProps {
  onNavigate?: () => void;
}

export function EnhancedTagsTab({ onNavigate }: EnhancedTagsTabProps) {
  const { handleClickId } = useNavClick(onNavigate);
  const {
    selectedPostTypes,
    handleTypeToggle,
    tags,
    postTypeCounts,
    loading,
    error,
  } = useNavigationContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState<"compact" | "normal" | "expanded">(
    "normal"
  );
  const [selectedTag, setSelectedTag] = useState<TagWithMetadata | null>(null);
  const [tagPosts, setTagPosts] = useState<PostNavItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Filter tags by selected post types first
  const typeFilteredTags = React.useMemo(() => {
    if (!tags.length) {
      return tags;
    }

    return tags
      .filter((tag) => {
        // Calculate post count for selected types
        const selectedTypeCount = selectedPostTypes.reduce(
          (sum, type) => sum + (tag.postTypes?.[type] || 0),
          0
        );

        // Only include tags with posts for selected types
        return selectedTypeCount > 0;
      })
      .map((tag) => {
        // Recalculate postCount to reflect only selected types
        const selectedTypeCount = selectedPostTypes.reduce(
          (sum, type) => sum + (tag.postTypes?.[type] || 0),
          0
        );

        return {
          ...tag,
          postCount: selectedTypeCount,
        };
      });
  }, [tags, selectedPostTypes]);

  // Separate date tags from regular tags
  const { dateTags, regularTags } = React.useMemo(() => {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const dates: TagWithMetadata[] = [];
    const regular: TagWithMetadata[] = [];

    typeFilteredTags.forEach((tag) => {
      if (datePattern.test(tag.name)) {
        dates.push(tag);
      } else {
        regular.push(tag);
      }
    });

    // Sort date tags by date (newest first) and take only 10 latest
    dates.sort((a, b) => b.name.localeCompare(a.name));
    const latestDates = dates.slice(0, 10);

    return { dateTags: latestDates, regularTags: regular };
  }, [typeFilteredTags]);

  // Filter and sort tags
  const filteredTags = React.useMemo(() => {
    let filtered = regularTags;

    // Apply search filter to regular tags
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tag) =>
          tag.name.toLowerCase().includes(query) ||
          tag.slug.toLowerCase().includes(query)
      );
    }

    // Sort: selected tags first, then by post count
    return [...filtered].sort((a, b) => {
      const aSelected = selectedTags.has(a.name);
      const bSelected = selectedTags.has(b.name);

      if (aSelected && !bSelected) {
        return -1;
      }
      if (!aSelected && bSelected) {
        return 1;
      }

      return b.postCount - a.postCount;
    });
  }, [regularTags, searchQuery, selectedTags]);

  // Filter date tags based on search
  const _filteredDateTags = React.useMemo(() => {
    if (!searchQuery) {
      return dateTags;
    }

    const query = searchQuery.toLowerCase();
    return dateTags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [dateTags, searchQuery]);

  const handleTagClick = useCallback(
    async (tag: TagWithMetadata) => {
      // Fetch posts for this tag and show a post list
      setSelectedTag(tag);
      setLoadingPosts(true);

      try {
        interface RawPost {
          slug: string;
          title: string;
          type: PostType | string;
        }
        // Fetch posts for this tag filtered by selected types
        const posts = (await getPostsByTagNameAction(
          tag.name,
          selectedPostTypes
        )) as RawPost[];

        const filteredPosts = posts.map((post: RawPost) => ({
          id: post.slug as PostId,
          title: post.title,
          type: post.type as PostType,
        }));

        // Store posts (already filtered by type on server)
        setTagPosts(filteredPosts);
      } catch {
        setTagPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    },
    [selectedPostTypes]
  );

  const handlePostClick = useCallback(
    (post: { id: PostId; title: string; type: PostType; slug: PostId }) => {
      handleClickId(post.id).catch(() => {
        // navigation errors are non-fatal
      });
    },
    [handleClickId]
  );

  // Refetch posts when filter changes while viewing a tag
  useEffect(() => {
    if (selectedTag) {
      // Refetch posts with new filter
      handleTagClick(selectedTag);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedTag, // Refetch posts with new filter
    handleTagClick,
  ]);

  const handleBackToTags = () => {
    setSelectedTag(null);
    setTagPosts([]);
  };

  const handleToggleTag = (tagName: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagName)) {
        next.delete(tagName);
      } else {
        next.add(tagName);
      }
      return next;
    });
  };

  const cycleDensity = () => {
    setDensity((current) => {
      if (current === "compact") {
        return "normal";
      }
      if (current === "normal") {
        return "expanded";
      }
      return "compact";
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="terminal-prompt font-mono text-sm">
          <span className="inline-block animate-pulse">Loading tags...</span>
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

  // Show post list if a tag is selected
  if (selectedTag && !loadingPosts) {
    return (
      <div className="flex h-full flex-col bg-black">
        {/* Post Type Filter - Always visible */}
        <PostTypeFilterBar
          className="mb-2"
          onTypeToggle={handleTypeToggle}
          postTypeCounts={postTypeCounts}
          selectedTypes={selectedPostTypes}
        />

        {/* Header with tag info */}
        <div className="border-white/10 border-b p-3">
          <div className="flex items-center gap-2 font-mono text-white/60 text-xs">
            <span className="terminal-prompt">❯</span>
            <span>~/tags/{selectedTag.slug}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-sm text-white/90">
              #{selectedTag.name}
            </span>
            <span className="text-white/60 text-xs">
              {tagPosts.length} posts
            </span>
          </div>
        </div>

        {/* Prominent Back Button - Below filters */}
        <div className="border-white/10 border-b px-3 py-2">
          <button
            aria-label="Back to all tags"
            className="terminal-interactive w-full border border-white/20 px-3 py-2 text-left font-mono text-sm transition-all hover:border-white/40 hover:bg-white/5"
            onClick={handleBackToTags}
            type="button"
          >
            <span className="mr-2">←</span>
            Back to All Tags
          </button>
        </div>

        {/* Post list */}
        <div className="custom-scrollbar flex-1 overflow-y-auto">
          {tagPosts.length === 0 ? (
            <div className="p-4 text-center text-white/40 text-xs">
              <span className="mb-2 block">∅</span>
              <span>No posts with this tag</span>
            </div>
          ) : (
            <div>
              {tagPosts.map((post: PostNavItem) => (
                <SharedPostListItem
                  key={post.id}
                  onClick={(p: PostForNavigation) =>
                    handlePostClick({
                      id: p.id as PostId,
                      title: p.title,
                      type: p.type as PostType,
                      slug: p.slug as PostId,
                    })
                  }
                  post={{
                    id: post.id,
                    slug: post.id,
                    title: post.title,
                    type: post.type as PostType,
                    lastEdited: new Date(),
                    tags: [],
                    categories: [],
                  }}
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
            aria-label="Search tags"
            className={cn(navStyles.searchInput, "font-mono")}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="search tags..."
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

      {/* Selected Tags */}
      {selectedTags.size > 0 && (
        <div className="border-white/10 border-b p-3">
          <div className="flex flex-wrap gap-2">
            {Array.from(selectedTags).map((tagName) => (
              <button
                className={cn(
                  "px-2 py-1 font-mono text-xs",
                  "terminal-active-item",
                  "transition-colors hover:bg-primary/20",
                  "flex items-center gap-1"
                )}
                key={tagName}
                onClick={() => handleToggleTag(tagName)}
                type="button"
              >
                <span>{tagName}</span>
                <span className="text-white/60">×</span>
              </button>
            ))}
            <button
              className="px-2 py-1 font-mono text-white/40 text-xs hover:text-white/60"
              onClick={() => setSelectedTags(new Set())}
              type="button"
            >
              [clear all]
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="border-white/10 border-b p-3">
        <div className="flex items-center justify-between">
          <span className="text-white/40 text-xs">
            {filteredTags.length} tags
          </span>
          <button
            aria-label="Change tag cloud density"
            className="border border-white/20 px-3 py-1.5 font-mono text-white/60 text-xs transition-all duration-200 hover:border-white/40 hover:text-white/90"
            onClick={cycleDensity}
            type="button"
          >
            [density: {density}]
          </button>
        </div>
      </div>

      {/* Tag Cloud */}
      <div className="min-h-0 flex-1">
        <TagCloud
          density={density}
          onTagClick={handleTagClick}
          showPostTypes={true}
          tags={filteredTags}
        />
      </div>
    </div>
  );
}
