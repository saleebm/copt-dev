"use client";

import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { RenderedPost } from "@/types/post";

interface UsePermalinkProps {
  posts: RenderedPost[];
}

export function usePermalink({ posts }: UsePermalinkProps) {
  const { toast } = useToast();

  const copyPermalink = useCallback(
    async (postId: string) => {
      // Find the post - it could be an instance ID or original ID
      const targetPost = posts.find(
        (post) => post.id === postId || post.originalId === postId
      );
      if (!targetPost) {
        toast({
          title: "Error",
          description: "Could not generate permalink for this post.",
        });
        return;
      }

      // Get canonical IDs for the stack
      const canonicalIds = posts.map((p) => p.originalId);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      let permalink = "";

      if (window.location.pathname === "/") {
        // Home route: convert stack to catch-all path
        const catchAllPath =
          canonicalIds.length > 0 ? `/${canonicalIds.join("/")}` : "/";
        permalink = `${baseUrl}${catchAllPath}?initialActivePostId=${targetPost.originalId}`;
      } else {
        // For catch-all, use current path and add initialActivePostId
        const path = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set("initialActivePostId", targetPost.originalId);
        permalink = `${baseUrl}${path}?${urlParams.toString()}`;
      }

      try {
        await navigator.clipboard.writeText(permalink);
        toast({
          title: "Permalink copied!",
          description: "You can now share or bookmark this post.",
          duration: 5000, // Auto dismiss after 5 seconds
        });
      } catch (_err) {
        toast({
          title: "Failed to copy",
          description: "Could not copy permalink to clipboard.",
          duration: 5000, // Auto dismiss after 5 seconds
        });
      }
    },
    [posts, toast]
  );

  return {
    copyPermalink,
  };
}
