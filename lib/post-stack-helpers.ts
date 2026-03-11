/**
 * Post Stack Helper Utilities
 *
 * Centralized utilities for common post stack operations to ensure consistency
 * and prevent duplication across the codebase.
 */

import type { PostId, RenderedPost } from "@/types/post";

/**
 * Find the index of a post in the posts array by ID.
 * Checks both the post's ID and originalId for matches.
 *
 * @param posts - Array of rendered posts
 * @param postId - The ID to search for
 * @returns The index of the post, or -1 if not found
 */
export function findPostIndex(posts: RenderedPost[], postId: PostId): number {
  // Canonical path: match by id only (id === originalId policy)
  return posts.findIndex((p) => p.id === postId);
}

/**
 * Find a post in the posts array by ID.
 * Checks both the post's ID and originalId for matches.
 *
 * @param posts - Array of rendered posts
 * @param postId - The ID to search for
 * @returns The post if found, or undefined
 */
export function findPostById(
  posts: RenderedPost[],
  postId: PostId
): RenderedPost | undefined {
  // Canonical path: match by id only (id === originalId policy)
  return posts.find((p) => p.id === postId);
}

/**
 * Validate that a provided index matches the expected post ID.
 * If not, find and return the correct index.
 *
 * @param posts - Array of rendered posts
 * @param postId - The expected post ID
 * @param providedIndex - The index to validate
 * @returns Object with validation result and correct index
 */
export function validateAndCorrectIndex(
  posts: RenderedPost[],
  postId: PostId,
  providedIndex: number
): { isValid: boolean; correctIndex: number; message?: string } {
  // Check if index is in bounds
  if (providedIndex < 0 || providedIndex >= posts.length) {
    const correctIndex = findPostIndex(posts, postId);
    return {
      isValid: false,
      correctIndex,
      message: `Index ${providedIndex} out of bounds. Found at ${correctIndex}`,
    };
  }

  const actualPostAtIndex = posts[providedIndex];

  // Check if the post at the provided index matches the expected ID
  if (!actualPostAtIndex || actualPostAtIndex.id !== postId) {
    const correctIndex = findPostIndex(posts, postId);

    if (correctIndex === -1) {
      return {
        isValid: false,
        correctIndex: -1,
        message: `Post ${postId} not found in posts array`,
      };
    }

    return {
      isValid: false,
      correctIndex,
      message: `Index mismatch: expected ${postId} at ${providedIndex}, found at ${correctIndex}`,
    };
  }

  return { isValid: true, correctIndex: providedIndex };
}

/**
 * Get the current index of a post, with validation and logging.
 * This is the preferred method for getting a post's index when you have
 * a potentially stale index value.
 *
 * @param posts - Array of rendered posts
 * @param postId - The post ID to find
 * @param providedIndex - Optional provided index to validate
 * @param context - Optional context for logging
 * @returns The correct index, or -1 if not found
 */
export function getCurrentPostIndex(
  posts: RenderedPost[],
  postId: PostId,
  providedIndex?: number,
  context?: string
): number {
  // If no index provided, just find it
  if (providedIndex === undefined) {
    return findPostIndex(posts, postId);
  }

  // Validate the provided index
  const { isValid, correctIndex, message } = validateAndCorrectIndex(
    posts,
    postId,
    providedIndex
  );

  if (!isValid && message && context) {
    // Validation message logged by validateAndCorrectIndex
  }

  return correctIndex;
}

/**
 * Check if a post exists in the posts array.
 *
 * @param posts - Array of rendered posts
 * @param postId - The ID to check
 * @returns True if the post exists
 */
export function postExists(posts: RenderedPost[], postId: PostId): boolean {
  return findPostIndex(posts, postId) !== -1;
}

/**
 * Get the post that should be scrolled to after dismissing a post.
 * Follows the pattern: prefer previous post, then next post, then null.
 *
 * @param posts - Array of rendered posts
 * @param dismissIndex - Index of the post being dismissed
 * @returns The ID of the post to scroll to, or null
 */
export function getPostAfterDismissal(
  posts: RenderedPost[],
  dismissIndex: number
): string | null {
  // Try previous post first (index - 1)
  if (dismissIndex > 0) {
    return posts[dismissIndex - 1].id;
  }

  // Fallback to next post (will become current index after removal)
  if (dismissIndex < posts.length - 1) {
    return posts[dismissIndex + 1].id;
  }

  // No posts left
  return null;
}

/**
 * Type guard to check if a value is a valid post index.
 *
 * @param posts - Array of rendered posts
 * @param index - The index to check
 * @returns True if the index is valid
 */
export function isValidPostIndex(
  posts: RenderedPost[],
  index: number
): boolean {
  return index >= 0 && index < posts.length;
}
