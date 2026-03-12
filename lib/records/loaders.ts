/**
 * Typed JSON record loaders.
 * Every JSON record is validated through Zod at load time.
 * All consumers import from here — never read JSON directly.
 */

import { z } from "zod";
import { PostTypeSchema, SourceTypeSchema } from "@/lib/content-sources/schema";
import postTypesData from "@/records/post-types.json";
import providersData from "@/records/providers.json";
import templatesData from "@/records/templates.json";

// ── Post Type Registry ──────────────────────────────────────────────

export const PostTypeRecordSchema = z.object({
  value: PostTypeSchema,
  label: z.string().min(1),
  description: z.string().min(1),
  directory: z.string().min(1),
  promptContext: z.string().min(1),
  supportsCategory: z.boolean(),
  order: z.number().int().min(0),
  shortLabel: z.string().length(1),
  icon: z.string().min(1),
  primary: z.boolean(),
});
export type PostTypeRecord = z.infer<typeof PostTypeRecordSchema>;

const PostTypeRegistrySchema = z.array(PostTypeRecordSchema).refine(
  (arr) => {
    const values = arr.map((r) => r.value);
    return new Set(values).size === values.length;
  },
  { message: "Duplicate post type values in registry" }
);

const _postTypeRegistry = PostTypeRegistrySchema.parse(postTypesData);

export function getPostTypeRegistry(): readonly PostTypeRecord[] {
  return _postTypeRegistry;
}

export function getPostTypeRecord(value: string): PostTypeRecord | undefined {
  return _postTypeRegistry.find((r) => r.value === value);
}

export function getPostTypeValues(): string[] {
  return _postTypeRegistry.map((r) => r.value);
}

// ── Template Registry ───────────────────────────────────────────────

export const TemplateRecordSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
});
export type TemplateRecord = z.infer<typeof TemplateRecordSchema>;

const TemplateRegistrySchema = z.array(TemplateRecordSchema).refine(
  (arr) => {
    const keys = arr.map((r) => r.key);
    return new Set(keys).size === keys.length;
  },
  { message: "Duplicate template keys in registry" }
);

const _templateRegistry = TemplateRegistrySchema.parse(templatesData);

export function getTemplateRegistry(): readonly TemplateRecord[] {
  return _templateRegistry;
}

export function getTemplateKeys(): string[] {
  return _templateRegistry.map((r) => r.key);
}

export function isValidTemplateKey(key: string): boolean {
  return _templateRegistry.some((r) => r.key === key);
}

// ── Provider Registry ───────────────────────────────────────────────

export const ProviderRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceType: SourceTypeSchema,
  enabled: z.boolean(),
  description: z.string().optional(),

  // Automation seams — optional settings for future deployment/publish hooks
  syncDirection: z.enum(["ingest", "publish", "bidirectional"]).optional(),
  triggerMode: z.enum(["manual", "on-change", "scheduled"]).optional(),
  allowedActions: z
    .array(z.enum(["create", "update", "delete", "publish", "unpublish"]))
    .optional(),
  publishTargetId: z.string().optional(),
  authSecretEnvKey: z.string().optional(),
});
export type ProviderRecord = z.infer<typeof ProviderRecordSchema>;

const ProviderRegistrySchema = z.array(ProviderRecordSchema).refine(
  (arr) => {
    const ids = arr.map((r) => r.id);
    return new Set(ids).size === ids.length;
  },
  { message: "Duplicate provider ids in registry" }
);

const _providerRegistry = ProviderRegistrySchema.parse(providersData);

export function getProviderRegistry(): readonly ProviderRecord[] {
  return _providerRegistry;
}

export function getEnabledProviders(): readonly ProviderRecord[] {
  return _providerRegistry.filter((r) => r.enabled);
}
