/**
 * Core type definitions for post scaffolding system
 */

import type { PostStatus, PostType } from "@/lib/generated/prisma";

/**
 * Configuration for creating post templates
 */
export type PostTemplateConfig = {
  title: string;
  type: PostType;
  category?: string;
  tags: string[];
  date: string; // ISO date string
  status: PostStatus;
  published: boolean;
  excerpt?: string;
  originalUrl?: string; // For FINDING posts
  author?: string;
  priority?: "high" | "medium" | "low";
};

/**
 * Frontmatter structure based on existing project patterns
 */
export type PostFrontmatter = {
  title: string;
  tags?: string[];
  categories?: string[];
  status: PostStatus;
  published: boolean;
  date?: string;
  excerpt?: string;
  original_url?: string; // For FINDING posts
  author?: string;
  priority?: string;
};

/**
 * Scaffold operation result
 */
export type ScaffoldResult = {
  success: boolean;
  filePath?: string;
  error?: string;
  metadata?: {
    wordsGenerated: number;
    outlineGenerated: boolean;
    processingTime: number;
  };
};

/**
 * Available post type choices for CLI — derived from shared post-type-meta.
 */
export { getPostTypeChoices as getPostTypeChoicesFromMeta } from "./post-type-meta";
import { getPostTypeChoices } from "./post-type-meta";

export const POST_TYPE_CHOICES = getPostTypeChoices();
