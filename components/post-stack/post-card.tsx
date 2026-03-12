"use client";
import { motion } from "motion/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  usePostStackActions,
  usePostStackState,
} from "@/components/post-stack/post-stack-provider-xstate";
import {
  accentBarVariants,
  clientPostEntrance,
  postCardVariants,
} from "@/lib/animations";
import styles from "@/styles/post-dismissal.module.css";
import type { RenderedPost } from "@/types/post";
import PostCardFooter from "./post-card-footer";
import PostCardHeader from "./post-card-header";

interface PostCardProps {
  index: number;
  keyPrefix?: "server" | "client";
  post: RenderedPost;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  index,
  keyPrefix = "server",
}) => {
  const { dismissingInfo, scrollState } = usePostStackState();
  const { setArticleRef } = usePostStackActions();
  const isCurrentlyDismissingThisPost = dismissingInfo?.id === post.id;
  const articleRef = useRef<HTMLElement | null>(null);
  const timer1Ref = useRef<NodeJS.Timeout | null>(null);
  const timer2Ref = useRef<NodeJS.Timeout | null>(null);
  const [isContentAnimated, setIsContentAnimated] = useState(false);
  const [isCompletelyDismissed, setIsCompletelyDismissed] = useState(false);

  // Determine animation behavior based on rendering context and scroll state
  const isClientPost = keyPrefix === "client";
  // For server posts, always show content immediately
  // For client posts, animate when scroll is complete and content is ready
  const shouldAnimate =
    isClientPost &&
    post.isContentReady &&
    (scrollState === "settling" || scrollState === "idle");

  // Handle content animation timing with proper coordination
  useEffect(() => {
    if (isClientPost && post.isContentReady && !isContentAnimated) {
      // Small delay to ensure post is fully settled and visible
      const timeoutId = setTimeout(() => {
        setIsContentAnimated(true);
      }, 150);

      return () => clearTimeout(timeoutId);
    }
  }, [isClientPost, post.isContentReady, isContentAnimated]);

  const sectionRefCallback = useCallback(
    (el: HTMLElement | null) => {
      setArticleRef(index, el);
    },
    [setArticleRef, index]
  );

  // Handle TV shutoff animation with event-based sequencing
  useEffect(() => {
    if (!(isCurrentlyDismissingThisPost && articleRef.current)) {
      return;
    }

    const element = articleRef.current;
    const dismissContainer = element.parentElement;

    // Set original height for animation
    if (dismissContainer) {
      dismissContainer.style.setProperty(
        "--original-height",
        `${dismissContainer.offsetHeight}px`
      );
    }

    // Clear any existing timeouts
    if (timer1Ref.current) {
      clearTimeout(timer1Ref.current);
      timer1Ref.current = null;
    }
    if (timer2Ref.current) {
      clearTimeout(timer2Ref.current);
      timer2Ref.current = null;
    }

    // Listen for animation end event to trigger immediate cleanup
    const handleAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName === "tv-shutdown-bars") {
        // TV shutdown animation completed - immediately trigger cleanup
        element.classList.add(styles.collapsing);
        if (dismissContainer) {
          dismissContainer.classList.add(styles.collapsing);
        }

        // Immediately hide completely to prevent any flash
        element.style.display = "none";
        element.style.visibility = "hidden";
        element.style.opacity = "0";
        element.style.height = "0";
        element.style.overflow = "hidden";
        if (dismissContainer) {
          dismissContainer.style.display = "none";
          dismissContainer.style.visibility = "hidden";
          dismissContainer.style.opacity = "0";
          dismissContainer.style.height = "0";
          dismissContainer.style.overflow = "hidden";
        }

        // Mark as completely dismissed to stop rendering
        setIsCompletelyDismissed(true);

        // Remove event listener
        element.removeEventListener("animationend", handleAnimationEnd);
      }
    };

    // Add animation end listener
    element.addEventListener("animationend", handleAnimationEnd);

    // Start TV shutoff animation with minimal delay
    timer1Ref.current = setTimeout(() => {
      element.classList.add(styles.active);
      timer1Ref.current = null;
    }, 50);

    return () => {
      if (timer1Ref.current) {
        clearTimeout(timer1Ref.current);
        timer1Ref.current = null;
      }
      if (timer2Ref.current) {
        clearTimeout(timer2Ref.current);
        timer2Ref.current = null;
      }
      element.removeEventListener("animationend", handleAnimationEnd);
    };
  }, [isCurrentlyDismissingThisPost]);

  // Don't render if completely dismissed
  if (isCompletelyDismissed) {
    return null;
  }

  return (
    <section
      className={`flex min-h-screen w-full items-start justify-center px-4 py-6 transition-all duration-300 md:px-6 md:py-8 ${isCurrentlyDismissingThisPost ? styles.dismissContainer : ""}
      `}
      data-post-id={post.id}
      data-post-index={index}
      id={`post-section-${post.id}`}
      ref={sectionRefCallback}
      style={
        {
          "--original-padding-top": "1.5rem",
          "--original-padding-bottom": "1.5rem",
        } as React.CSSProperties
      }
    >
      <motion.article
        animate={shouldAnimate ? "visible" : { opacity: 1 }}
        className={`group relative flex min-h-[60vh] w-full max-w-4xl flex-col rounded-lg border border-border bg-card shadow-2xl transition-all duration-300 ease-in-out hover:border-primary/50 hover:shadow-primary/20 ${isCurrentlyDismissingThisPost ? styles.dismissing : ""}
        `}
        initial={shouldAnimate ? "hidden" : false}
        // Animation configuration based on post type
        layout={false}
        ref={articleRef}
        style={{
          // GPU acceleration optimizations
          willChange: shouldAnimate ? "transform, opacity" : "auto",
          backfaceVisibility: "hidden",
          transform: shouldAnimate ? "translate3d(0,0,0)" : undefined,
        }}
        // Remove layout animation to prevent shifts
        variants={(() => {
          if (!shouldAnimate) {
            return;
          }
          return isClientPost ? clientPostEntrance : postCardVariants;
        })()}
      >
        <PostCardHeader
          index={index}
          post={post}
          shouldAnimate={shouldAnimate}
        />

        <motion.div
          animate={{
            opacity: (() => {
              if (isClientPost && isContentAnimated) {
                return 1;
              }
              if (isClientPost) {
                return 0;
              }
              return 1;
            })(),
          }}
          className="flex-1 overflow-y-auto p-6 text-foreground"
          initial={isClientPost ? { opacity: 0 } : { opacity: 1 }}
          style={{
            willChange: isClientPost ? "opacity" : "auto",
          }}
          transition={{
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],
            delay: 0.1,
          }}
        >
          <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl prose-invert max-w-none">
            {post.renderedContent}
          </div>
        </motion.div>

        {/* Render footer on all posts for navigation */}
        <PostCardFooter currentPostId={post.originalId} />

        {/* Accent bar with optimized animation */}
        <motion.div
          animate={
            shouldAnimate ? "visible" : { transform: "scaleY(1)", opacity: 0.8 }
          }
          className="absolute top-0 bottom-0 left-0 w-1 rounded-l-lg bg-gradient-to-b from-primary/60 via-primary/40 to-transparent transition-all duration-300"
          initial={
            shouldAnimate ? "hidden" : { transform: "scaleY(1)", opacity: 0.8 }
          }
          style={{
            transformOrigin: "top",
            willChange: "transform, opacity",
            backfaceVisibility: "hidden",
          }}
          variants={shouldAnimate ? accentBarVariants : undefined}
          whileHover="hover"
        />
      </motion.article>
    </section>
  );
};

export default React.memo(
  PostCard,
  (prevProps, nextProps) =>
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.title === nextProps.post.title &&
    prevProps.index === nextProps.index &&
    prevProps.post.renderedContent === nextProps.post.renderedContent &&
    prevProps.keyPrefix === nextProps.keyPrefix
);
