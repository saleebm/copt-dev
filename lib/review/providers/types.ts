// Review providers describe how the review surface understands a given PR.
// The system is intentionally pluggable: each PostType (or any future content
// kind) registers a provider with a `match()` predicate over the PR's changed
// files, plus optional hooks fired during merge / publish toggle.
//
// Registration lives in `./index.ts`. To add a new ingest-style content
// surface, drop another module here and append it to the registry — routes
// are agnostic.
import type { Post, PostType } from "@/lib/generated/prisma";
import type { GhPrSummary } from "../gh";

export interface ProviderSummary {
  /** Provider id used to disambiguate matches (`finding`, `sight`, ...). */
  id: string;
  /** Human label shown in the iOS Shortcut picker. */
  label: string;
  /** The single MDX file path the PR is centered on, if obvious. */
  mdxPath: string | null;
  /** PostType the matched PR will eventually surface as (null = unknown). */
  postType: PostType | null;
  /** Slug we can derive *before* the post lands in the DB (best-effort). */
  predictedSlug: string | null;
}

export interface ReviewProvider {
  id: string;
  label: string;
  match(pr: GhPrSummary): ProviderSummary | null;
  /** Optional post-publish hook (runs server-side after publish toggle). */
  onPublishChange?(ctx: { post: Post; published: boolean }): Promise<void>;
  postType: PostType | null;
  /** Lower-numbered providers match first; default 100. */
  priority?: number;
}
