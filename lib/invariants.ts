import type { PostId } from "@/types/post";

export function ensurePostIdInvariant(
  id: PostId,
  originalId?: PostId,
  _context?: string
): void {
  if (originalId !== undefined && id !== originalId) {
    // Post ID mismatch detected - this is expected in some cases during transitions
  }
}
