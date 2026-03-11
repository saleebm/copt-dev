/**
 * MDX filesystem content provider.
 * Wraps the existing mdx-parser.ts behavior to produce NormalizedPost records.
 * Zero behavior change — all existing derived behaviors (findings/sights summaries,
 * category inference, date fallbacks, Hlexicon extraction, asset handling) are preserved
 * by delegating to the original parser functions.
 */

import { getAllPosts, type ParsedPost } from "@/lib/mdx-parser";
import type {
  ContentProvider,
  NormalizedPost,
  SourceType,
} from "./schema";

const PROVIDER_ID = "filesystem";
const SOURCE_TYPE: SourceType = "mdx";

function parsedPostToNormalized(post: ParsedPost): NormalizedPost {
  const categoryPath = (post.categories ?? []).map((c) =>
    c.toLowerCase().replace(/\s+/g, "-")
  );

  return {
    slug: post.slug,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt || undefined,
    type: post.type,
    status: post.status ?? "DRAFT",
    date: post.date ?? null,
    tags: post.tags ?? [],
    categories: post.categories ?? [],
    categoryPath,
    originalUrl: post.original_url || undefined,
    hlexiconTerms: (post.hlexiconTerms ?? []).map((t) => ({
      term: t.term,
      definition: t.definition,
    })),
    findingsCount: post.findingsCount,
    provenance: {
      sourceType: SOURCE_TYPE,
      providerId: PROVIDER_ID,
      sourceHash: post.fileHash,
      sourcePath: post.filePath,
    },
  };
}

export class MdxProvider implements ContentProvider {
  readonly id = PROVIDER_ID;
  readonly sourceType = SOURCE_TYPE;

  getPosts(): NormalizedPost[] {
    const parsed = getAllPosts();
    return parsed.map(parsedPostToNormalized);
  }
}
