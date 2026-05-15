import type { Prisma } from "@/lib/generated/prisma";

/**
 * Canonical "post date" ordering. `originalDate` is the human-meaningful
 * publish/post date (from frontmatter / filename / body), `createdAt` is
 * the deterministic tiebreaker for posts that share a date or whose
 * `originalDate` is null. Postgres orders NULLs LAST for `DESC` by default,
 * so unparseable posts sink to the bottom rather than dominating the top.
 *
 * Use these constants everywhere posts are listed chronologically, so
 * editing a post does not change its sort position.
 */
export const POST_DATE_DESC: Prisma.PostOrderByWithRelationInput[] = [
  { originalDate: "desc" },
  { createdAt: "desc" },
];

export const POST_DATE_ASC: Prisma.PostOrderByWithRelationInput[] = [
  { originalDate: "asc" },
  { createdAt: "asc" },
];
