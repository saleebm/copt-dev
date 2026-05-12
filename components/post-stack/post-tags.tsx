"use client";
import { ChevronDownIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { usePostStackActions } from "@/components/post-stack/post-stack-provider-xstate";
import {
  getPostsByTagNameAction,
  getRelatedPostCountsByTagsAction,
} from "@/lib/actions/navigation-actions";
import {
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/animations";
import type { PostType } from "@/lib/generated/prisma";

interface PostTagsProps {
  postId: string;
  tags: string[];
}

interface RelatedPost {
  lastEdited: Date;
  slug: string;
  title: string;
  type: PostType;
}

interface DropdownPosition {
  left: number;
  top: number;
  width: number;
}

export function PostTags({ tags, postId }: PostTagsProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [isPending, startTransition] = useTransition();
  const [relatedCounts, setRelatedCounts] = useState<Record<
    string,
    number
  > | null>(null);
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { addPost } = usePostStackActions();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const nonEmpty = tags.filter((t) => t.trim().length > 0);

    if (nonEmpty.length === 0) {
      setRelatedCounts({});
      return;
    }

    (async () => {
      try {
        const counts = await getRelatedPostCountsByTagsAction(nonEmpty, postId);
        if (!cancelled) {
          setRelatedCounts(counts);
        }
      } catch {
        if (!cancelled) {
          setRelatedCounts({});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tags, postId]);

  const closeDropdown = useCallback(() => {
    setActiveTag(null);
    setRelatedPosts([]);
    setDropdownPos(null);
  }, []);

  // Close on scroll/resize so the popover doesn't drift away from its trigger.
  useEffect(() => {
    if (!activeTag) {
      return;
    }
    window.addEventListener("scroll", closeDropdown, true);
    window.addEventListener("resize", closeDropdown);
    return () => {
      window.removeEventListener("scroll", closeDropdown, true);
      window.removeEventListener("resize", closeDropdown);
    };
  }, [activeTag, closeDropdown]);

  const handleTagClick = (tagName: string) => {
    if (activeTag === tagName) {
      closeDropdown();
      return;
    }

    const trigger = buttonRefs.current[tagName];
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }

    setActiveTag(tagName);

    startTransition(async () => {
      try {
        const posts = await getPostsByTagNameAction(tagName);
        const filteredPosts = posts
          .filter((post: { slug: string }) => post.slug !== postId)
          .map(
            (post: {
              slug: string;
              title: string;
              type: PostType;
              lastEdited: Date;
            }) => ({
              slug: post.slug,
              title: post.title,
              type: post.type,
              lastEdited: post.lastEdited,
            })
          );
        setRelatedPosts(filteredPosts);
      } catch {
        setRelatedPosts([]);
      }
    });
  };

  const handlePostSelect = (postSlug: string) => {
    addPost(postSlug);
    closeDropdown();
  };

  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <>
      <motion.div
        className="relative mt-3 flex flex-wrap gap-2"
        onClick={(e) => e.stopPropagation()}
        variants={staggerContainerVariants}
      >
        {tags.map((tag) => {
          // Hydration-safe disabled state: only disabled once we KNOW the tag
          // has zero related posts. While counts are still loading (relatedCounts
          // === null on both server and first client render), tags stay enabled
          // so SSR and client agree.
          const trimmed = tag.trim();
          const isEmptyTag =
            trimmed.length === 0 ||
            (relatedCounts !== null && (relatedCounts[tag] ?? 0) === 0);
          const isDisabled = isPending || isEmptyTag;
          const isActive = activeTag === tag;

          return (
            <motion.div
              className="relative"
              key={tag}
              variants={staggerItemVariants}
            >
              <motion.button
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-mono text-xs transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                disabled={isDisabled}
                onClick={() => handleTagClick(tag)}
                ref={(el) => {
                  buttonRefs.current[tag] = el;
                }}
                whileHover={isDisabled ? undefined : { scale: 1.05 }}
                whileTap={isDisabled ? undefined : { scale: 0.95 }}
              >
                <span>{tag}</span>
                <ChevronDownIcon
                  className={`h-3 w-3 transition-transform duration-200 ${
                    isActive ? "rotate-180" : ""
                  }`}
                />
              </motion.button>
            </motion.div>
          );
        })}
      </motion.div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {activeTag && dropdownPos && (
              <>
                {/* Backdrop — solid hit target, lets clicks outside close. */}
                <motion.div
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 z-[9998]"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  onClick={closeDropdown}
                />

                {/* Terminal popover — solid bg, mono, soft phosphor glow. */}
                <motion.div
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent fixed z-[9999] max-h-72 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-sm border border-primary/40 bg-popover font-mono shadow-[0_0_24px_-4px_hsl(var(--primary)/0.25),0_12px_32px_-8px_rgba(0,0,0,0.75)]"
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    top: `${dropdownPos.top}px`,
                    left: `${dropdownPos.left}px`,
                  }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex items-center gap-2 border-primary/20 border-b bg-primary/[0.04] px-3 py-2 text-[0.7rem] text-primary/70 uppercase tracking-wider">
                    <span aria-hidden="true" className="text-primary/80">
                      ❯
                    </span>
                    <span className="truncate">
                      ./related --tag={activeTag}
                    </span>
                  </div>

                  {isPending && (
                    <div className="px-3 py-4 text-center text-primary/50 text-xs">
                      <span className="animate-pulse">scanning corpus…</span>
                    </div>
                  )}

                  {!isPending && relatedPosts.length === 0 && (
                    <div className="px-3 py-4 text-center text-muted-foreground text-xs">
                      no other posts under &ldquo;{activeTag}&rdquo;
                    </div>
                  )}

                  {!isPending && relatedPosts.length > 0 && (
                    <ul className="py-1">
                      {relatedPosts.map((post) => (
                        <li key={post.slug}>
                          <button
                            className="group flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-primary/75 text-sm transition-colors duration-150 hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary focus-visible:outline-none"
                            onClick={() => handlePostSelect(post.slug)}
                            type="button"
                          >
                            <span
                              aria-hidden="true"
                              className="text-primary/40 transition-colors duration-150 group-hover:text-primary"
                            >
                              ❯
                            </span>
                            <span className="flex-1 truncate">
                              {post.title}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
