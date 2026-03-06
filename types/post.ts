import type React from "react";

// Canonical PostId used across app. For now it's a slug.
export type PostId = string;

/**
 * Represents the raw data structure of a post as defined in lib/posts.ts
 * and returned by getRawPostDataById or getPostDetailsAction.
 * rawContent holds the MDX string or plain text.
 */
export type PostData = {
  id: PostId; // Canonical ID of the post (e.g., 'root', 'post-alpha')
  title: string;
  isMdx: boolean;
  rawContent: string;
  lastEdited?: Date; // From database lastEdited field
  createdAt?: Date; // From database createdAt field
  type?: "CONCRETE" | "BLOG" | "FINDING"; // From database type field
  tags?: string[]; // Optional tags for navigation and filtering
};

/**
 * Represents a post that has been processed and is ready for rendering in the UI.
 * MDX content is turned into React.ReactNode.
 */
export type RenderedPost = {
  id: PostId; // The post ID (same as originalId for consistency)
  originalId: PostId; // The canonical ID of the post
  title: string;
  lastEdited?: Date; // Optional edited date from database
  createdAt?: Date; // Optional created date from database
  type?: "CONCRETE" | "BLOG" | "FINDING"; // Post type for navigation filtering
  tags?: string[]; // Optional tags for navigation and filtering
  categories?: string[]; // Optional categories for navigation and filtering
  renderedContent: React.ReactNode | null; // Null if dismissed or error during rendering
  isDismissed: boolean; // UI state, managed by client components
  isContentReady: boolean; // Whether content is fully loaded and stable (prevents flicker during async content loading)
};
