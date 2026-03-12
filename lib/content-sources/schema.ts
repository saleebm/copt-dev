/**
 * Canonical normalized content contract.
 * Every content provider (MDX, JSON, future 3rd-party) must produce NormalizedPost records.
 * sync-posts consumes only this shape — nothing provider-specific leaks into reconcile.
 */

import { z } from "zod";

export const PostStatusSchema = z.enum(["PUBLISHED", "DRAFT", "ARCHIVED"]);
export type PostStatusValue = z.infer<typeof PostStatusSchema>;

export const PostTypeSchema = z.enum(["CONCRETE", "BLOG", "FINDING", "SIGHT"]);
export type PostTypeValue = z.infer<typeof PostTypeSchema>;

export const SourceTypeSchema = z.enum(["mdx", "json", "api"]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const SyncStatusSchema = z.enum([
  "synced",
  "pending",
  "error",
  "tombstone",
]);
export type SyncStatus = z.infer<typeof SyncStatusSchema>;

export const HlexiconTermSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
});
export type HlexiconTermRecord = z.infer<typeof HlexiconTermSchema>;

export const SourceProvenanceSchema = z.object({
  sourceType: SourceTypeSchema,
  providerId: z.string().min(1),
  sourceRecordId: z.string().optional(),
  sourceHash: z.string().min(1),
  sourcePath: z.string().optional(),
});
export type SourceProvenance = z.infer<typeof SourceProvenanceSchema>;

export const NormalizedPostSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  content: z.string(),
  excerpt: z.string().optional(),
  type: PostTypeSchema,
  status: PostStatusSchema,
  date: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  categoryPath: z.array(z.string()).optional(),
  originalUrl: z.string().optional(),
  hlexiconTerms: z.array(HlexiconTermSchema).default([]),
  findingsCount: z.number().int().optional(),
  provenance: SourceProvenanceSchema,
});
export type NormalizedPost = z.infer<typeof NormalizedPostSchema>;

export const ProviderResultSchema = z.object({
  posts: z.array(NormalizedPostSchema),
  providerId: z.string().min(1),
  sourceType: SourceTypeSchema,
});
export type ProviderResult = z.infer<typeof ProviderResultSchema>;

/**
 * Content provider interface — every source adapter implements this.
 */
export interface ContentProvider {
  getPosts(): Promise<NormalizedPost[]> | NormalizedPost[];
  readonly id: string;
  readonly sourceType: SourceType;
}
