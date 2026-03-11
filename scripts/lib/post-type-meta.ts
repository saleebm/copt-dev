/**
 * Post type metadata — derived from validated JSON registry.
 * Single source of truth for type descriptions, directory mappings, and CLI choices.
 * Adding a new PostType means adding an entry to records/post-types.json.
 */

import type { PostType } from "@/lib/generated/prisma";
import {
  getPostTypeRecord,
  getPostTypeRegistry,
  type PostTypeRecord,
} from "@/lib/records/loaders";

export type PostTypeMeta = PostTypeRecord;

export function getPostTypeMeta(type: PostType): PostTypeMeta {
  const record = getPostTypeRecord(type);
  if (!record) {
    throw new Error(`Unknown post type: ${type}`);
  }
  return record;
}

export function getAllPostTypeMeta(): PostTypeMeta[] {
  return [...getPostTypeRegistry()];
}

export function getPostTypeChoices(): Array<{
  value: PostType;
  label: string;
  description: string;
}> {
  return getAllPostTypeMeta().map(({ value, label, description }) => ({
    value: value as PostType,
    label,
    description,
  }));
}

export function getPostDirectory(type: PostType): string {
  return getPostTypeMeta(type).directory;
}

export function getPromptContext(type: PostType): string {
  return getPostTypeMeta(type).promptContext;
}

export function isValidPostType(value: string): value is PostType {
  return getPostTypeRecord(value) !== undefined;
}
