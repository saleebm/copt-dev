"use client";

import { usePostStackActions } from "@/components/post-stack/post-stack-provider-xstate";
import type { PostId } from "@/types/post";

type PostLinkProps = {
  postId: string;
  children: React.ReactNode;
  className?: string;
};

export function PostLinkClient({ postId, children, className }: PostLinkProps) {
  // Use addPost directly - no tracking/correction needed for content links
  const { addPost } = usePostStackActions();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await addPost(postId as PostId);
  };

  return (
    <a
      className={className} // Fallback URL
      href={`/${postId}`}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
