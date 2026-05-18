"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useNavigationContext } from "@/components/navigation/navigation-context";
import { PostListItem } from "@/components/navigation/navigation-shared-components";
import { usePostStackState } from "@/components/post-stack/post-stack-provider-xstate";
import type { useMobileNavigationState } from "@/hooks/use-mobile-navigation-state";
import { useNavClick } from "@/hooks/use-nav-click";
import type { PostType } from "@/lib/generated/prisma";
import { cn } from "@/lib/utils";
import navStyles from "@/styles/navigation.module.css";
import type { CategoryNode, TagWithMetadata } from "@/types/navigation";
import type { PostId } from "@/types/post";

interface SearchSectionProps {
  navState?: ReturnType<typeof useMobileNavigationState>;
  onNavigate?: () => void;
}

interface PostMatch {
  id: PostId;
  lastEdited: Date;
  matchedIn: "title" | "tag" | "category";
  matchedTerm: string;
  title: string;
  type: PostType;
}

const MAX_POSTS = 30;
const MAX_TOPICS = 10;
const MAX_TAGS = 15;

function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  const walk = (list: CategoryNode[]) => {
    for (const node of list) {
      out.push(node);
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return out;
}

export function SearchSection({ navState, onNavigate }: SearchSectionProps) {
  const { handleClickId } = useNavClick(onNavigate);
  const { categories, tags } = useNavigationContext();
  const { timeline } = usePostStackState();

  const [localQuery, setLocalQuery] = useState(navState?.searchQuery ?? "");
  const query = navState?.searchQuery ?? localQuery;
  const setQuery = (next: string) => {
    setLocalQuery(next);
    navState?.setSearchQuery(next);
  };
  const deferredQuery = useDeferredValue(query);
  const trimmed = deferredQuery.trim().toLowerCase();

  const flatCategories = useMemo(
    () => flattenCategories(categories),
    [categories]
  );

  const allPosts = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{
      id: string;
      title: string;
      type: string;
      lastEdited?: Date;
    }> = [];
    for (const entry of timeline) {
      for (const post of entry.posts) {
        const id = post.originalId || post.id;
        if (seen.has(id)) {
          continue;
        }
        seen.add(id);
        list.push({
          id,
          title: post.title,
          type: post.type ?? "BLOG",
          lastEdited: post.lastEdited ?? entry.date,
        });
      }
    }
    return list;
  }, [timeline]);

  const results = useMemo(() => {
    if (!trimmed) {
      return {
        posts: [] as PostMatch[],
        topics: [] as CategoryNode[],
        tags: [] as TagWithMetadata[],
      };
    }

    const titleMatches = new Map<string, PostMatch>();
    for (const post of allPosts) {
      if (post.title.toLowerCase().includes(trimmed)) {
        titleMatches.set(post.id, {
          id: post.id as PostId,
          title: post.title,
          type: post.type as PostType,
          lastEdited: post.lastEdited ?? new Date(),
          matchedIn: "title",
          matchedTerm: post.title,
        });
      }
    }

    const matchedTags = tags
      .filter(
        (tag) =>
          tag.name.toLowerCase().includes(trimmed) ||
          tag.slug.toLowerCase().includes(trimmed)
      )
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, MAX_TAGS);

    const matchedTopics = flatCategories
      .filter((node) => {
        const display = (node.displayName || node.name).toLowerCase();
        return (
          display.includes(trimmed) || node.path.toLowerCase().includes(trimmed)
        );
      })
      .sort((a, b) => b.totalPostCount - a.totalPostCount)
      .slice(0, MAX_TOPICS);

    const posts = Array.from(titleMatches.values())
      .sort(
        (a, b) =>
          (b.lastEdited?.getTime() ?? 0) - (a.lastEdited?.getTime() ?? 0)
      )
      .slice(0, MAX_POSTS);

    return { posts, topics: matchedTopics, tags: matchedTags };
  }, [trimmed, allPosts, tags, flatCategories]);

  const totalCount =
    results.posts.length + results.topics.length + results.tags.length;

  return (
    <div className="flex h-full flex-col bg-black">
      {/* Search input */}
      <div className={cn(navStyles.navHeader)}>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="terminal-prompt text-sm">
            ❯
          </span>
          <input
            aria-label="Search posts, topics, and tags"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className={cn(
              navStyles.searchInput,
              "min-h-[44px] flex-1 font-mono text-sm"
            )}
            inputMode="search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="search posts, topics, tags..."
            type="search"
            value={query}
          />
          {query && (
            <button
              aria-label="Clear search"
              className="min-h-[44px] px-2 font-mono text-white/40 text-xs hover:text-white/60"
              onClick={() => setQuery("")}
              type="button"
            >
              [clear]
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!trimmed && (
          <div className="p-6 text-center text-white/50 text-xs">
            <p className="mb-1 font-mono">
              Search across posts, topics, and tags.
            </p>
            <p className="font-mono text-white/30">
              Try "ai", "writing", or a tag name.
            </p>
          </div>
        )}
        {trimmed && totalCount === 0 && (
          <div className="p-6 text-center text-white/50 text-xs">
            <span className="mb-2 block">∅</span>
            <span className="font-mono">No matches for "{deferredQuery}"</span>
          </div>
        )}
        {trimmed && totalCount > 0 && (
          <>
            {results.posts.length > 0 && (
              <section>
                <SectionHeader label={`Posts (${results.posts.length})`} />
                <div>
                  {results.posts.map((post) => (
                    <PostListItem
                      key={post.id}
                      onClick={(p) => {
                        handleClickId(p.id as PostId).catch(() => {
                          // navigation errors are non-fatal
                        });
                      }}
                      post={{
                        id: post.id,
                        slug: post.id,
                        title: post.title,
                        type: post.type,
                        lastEdited: post.lastEdited,
                        tags: [],
                        categories: [],
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {results.topics.length > 0 && (
              <section>
                <SectionHeader label={`Topics (${results.topics.length})`} />
                <ul className="divide-y divide-white/5">
                  {results.topics.map((topic) => (
                    <li key={topic.path}>
                      <button
                        className="flex min-h-[44px] w-full items-center justify-between px-3 py-2 text-left font-mono text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                        onClick={() => {
                          navState?.setActiveTab("topics");
                          onNavigate?.();
                        }}
                        type="button"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">
                            {topic.displayName || topic.name}
                          </span>
                          <span className="truncate text-white/40 text-xs">
                            {topic.path}
                          </span>
                        </span>
                        <span className="ml-2 flex-shrink-0 text-white/50 text-xs">
                          {topic.totalPostCount} posts
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {results.tags.length > 0 && (
              <section>
                <SectionHeader label={`Tags (${results.tags.length})`} />
                <div className="flex flex-wrap gap-2 p-3">
                  {results.tags.map((tag) => (
                    <button
                      className="min-h-[44px] border border-white/20 px-3 py-2 font-mono text-white/80 text-xs transition-colors hover:border-white/40 hover:text-white"
                      key={tag.id}
                      onClick={() => {
                        navState?.setActiveTab("topics");
                        onNavigate?.();
                      }}
                      type="button"
                    >
                      #{tag.name}
                      <span className="ml-1 text-white/40">
                        {tag.postCount}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="sticky top-0 border-white/10 border-b bg-black px-3 py-2 font-mono text-white/40 text-xs uppercase tracking-wider">
      {label}
    </div>
  );
}
