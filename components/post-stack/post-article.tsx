import type React from "react";
import type { RenderedPost } from "@/types/post";
import PostCard from "./post-card";

type PostArticleProps = {
  post: RenderedPost;
  index: number;
  keyPrefix?: "server" | "client";
  children?: React.ReactNode;
};

/**
 * Wrapper component that provides consistent post structure and styling
 * Delegates article semantics to PostCard to prevent double nesting
 */
export const PostArticle: React.FC<PostArticleProps> = ({
  post,
  index,
  keyPrefix = "server",
  children,
}) => (
  <div
    className="relative z-10 min-h-0 w-full shrink-0"
    data-post-original-id={post.originalId}
    key={`${keyPrefix}-${post.id}`}
    style={{
      containIntrinsicSize: "auto",
    }}
  >
    <PostCard index={index} keyPrefix={keyPrefix} post={post} />
    {children}
  </div>
);
