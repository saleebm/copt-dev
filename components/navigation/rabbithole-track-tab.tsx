"use client";

import { FileText, Layers } from "lucide-react";
import { useCallback, useMemo } from "react";
import {
  usePostStackActions,
  usePostStackState,
} from "@/components/post-stack/post-stack-provider-xstate";
import { TerminalHeading } from "@/components/shared/terminal-heading";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RenderedPost } from "@/types/post";

type PostItemProps = {
  post: {
    id: string;
    originalId: string;
    title: string;
    isActive: boolean;
  };
  onClick: (postId: string) => void;
};

const PostItem = ({ post, onClick }: PostItemProps) => (
  <button
    aria-label={`Navigate to ${post.title}${post.isActive ? " (currently active)" : ""}`}
    className={cn(
      "w-full min-w-0 overflow-hidden rounded-sm p-3 text-left font-mono transition-all duration-200",
      "hover:bg-muted/60 focus:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30",
      "border border-transparent hover:border-border/50",
      post.isActive ? "border-primary/30 bg-primary/10 shadow-sm" : ""
    )}
    onClick={() => onClick(post.id)}
    type="button"
  >
    <div className="flex min-w-0 items-center gap-3 overflow-hidden">
      <FileText
        className={cn(
          "h-4 w-4 flex-shrink-0",
          post.isActive ? "text-primary" : "text-muted-foreground"
        )}
      />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p
          className={cn(
            "truncate font-medium text-sm",
            post.isActive ? "text-primary" : "text-foreground"
          )}
        >
          {post.title}
        </p>
      </div>
      {post.isActive && (
        <Badge
          className="flex-shrink-0 border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-primary text-xs"
          variant="outline"
        >
          Active
        </Badge>
      )}
    </div>
  </button>
);

type RabbitholeTrackTabProps = {
  onNavigate?: () => void;
};

export function RabbitholeTrackTab({ onNavigate }: RabbitholeTrackTabProps) {
  const { posts, activePostId, initialActivePostId, dismissingInfo } =
    usePostStackState();
  const { scrollToPost } = usePostStackActions();

  // Get posts currently in the stack (excluding dismissed posts) - memoized for performance
  const postsInStack = useMemo(
    () => posts.filter((p) => !dismissingInfo || dismissingInfo.id !== p.id),
    [posts, dismissingInfo]
  );

  // Determine active post ID using same logic as footer - memoized function
  const getActivePostId = useCallback(
    (stackPost: RenderedPost): boolean => {
      if (activePostId) {
        return (
          activePostId === stackPost.id || activePostId === stackPost.originalId
        );
      }
      if (initialActivePostId) {
        return (
          initialActivePostId === stackPost.id ||
          initialActivePostId === stackPost.originalId
        );
      }
      return stackPost.id === posts[0]?.id;
    },
    [activePostId, initialActivePostId, posts]
  );

  // Handle navigation click - scroll to post in stack
  const handleStackPostClick = useCallback(
    async (postId: string) => {
      try {
        // Scroll to post without margin for existing posts
        await scrollToPost(postId, false);
        onNavigate?.();
      } catch (_error) {
        // Silently handle scroll errors
      }
    },
    [scrollToPost, onNavigate]
  );

  // Create navigation items for posts in stack - memoized for performance
  const stackPostsForNav = useMemo(
    () =>
      postsInStack.map((stackPost) => ({
        id: stackPost.id,
        originalId: stackPost.originalId,
        title: stackPost.title,
        isActive: getActivePostId(stackPost),
      })),
    [postsInStack, getActivePostId]
  );

  return (
    <div className="space-y-4 p-4">
      {/* Header with terminal styling */}
      <div className="space-y-3">
        <TerminalHeading level={3} size="sm">
          Current Stack
        </TerminalHeading>

        {stackPostsForNav.length > 0 && (
          <div className="flex items-center gap-2 font-mono text-muted-foreground text-xs">
            <Layers className="h-3 w-3" />
            <span>
              {stackPostsForNav.length} post
              {stackPostsForNav.length !== 1 ? "s" : ""} in stack
            </span>
          </div>
        )}
      </div>

      {/* Posts List */}
      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
        {stackPostsForNav.length > 0 ? (
          <div
            aria-label="Posts in current stack"
            className="space-y-2"
            role="list"
          >
            {stackPostsForNav.map((post) => (
              <div key={post.id} role="listitem">
                <PostItem onClick={handleStackPostClick} post={post} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 font-mono text-muted-foreground/50">
              <span className="text-lg">{"{"}</span>
              <Layers className="mx-2 inline h-6 w-6" />
              <span className="text-lg">{"}"}</span>
            </div>
            <p className="mb-2 font-mono text-muted-foreground text-sm">
              No posts in stack
            </p>
            <p className="font-mono text-muted-foreground/70 text-xs">
              Start exploring to build your rabbithole track
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
