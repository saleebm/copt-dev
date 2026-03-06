"use server";

import { getRawPostDataById } from "@/lib/posts";
import type { PostData } from "@/types/post";

/**
 * Fetches the complete raw data for a post (ID, title, MDX/plain content, type).
 * This is useful for client components needing to fetch details for a new post
 * before adding it to the stack and triggering a server re-render.
 */
export async function getPostDetailsAction(
  originalId: string
): Promise<PostData | null> {
  return await getRawPostDataById(originalId);
}
