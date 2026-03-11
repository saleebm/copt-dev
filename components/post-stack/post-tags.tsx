"use client";
import { ChevronDownIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { usePostStackActions } from "@/components/post-stack/post-stack-provider-xstate";
import { getPostsByTagNameAction } from "@/lib/actions/navigation-actions";
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

export function PostTags({ tags, postId }: PostTagsProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [isPending, startTransition] = useTransition();
  const { addPost } = usePostStackActions();

  const handleTagClick = (tagName: string) => {
    if (activeTag === tagName) {
      // Close dropdown if clicking the same tag
      setActiveTag(null);
      setRelatedPosts([]);
      return;
    }

    setActiveTag(tagName);

    startTransition(async () => {
      try {
        const posts = await getPostsByTagNameAction(tagName);
        // Filter out the current post from related posts
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
      } catch (_error) {
        setRelatedPosts([]);
      }
    });
  };

  const handlePostSelect = (postSlug: string) => {
    addPost(postSlug);
    setActiveTag(null);
    setRelatedPosts([]);
  };

  const handleClickOutside = () => {
    setActiveTag(null);
    setRelatedPosts([]);
  };

  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="relative mt-3 flex flex-wrap gap-2"
      onClick={(e) => e.stopPropagation()}
      variants={staggerContainerVariants}
    >
      {tags.map((tag, _index) => (
        <motion.div
          className="relative"
          key={tag}
          variants={staggerItemVariants}
        >
          <motion.button
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-mono text-xs transition-all duration-200 ${
              activeTag === tag
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground"
            }
            `}
            disabled={isPending}
            onClick={() => handleTagClick(tag)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>{tag}</span>
            <ChevronDownIcon
              className={`h-3 w-3 transition-transform duration-200 ${
                activeTag === tag ? "rotate-180" : ""
              }`}
            />
          </motion.button>

          <AnimatePresence>
            {activeTag === tag && (
              <>
                {/* Backdrop to handle clicks outside */}
                <motion.div
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 z-40"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  onClick={handleClickOutside}
                />

                {/* Dropdown menu */}
                <motion.div
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent absolute top-full left-0 z-50 mt-2 max-h-64 w-80 overflow-y-auto rounded-md border border-border bg-popover shadow-lg"
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  {(() => {
                    if (isPending) {
                      return (
                        <div className="p-4 text-center font-mono text-muted-foreground text-sm">
                          Loading related posts...
                        </div>
                      );
                    }
                    if (relatedPosts.length > 0) {
                      return (
                        <div className="p-2">
                          <div className="mb-2 px-2 font-mono text-muted-foreground text-xs">
                            Related posts with &ldquo;{tag}&rdquo;:
                          </div>
                          {relatedPosts.map((post) => (
                            <motion.button
                              className="group w-full rounded p-2 text-left font-mono text-sm transition-colors duration-150 hover:bg-accent hover:text-accent-foreground"
                              key={post.slug}
                              onClick={() => handlePostSelect(post.slug)}
                              whileHover={{ x: 4 }}
                            >
                              <span className="mr-2 flex-1 truncate">
                                {post.title}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      );
                    }
                    return (
                      <div className="p-4 text-center font-mono text-muted-foreground text-sm">
                        No other posts with &ldquo;{tag}&rdquo;
                      </div>
                    );
                  })()}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </motion.div>
  );
}
