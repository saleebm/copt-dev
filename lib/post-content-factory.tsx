import type { MDXRemoteSerializeResult } from "next-mdx-remote";
import { MDXRemote } from "next-mdx-remote";
import type React from "react";
import { PostContentSkeleton } from "@/components/shared/skeletons";

interface CreatePostContentProps {
  components?: Record<string, React.ComponentType<Record<string, unknown>>>;
  errorMessage?: string;
  isError?: boolean;
  isMdx?: boolean;
  mdxSource?: MDXRemoteSerializeResult;
  rawContent?: string;
}

interface PostContentResult {
  isContentReady: boolean;
  renderedContent: React.ReactNode;
}

export function createPostContent({
  isMdx,
  rawContent,
  mdxSource,
  components,
  isError,
  errorMessage = "Error rendering content",
}: CreatePostContentProps): PostContentResult {
  // Handle error content
  if (isError) {
    return {
      renderedContent: <div className="p-4 text-red-500">{errorMessage}</div>,
      isContentReady: true,
    };
  }

  // Handle MDX source content (fully rendered MDX)
  if (isMdx && mdxSource && components) {
    return {
      renderedContent: <MDXRemote {...mdxSource} components={components} />,
      isContentReady: true,
    };
  }

  // Handle initial content based on content type
  if (isMdx) {
    // Return loading skeleton for MDX
    return {
      renderedContent: <PostContentSkeleton />,
      isContentReady: false,
    };
  }

  // Handle plain text content
  if (rawContent) {
    return {
      renderedContent: (
        <p className="whitespace-pre-line text-foreground leading-relaxed">
          {rawContent}
        </p>
      ),
      isContentReady: true,
    };
  }

  // Fallback
  return {
    renderedContent: <p>No content available</p>,
    isContentReady: true,
  };
}
