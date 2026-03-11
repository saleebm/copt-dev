"use client";
import { format } from "date-fns";
import { Link2Icon, XIcon } from "lucide-react";
import { motion } from "motion/react";
import React from "react";
import {
  usePostStackActions,
  usePostStackState,
} from "@/components/post-stack/post-stack-provider-xstate";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  iconButtonVariants,
  postHeaderVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/animations";
import { getCurrentPostIndex } from "@/lib/post-stack-helpers";
import type { RenderedPost } from "@/types/post";
import { PostTags } from "./post-tags";

interface PostCardHeaderProps {
  index: number;
  post: RenderedPost;
}

const PostCardHeader: React.FC<PostCardHeaderProps> = ({ post, index }) => {
  const { posts, dismissingInfo, isLoadingNewPost } = usePostStackState();
  const { dismissPost, copyPermalink } = usePostStackActions();

  const handleDismiss = () => {
    // Use helper to get current index with validation and logging
    const currentIndex = getCurrentPostIndex(
      posts,
      post.id,
      index,
      "PostCardHeader dismiss"
    );

    if (currentIndex !== -1) {
      dismissPost(post.id, currentIndex);
    }
    // Post index not found, dismiss not possible
  };

  return (
    <TooltipProvider>
      <motion.header
        className="flex shrink-0 items-start justify-between rounded-t-lg border-border border-b bg-card/40 p-6"
        variants={postHeaderVariants}
      >
        <motion.div
          className="min-w-0 flex-1"
          variants={staggerContainerVariants}
        >
          <motion.div
            className="flex items-start gap-3"
            variants={staggerItemVariants}
          >
            <motion.div
              animate={{ scale: 1 }}
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary opacity-60"
              initial={{ scale: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            />
            <div className="min-w-0 flex-1">
              <motion.h1
                className="mb-2 font-bold text-card-foreground text-xl leading-tight tracking-tight md:text-2xl"
                variants={staggerItemVariants}
              >
                {post.title}
              </motion.h1>
              {/* Display lastEdited if available, otherwise show createdAt - but not for finding posts */}
              {(post.lastEdited || post.createdAt) &&
                post.type !== "FINDING" && (
                  <motion.p
                    className="font-medium text-muted-foreground text-sm"
                    variants={staggerItemVariants}
                  >
                    {(() => {
                      if (post.lastEdited) {
                        return `Last edited ${format(post.lastEdited, "MMMM d, yyyy")}`;
                      }
                      if (post.createdAt) {
                        return `Created ${format(post.createdAt, "MMMM d, yyyy")}`;
                      }
                      return null;
                    })()}
                  </motion.p>
                )}
              {/* Add tags component */}
              {post.tags && post.tags.length > 0 && (
                <PostTags postId={post.id} tags={post.tags} />
              )}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="ml-4 flex shrink-0 items-center gap-1"
          variants={staggerContainerVariants}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div variants={staggerItemVariants}>
                <Button
                  aria-label="Copy permalink to this post"
                  asChild
                  className="h-8 w-8 rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-primary"
                  onClick={() => copyPermalink(post.id)}
                  size="icon"
                  variant="ghost"
                >
                  <motion.button
                    initial="idle"
                    variants={iconButtonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Link2Icon className="h-4 w-4" />
                  </motion.button>
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>Copy permalink</TooltipContent>
          </Tooltip>

          <motion.div variants={staggerItemVariants}>
            <Button
              aria-label={`Dismiss post ${post.title}`}
              asChild
              className="h-8 w-8 rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
              disabled={dismissingInfo !== null || isLoadingNewPost !== null}
              onClick={handleDismiss}
              size="icon"
              variant="ghost"
            >
              <motion.button
                initial="idle"
                variants={iconButtonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <XIcon className="h-4 w-4" />
              </motion.button>
            </Button>
          </motion.div>
        </motion.div>
      </motion.header>
    </TooltipProvider>
  );
};

export default React.memo(PostCardHeader);
