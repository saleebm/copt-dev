/**
 * Post type metadata derived from Prisma schema.
 * Single source of truth for type descriptions, directory mappings, and CLI choices.
 * If a new PostType is added to schema.prisma, add it here and everything downstream picks it up.
 */

import type { PostType } from "@/lib/generated/prisma";

export type PostTypeMeta = {
  value: PostType;
  label: string;
  description: string;
  directory: string;
  promptContext: string;
  supportsCategory: boolean;
};

const META: Record<PostType, PostTypeMeta> = {
  CONCRETE: {
    value: "CONCRETE",
    label: "CONCRETE",
    description:
      "Foundational, principle-based content (timeless reference material)",
    directory: "concrete",
    promptContext:
      "This is a CONCRETE post — foundational, principle-based content that serves as a cornerstone reference. It should be comprehensive, well-structured, and timeless.",
    supportsCategory: false,
  },
  BLOG: {
    value: "BLOG",
    label: "BLOG",
    description:
      "Personal, chronological posts (thoughts, experiences, insights)",
    directory: "blog",
    promptContext:
      "This is a BLOG post — personal, chronological content that reflects thoughts, experiences, or insights. It should be engaging and conversational.",
    supportsCategory: true,
  },
  FINDING: {
    value: "FINDING",
    label: "FINDING",
    description: "Research discoveries and curated external content",
    directory: "finding",
    promptContext:
      "This is a FINDING post — research discoveries, insights, or curated external content. It should be analytical and informative.",
    supportsCategory: true,
  },
  SIGHT: {
    value: "SIGHT",
    label: "SIGHT",
    description: "Visual/image posts",
    directory: "sight",
    promptContext:
      "This is a SIGHT post — visual or image-based content. It should be concise with emphasis on the visual element.",
    supportsCategory: true,
  },
};

export function getPostTypeMeta(type: PostType): PostTypeMeta {
  return META[type];
}

export function getAllPostTypeMeta(): PostTypeMeta[] {
  return Object.values(META);
}

export function getPostTypeChoices(): Array<{
  value: PostType;
  label: string;
  description: string;
}> {
  return getAllPostTypeMeta().map(({ value, label, description }) => ({
    value,
    label,
    description,
  }));
}

export function getPostDirectory(type: PostType): string {
  return META[type].directory;
}

export function getPromptContext(type: PostType): string {
  return META[type].promptContext;
}

export function isValidPostType(value: string): value is PostType {
  return value in META;
}
