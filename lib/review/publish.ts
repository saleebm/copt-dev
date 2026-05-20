// Publish toggle for an individual post. The DB is the runtime truth — the
// MDX file's `published` frontmatter is what `bun run db:sync-posts` will
// eventually reconcile to on the next deploy.
//
// This module only touches the DB. If the user wants the change to survive
// a re-sync, they must also flip the frontmatter (or, more commonly, just
// leave the post as the default for its type — concrete pages stay
// published, freshly-ingested posts default to draft).
import { type Post, PostStatus, type PostType } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { providerById } from "./providers";

export interface PublishToggleInput {
  published: boolean;
  slug: string;
}

export interface PublishToggleResult {
  published: boolean;
  slug: string;
  status: PostStatus;
  title: string;
  type: PostType;
  updatedAt: Date;
}

export async function setPublished(
  input: PublishToggleInput
): Promise<PublishToggleResult> {
  const existing = await prisma.post.findUnique({
    where: { slug: input.slug },
  });
  if (!existing) {
    throw new Error(`post not found: ${input.slug}`);
  }
  const updated = await prisma.post.update({
    where: { slug: input.slug },
    data: {
      published: input.published,
      status: input.published ? PostStatus.PUBLISHED : PostStatus.DRAFT,
    },
  });
  const provider = providerByPostType(updated.type);
  if (provider?.onPublishChange) {
    await provider.onPublishChange({
      post: updated,
      published: input.published,
    });
  }
  return {
    slug: updated.slug,
    title: updated.title,
    type: updated.type,
    published: updated.published,
    status: updated.status,
    updatedAt: updated.updatedAt,
  };
}

function providerByPostType(type: PostType) {
  const id = type.toLowerCase();
  return providerById(id);
}

export interface RecentPostsFilters {
  limit?: number;
  status?: PostStatus;
  type?: PostType;
}

export interface RecentPostRow {
  createdAt: Date;
  originalUrl: string | null;
  providerId: string;
  published: boolean;
  slug: string;
  sourceType: string;
  status: PostStatus;
  title: string;
  type: PostType;
  updatedAt: Date;
}

export async function listRecentPosts(
  filters: RecentPostsFilters = {}
): Promise<RecentPostRow[]> {
  const rows: Post[] = await prisma.post.findMany({
    where: {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: filters.limit ?? 25,
  });
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    type: r.type,
    status: r.status,
    published: r.published,
    updatedAt: r.updatedAt,
    createdAt: r.createdAt,
    originalUrl: r.originalUrl,
    sourceType: r.sourceType,
    providerId: r.providerId,
  }));
}
