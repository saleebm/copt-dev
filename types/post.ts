import type React from "react";

// Canonical PostId used across app. For now it's a slug.
export type PostId = string;

/**
 * Represents the raw data structure of a post as defined in lib/posts.ts
 * and returned by getRawPostDataById or getPostDetailsAction.
 * rawContent holds the MDX string or plain text.
 */
export interface PostData {
  createdAt?: Date; // From database createdAt field
  id: PostId; // Canonical ID of the post (e.g., 'root', 'post-alpha')
  isMdx: boolean;
  lastEdited?: Date; // From database lastEdited field
  rawContent: string;
  tags?: string[]; // Optional tags for navigation and filtering
  title: string;
  type?: "CONCRETE" | "BLOG" | "FINDING"; // From database type field
}

/**
 * Represents a post that has been processed and is ready for rendering in the UI.
 * MDX content is turned into React.ReactNode.
 */
export interface RenderedPost {
  categories?: string[]; // Optional categories for navigation and filtering
  createdAt?: Date; // Optional created date from database
  id: PostId; // The post ID (same as originalId for consistency)
  isContentReady: boolean; // Whether content is fully loaded and stable (prevents flicker during async content loading)
  isDismissed: boolean; // UI state, managed by client components
  lastEdited?: Date; // Optional edited date from database
  originalId: PostId; // The canonical ID of the post
  renderedContent: React.ReactNode | null; // Null if dismissed or error during rendering
  tags?: string[]; // Optional tags for navigation and filtering
  title: string;
  type?: "CONCRETE" | "BLOG" | "FINDING"; // Post type for navigation filtering
}
