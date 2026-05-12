"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePostStackState } from "@/components/post-stack/post-stack-provider-xstate";
import { useNavClick } from "@/hooks/use-nav-click";
import { PostType } from "@/lib/generated/prisma";
import { cn } from "@/lib/utils";
import type { PostId } from "@/types/post";
import { useNavigationContext } from "./navigation-context";
import {
  type PostForNavigation,
  PostListItem,
} from "./navigation-shared-components";

interface TimelineTabProps {
  onNavigate?: () => void;
}

interface TimelineEntry {
  date: Date;
  formattedDate: string;
  monthKey: string;
  posts: Array<{
    id: string;
    title: string;
    type?: string;
    lastEdited?: Date;
    originalId: string;
  }>;
}

export function TimelineTab({ onNavigate }: TimelineTabProps) {
  const { timeline } = usePostStackState();
  const { handleClickId } = useNavClick(onNavigate);
  const { selectedPostTypes } = useNavigationContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Combine ALL posts into a unified timeline structure
  const unifiedTimeline = useMemo(() => {
    const timelineMap = new Map<string, TimelineEntry>();

    // Add all timeline posts (already filtered at server level)
    timeline.forEach((entry) => {
      const monthKey = entry.monthKey;
      if (!timelineMap.has(monthKey)) {
        timelineMap.set(monthKey, {
          date: entry.date,
          posts: [],
          formattedDate: entry.formattedDate,
          monthKey: entry.monthKey,
        });
      }
      // Filter posts by selected types
      const filteredPosts = entry.posts.filter(
        (post) =>
          !post.type || selectedPostTypes.includes(post.type as PostType)
      );
      timelineMap.get(monthKey)?.posts.push(...filteredPosts);
    });

    // Note: Individual findings/sights are already excluded at the server level
    // We only get grouped daily posts (findings-YYYY-MM-DD and sights-YYYY-MM-DD)

    // Sort and filter based on search
    const sortedEntries = Array.from(timelineMap.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );

    if (searchQuery) {
      // Filter posts within each month based on search
      return sortedEntries
        .map((entry) => ({
          ...entry,
          posts: entry.posts.filter(
            (post) =>
              post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              entry.formattedDate
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((entry) => entry.posts.length > 0);
    }

    return sortedEntries;
  }, [timeline, searchQuery, selectedPostTypes]);

  // Generate month jump list for quick navigation
  const monthJumpList = useMemo(
    () =>
      unifiedTimeline.map((entry) => ({
        key: entry.monthKey,
        label: entry.formattedDate,
        count: entry.posts.length,
      })),
    [unifiedTimeline]
  );

  // Calculate total posts
  const totalPosts = useMemo(
    () =>
      unifiedTimeline.reduce((total, entry) => total + entry.posts.length, 0),
    [unifiedTimeline]
  );

  const handlePostClick = useCallback(
    async (post: PostForNavigation) => {
      await handleClickId(post.id as PostId);
    },
    [handleClickId]
  );

  // Jump to month functionality
  const jumpToMonth = useCallback((monthKey: string) => {
    setSelectedMonth(monthKey);
    // Scroll to the month in the timeline
    const element = document.getElementById(`timeline-month-${monthKey}`);
    if (element && scrollAreaRef.current) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div className="flex h-full flex-col bg-black">
      {/* Search Bar */}
      <div className="border-white/10 border-b p-3">
        <div className="flex items-center gap-2">
          <span className="terminal-prompt text-sm">❯</span>
          <input
            aria-label="Search timeline"
            className={cn(
              "flex-1 bg-transparent font-mono text-sm text-white/90",
              "placeholder-white/40 outline-none",
              "border-border border-b transition-colors focus:border-primary/50"
            )}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="search timeline..."
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

      {/* Stats and Controls */}
      <div className="border-white/10 border-b p-3">
        <div className="flex items-center justify-between">
          <span className="text-white/40 text-xs">
            {searchQuery ? (
              <>
                {totalPosts} matching {totalPosts === 1 ? "entry" : "entries"}
              </>
            ) : (
              <>
                {totalPosts} {totalPosts === 1 ? "entry" : "entries"} •{" "}
                {monthJumpList.length}{" "}
                {monthJumpList.length === 1 ? "month" : "months"}
              </>
            )}
          </span>
          {monthJumpList.length > 5 && !searchQuery && (
            <button
              className="font-mono text-white/40 text-xs hover:text-white/60"
              onClick={() => setSelectedMonth(null)}
              type="button"
            >
              [jump to month ▼]
            </button>
          )}
        </div>

        {/* Month Quick Jump */}
        {monthJumpList.length > 5 && !searchQuery && selectedMonth === null && (
          <div className="mt-2 flex flex-wrap gap-1">
            {monthJumpList.slice(0, 6).map((month) => (
              <button
                className={cn(
                  "px-2 py-0.5 font-mono text-xs",
                  "text-white/40 hover:bg-white/10 hover:text-white/60",
                  "border border-white/20 hover:border-white/40",
                  "transition-all duration-200"
                )}
                key={month.key}
                onClick={() => jumpToMonth(month.key)}
                type="button"
              >
                {month.label.slice(0, 3)} ({month.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timeline Content */}
      <div
        className="custom-scrollbar flex-1 overflow-y-auto"
        ref={scrollAreaRef}
      >
        {unifiedTimeline.length > 0 ? (
          <div className="space-y-4 p-4">
            {unifiedTimeline.map((entry) => (
              <div
                className="space-y-2"
                id={`timeline-month-${entry.monthKey}`}
                key={entry.monthKey}
              >
                {/* Month Header */}
                <div className="mb-2 flex items-center gap-2 text-white/40 text-xs">
                  <span className="terminal-prompt">▶</span>
                  <span className="font-mono uppercase">
                    {entry.formattedDate}
                  </span>
                  <span className="text-white/30">({entry.posts.length})</span>
                </div>

                {/* Posts in Month */}
                <div className="space-y-1">
                  {entry.posts.map((post, _index) => {
                    const postForNavigation: PostForNavigation = {
                      id: post.originalId,
                      slug: post.originalId,
                      title: post.title,
                      type: (post.type as PostType) || PostType.BLOG,
                      lastEdited: post.lastEdited || new Date(),
                      tags: [],
                      categories: [],
                    };

                    return (
                      <PostListItem
                        key={`${entry.monthKey}-${post.id}`}
                        onClick={handlePostClick}
                        post={postForNavigation}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-white/40 text-xs">
            <span className="mb-2 block">∅</span>
            <span>
              {searchQuery
                ? `No posts matching "${searchQuery}"`
                : "No timeline entries"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
