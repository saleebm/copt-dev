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
  shouldAnimate?: boolean;
}

const PostCardHeader: React.FC<PostCardHeaderProps> = ({
  post,
  index,
  shouldAnimate = false,
}) => {
  const { posts, dismissingInfo, isLoadingNewPost } = usePostStackState();
  const { dismissPost, copyPermalink } = usePostStackActions();

  const handleDismiss = () => {
    const currentIndex = getCurrentPostIndex(
      posts,
      post.id,
      index,
      "PostCardHeader dismiss"
    );

    if (currentIndex !== -1) {
      dismissPost(post.id, currentIndex);
    }
  };

  const headerVariants = shouldAnimate ? postHeaderVariants : undefined;
  const containerVariants = shouldAnimate
    ? staggerContainerVariants
    : undefined;
  const itemVariants = shouldAnimate ? staggerItemVariants : undefined;

  return (
    <TooltipProvider>
      <motion.header
        animate={shouldAnimate ? "visible" : undefined}
        className="flex shrink-0 items-start justify-between rounded-t-lg border-border border-b bg-card/40 p-6"
        initial={shouldAnimate ? "hidden" : false}
        variants={headerVariants}
      >
        <motion.div
          className="min-w-0 flex-1"
          initial={shouldAnimate ? "hidden" : false}
          variants={containerVariants}
        >
          <motion.div
            className="flex items-start gap-3"
            initial={shouldAnimate ? "hidden" : false}
            variants={itemVariants}
          >
            <motion.div
              animate={{ scale: 1 }}
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary opacity-60"
              initial={shouldAnimate ? { scale: 0 } : false}
              transition={{ delay: 0.2, duration: 0.3 }}
            />
            <div className="min-w-0 flex-1">
              <motion.h1
                className="mb-2 font-bold text-card-foreground text-xl leading-tight tracking-tight md:text-2xl"
                initial={shouldAnimate ? "hidden" : false}
                variants={itemVariants}
              >
                {post.title}
              </motion.h1>
              {(post.lastEdited || post.createdAt) &&
                post.type !== "FINDING" && (
                  <motion.p
                    className="font-medium text-muted-foreground text-sm"
                    initial={shouldAnimate ? "hidden" : false}
                    variants={itemVariants}
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
              {post.tags && post.tags.length > 0 && (
                <PostTags postId={post.id} tags={post.tags} />
              )}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="ml-4 flex shrink-0 items-center gap-1"
          initial={shouldAnimate ? "hidden" : false}
          variants={containerVariants}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={shouldAnimate ? "hidden" : false}
                variants={itemVariants}
              >
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

          <motion.div
            initial={shouldAnimate ? "hidden" : false}
            variants={itemVariants}
          >
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
