"use client";

import { Loader2Icon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useCallback } from "react";
import {
  usePostStackActions,
  usePostStackState,
} from "@/components/post-stack/post-stack-provider-xstate";
import { BracketedPostName } from "@/components/shared/bracketed-post-name";
import { Button } from "@/components/ui/button";
import {
  buttonVariants,
  postFooterVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/animations";

// Component for a single concrete post link
const ConcretePostLink: React.FC<{
  postId: string;
  index: number;
  isActive: boolean;
  isLoading: boolean;
  onSelectPost: (postId: string) => Promise<void>;
}> = ({ postId, index, isActive, isLoading, onSelectPost }) => (
  <motion.div custom={index} key={postId} variants={staggerItemVariants}>
    <Button
      asChild
      className="h-auto p-2 text-base transition-colors duration-200 hover:bg-transparent"
      disabled={isLoading}
      onClick={() => onSelectPost(postId)}
      size="lg"
      variant="ghost"
    >
      <motion.button
        initial="idle"
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              animate={{ opacity: 1 }}
              className="flex items-center"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="loading"
            >
              <Loader2Icon className="mr-2 animate-spin" size={16} />
              Loading...
            </motion.div>
          ) : (
            <BracketedPostName isActive={isActive} postId={postId} />
          )}
        </AnimatePresence>
      </motion.button>
    </Button>
  </motion.div>
);

const PostCardFooter: React.FC<{ currentPostId: string }> = ({
  currentPostId,
}) => {
  const { concretePostIds, isLoadingNewPost, activePostId } =
    usePostStackState();
  const { addPost } = usePostStackActions();

  // Check if current post is concrete by looking in concretePostIds array
  const isCurrentPostConcrete = concretePostIds.includes(currentPostId);

  // Get other concrete posts (excluding the current one)
  const otherConcretePostIds = isCurrentPostConcrete
    ? concretePostIds.filter((id) => id !== currentPostId)
    : [];

  // Helper function to handle post selection - addPost already handles scrolling vs adding
  const handlePostSelection = useCallback(
    async (postId: string): Promise<void> => {
      try {
        await addPost(postId);
      } catch (_error) {
        // Silently handle post addition errors
      }
    },
    [addPost]
  );

  // Only show footer for concrete posts that have other concrete posts available
  if (!isCurrentPostConcrete || otherConcretePostIds.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="border-border border-t bg-card p-4"
      variants={postFooterVariants}
    >
      {/* Open Another Post section */}
      <motion.div variants={staggerContainerVariants}>
        <motion.div
          className="flex flex-wrap justify-center gap-3"
          style={{ fontFamily: "monospace" }}
          variants={staggerContainerVariants}
        >
          {otherConcretePostIds.map((otherOriginalId, index) => (
            <ConcretePostLink
              index={index}
              isActive={activePostId === otherOriginalId}
              isLoading={isLoadingNewPost === otherOriginalId}
              key={otherOriginalId}
              onSelectPost={handlePostSelection}
              postId={otherOriginalId}
            />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default PostCardFooter;
