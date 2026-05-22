// Default providers: one per PostType. Each matches PRs that touch exactly
// one MDX file under `posts/<dir>/`. Filenames with the `MMddyyyy-` prefix
// (BLOG / FINDING) are stripped so the predicted slug matches what
// scripts/sync-posts.ts will eventually write to the DB.

import { basename } from "node:path";
import { PostType } from "@/lib/generated/prisma";
import type { GhPrSummary } from "../gh";
import type { ProviderSummary, ReviewProvider } from "./types";

const DATE_PREFIX = /^\d{8}-/;

function predictSlug(mdxPath: string): string {
  const fileName = basename(mdxPath).replace(/\.mdx$/i, "");
  return fileName.replace(DATE_PREFIX, "");
}

function makeProvider(
  id: string,
  label: string,
  postType: PostType,
  dir: string,
  priority = 100
): ReviewProvider {
  const dirRe = new RegExp(`^posts/${dir}/[^/]+\\.mdx$`, "i");

  return {
    id,
    label,
    postType,
    priority,
    match(pr: GhPrSummary): ProviderSummary | null {
      const mdxFiles = pr.files
        .map((f) => f.path)
        .filter((p) => p.toLowerCase().endsWith(".mdx") && dirRe.test(p));
      if (mdxFiles.length === 0) {
        return null;
      }
      const mdxPath = mdxFiles[0] as string;
      // Branch-prefix filter (`ingest/`) happens upstream in listReviewQueue;
      // file-path match is the authoritative signal here.
      return {
        id,
        postType,
        label,
        predictedSlug: predictSlug(mdxPath),
        mdxPath,
      };
    },
  };
}

export const findingProvider = makeProvider(
  "finding",
  "Finding",
  PostType.FINDING,
  "finding",
  10
);

export const sightProvider = makeProvider(
  "sight",
  "Sight",
  PostType.SIGHT,
  "sight",
  10
);

export const blogProvider = makeProvider(
  "blog",
  "Blog",
  PostType.BLOG,
  "blog",
  10
);

export const concreteProvider = makeProvider(
  "concrete",
  "Concrete",
  PostType.CONCRETE,
  "concrete",
  10
);
