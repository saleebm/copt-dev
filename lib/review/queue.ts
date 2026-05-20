// Aggregates open / recent PRs and annotates each with provider info so the
// iOS Shortcut can render a typed list ("3 Findings, 1 Sight pending").
//
// This is the source of truth for "what's reviewable right now" — both the
// queue and PR-detail routes delegate here.
import {
  closePullRequest,
  type GhPrSummary,
  listPullRequests,
  type MergeMethod,
  markPullRequestReady,
  mergePullRequest,
  readPrFile,
  viewPullRequest,
} from "./gh";
import { type ProviderSummary, summarizePr } from "./providers";

export interface ReviewQueueItem {
  author: string | null;
  branch: string;
  createdAt: string;
  isDraft: boolean;
  labels: string[];
  number: number;
  provider: ProviderSummary;
  title: string;
  updatedAt: string;
  url: string;
}

function decorate(pr: GhPrSummary): ReviewQueueItem {
  return {
    number: pr.number,
    title: pr.title,
    url: pr.url,
    branch: pr.headRefName,
    isDraft: pr.isDraft,
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    author: pr.author?.login ?? null,
    labels: pr.labels.map((l) => l.name),
    provider: summarizePr(pr),
  };
}

export interface ListQueueOptions {
  branchPrefix?: string; // default: "ingest/" to scope to ingest PRs
  includeNonIngest?: boolean; // if true, drops the branchPrefix filter
  limit?: number;
  state?: "open" | "closed" | "merged" | "all";
  type?: string; // filter by provider id ("finding", "sight", ...)
}

export async function listReviewQueue(
  opts: ListQueueOptions = {}
): Promise<ReviewQueueItem[]> {
  const prs = await listPullRequests({
    state: opts.state ?? "open",
    limit: opts.limit ?? 50,
  });
  const branchPrefix = opts.includeNonIngest
    ? undefined
    : (opts.branchPrefix ?? "ingest/");
  const filtered = prs.filter((pr) => {
    if (branchPrefix && !pr.headRefName.startsWith(branchPrefix)) {
      return false;
    }
    return true;
  });
  // Re-fetch each PR with full fields so provider matchers can read files.
  const detailed = await Promise.all(
    filtered.map((pr) => viewPullRequest(pr.number))
  );
  const decorated = detailed.map(decorate);
  if (opts.type) {
    return decorated.filter((item) => item.provider.id === opts.type);
  }
  return decorated;
}

export interface ReviewPrDetail extends ReviewQueueItem {
  body: string;
  files: { path: string; additions: number; deletions: number }[];
  mdxPreview: string | null;
  mergeable: string;
  state: string;
}

export async function getReviewPrDetail(num: number): Promise<ReviewPrDetail> {
  const pr = await viewPullRequest(num);
  const base = decorate(pr);
  const mdxPath = base.provider.mdxPath;
  const mdxPreview = mdxPath ? await readPrFile(num, mdxPath) : null;
  return {
    ...base,
    body: pr.body,
    state: pr.state,
    mergeable: pr.mergeable,
    files: pr.files,
    mdxPreview,
  };
}

export interface MergeArgs {
  admin?: boolean;
  body?: string;
  deleteBranch?: boolean;
  /** If the PR is draft, mark it ready before merging. Default true. */
  markReady?: boolean;
  method?: MergeMethod;
  number: number;
}

export interface MergeResult {
  branch: string;
  markedReady: boolean;
  number: number;
  predictedSlug: string | null;
  provider: ProviderSummary;
}

export async function mergeReviewPr(args: MergeArgs): Promise<MergeResult> {
  const pr = await viewPullRequest(args.number);
  const provider = summarizePr(pr);
  let markedReady = false;
  if (pr.isDraft && args.markReady !== false) {
    await markPullRequestReady(args.number);
    markedReady = true;
  }
  await mergePullRequest(args.number, {
    method: args.method ?? "squash",
    admin: args.admin,
    deleteBranch: args.deleteBranch !== false,
    body: args.body,
  });
  return {
    number: args.number,
    branch: pr.headRefName,
    provider,
    predictedSlug: provider.predictedSlug,
    markedReady,
  };
}

export async function closeReviewPr(
  num: number,
  comment?: string
): Promise<{ number: number }> {
  await closePullRequest(num, comment);
  return { number: num };
}
