import { LRUCache } from "lru-cache";
import { cache } from "react";
import { formatDateWithoutTimezone } from "@/lib/date-utils";
import {
  PostStatus,
  PostType,
  type Prisma,
  type Tag,
} from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { PostData } from "@/types/post";

// ===== NAVIGATION QUERY TYPES =====

interface NavPostEntry {
  id: string;
  lastEdited: Date;
  originalId: string;
  title: string;
  type: PostType;
}

interface NavPostCategory {
  count: number;
  name: string;
  posts: NavPostEntry[];
  type: "NAV";
}

interface TagForNav {
  count: number;
  name: string;
  posts: string[]; // Post IDs
}

interface PostForTimeline {
  id: string;
  lastEdited: Date;
  originalId: string;
  title: string;
  type: PostType;
}

interface TimelineEntry {
  date: Date;
  formattedDate: string;
  monthKey: string;
  posts: PostForTimeline[];
}

// Define the type for post with includes
type PostWithIncludes = Prisma.PostGetPayload<{
  include: {
    tags: true;
    categories: true;
    hlexiconEntries: true;
    _count: {
      select: { hlexiconEntries: true };
    };
  };
}>;

// Define pagination type
interface PaginationResult {
  hasNext: boolean;
  hasPrev: boolean;
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

// LRU Cache configuration for better performance
// biome-ignore lint/suspicious/noExplicitAny: general-purpose cache stores heterogeneous types
const postCache = new LRUCache<string, any>({
  max: 500, // Maximum number of items
  ttl: 1000 * 60 * 5, // 5 minutes TTL
});

// Sort options for post queries
export type PostSortOption =
  | "newest"
  | "oldest"
  | "title_asc"
  | "title_desc"
  | "updated";

// Pagination options
export interface PaginationOptions {
  limit?: number;
  page?: number;
  skip?: number;
  take?: number;
}

// Query filters
export interface PostFilters {
  categorySlugs?: string[];
  published?: boolean;
  status?: PostStatus | PostStatus[];
  tagSlugs?: string[];
  type?: PostType;
}

export type { DEFAULT_POST_ID } from "@/lib/constants";

// Helper function to get sort order from option
function getSortOrder(sort: PostSortOption = "newest") {
  switch (sort) {
    case "newest":
      return { createdAt: "desc" as const };
    case "oldest":
      return { createdAt: "asc" as const };
    case "title_asc":
      return { title: "asc" as const };
    case "title_desc":
      return { title: "desc" as const };
    case "updated":
      return { updatedAt: "desc" as const };
    default:
      return { createdAt: "desc" as const };
  }
}

// Helper function to build where clause from filters
function buildWhereClause(filters: PostFilters = {}): Prisma.PostWhereInput {
  const where: Prisma.PostWhereInput = {};

  // Handle status filter (prioritize PostStatus over published boolean)
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      where.status = { in: filters.status };
    } else {
      where.status = filters.status;
    }
  } else if (filters.published === undefined) {
    // Default to published posts only
    where.status = { in: [PostStatus.PUBLISHED] };
  } else {
    // Fallback to published boolean if no status specified
    where.published = filters.published;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.tagSlugs && filters.tagSlugs.length > 0) {
    where.tags = {
      some: {
        slug: { in: filters.tagSlugs },
      },
    };
  }

  if (filters.categorySlugs && filters.categorySlugs.length > 0) {
    where.categories = {
      some: {
        slug: { in: filters.categorySlugs },
      },
    };
  }

  return where;
}

// Enhanced getPostBySlug with caching and better error handling
export const getPostBySlug = cache(async (slug: string) => {
  try {
    const cacheKey = `post:${slug}`;
    const cached = postCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        tags: true,
        categories: true,
        hlexiconEntries: true,
      },
    });

    if (!post) {
      return null;
    }

    // Only return published posts for public access
    if (post.status !== PostStatus.PUBLISHED) {
      return null;
    }

    postCache.set(cacheKey, post);
    return post;
  } catch {
    return null;
  }
});

// Enhanced query function with pagination, filtering, and sorting
export const getPosts = cache(
  async (
    filters: PostFilters = {},
    pagination: PaginationOptions = {},
    sort: PostSortOption = "newest"
  ) => {
    try {
      const cacheKey = `posts:${JSON.stringify({ filters, pagination, sort })}`;
      const cached = postCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const where = buildWhereClause(filters);
      const orderBy = getSortOrder(sort);

      // Handle pagination
      const skip =
        pagination.skip ??
        ((pagination.page ?? 1) - 1) * (pagination.limit ?? 10);
      const take = pagination.take ?? pagination.limit ?? 10;

      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          include: {
            tags: true,
            categories: true,
            hlexiconEntries: true,
            _count: {
              select: { hlexiconEntries: true },
            },
          },
          orderBy,
          skip: skip > 0 ? skip : undefined,
          take: take > 0 ? take : undefined,
        }),
        prisma.post.count({ where }),
      ]);

      const result: {
        posts: PostWithIncludes[];
        pagination: PaginationResult;
      } = {
        posts,
        pagination: {
          total,
          page: pagination.page ?? 1,
          limit: take,
          totalPages: Math.ceil(total / take),
          hasNext: skip + take < total,
          hasPrev: skip > 0,
        },
      };

      postCache.set(cacheKey, result);
      return result;
    } catch {
      throw new Error("Failed to fetch posts");
    }
  }
);

// Simplified functions for backward compatibility
export const getAllPublishedPosts = cache(async () => {
  const result = await getPosts(
    { status: PostStatus.PUBLISHED },
    { take: 1000 }
  );
  return result.posts;
});

export const getPostsByType = cache(async (type: PostType) => {
  const result = await getPosts(
    {
      status: PostStatus.PUBLISHED,
      type,
    },
    { take: 1000 }
  );
  return result.posts;
});

export const getPostsByTag = cache(async (tagSlug: string) => {
  const tag = await prisma.tag.findUnique({
    where: { slug: tagSlug },
    include: {
      posts: {
        where: { status: PostStatus.PUBLISHED },
        include: {
          tags: true,
          categories: true,
        },
      },
    },
  });

  return tag?.posts || [];
});

export const getPostsByTagName = cache(async (tagName: string) => {
  try {
    const cacheKey = `posts-by-tag-name:${tagName}`;
    const cached = postCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const tag = await prisma.tag.findUnique({
      where: { name: tagName },
      include: {
        posts: {
          where: {
            status: PostStatus.PUBLISHED,
          },
          include: {
            tags: true,
            categories: true,
          },
          orderBy: {
            lastEdited: "desc",
          },
        },
      },
    });

    const posts = tag?.posts || [];
    postCache.set(cacheKey, posts);
    return posts;
  } catch {
    return [];
  }
});

export const getPostsByCategory = cache(async (categorySlug: string) => {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    include: {
      posts: {
        where: { status: PostStatus.PUBLISHED },
        include: {
          tags: true,
          categories: true,
        },
      },
    },
  });

  return category?.posts || [];
});

export const getAllCategories = cache(async () =>
  prisma.category.findMany({
    include: {
      _count: {
        select: { posts: { where: { status: PostStatus.PUBLISHED } } },
      },
    },
  })
);

// Legacy function to maintain compatibility with existing code
export async function getRawPostDataById(id: string): Promise<PostData | null> {
  const post = await getPostBySlug(id);

  if (!post) {
    return null;
  }

  return {
    id: post.slug,
    title: post.title,
    isMdx: true, // All posts from database are MDX
    rawContent: post.content,
    lastEdited: post.lastEdited,
    createdAt: post.createdAt,
    type: post.type,
    tags: post.tags.map((tag: Tag) => tag.name), // Extract tag names from the tag objects
  };
}

// Get recent posts with limit
export const getRecentPosts = cache(async (limit = 5) => {
  const result = await getPosts(
    { status: PostStatus.PUBLISHED },
    { take: limit },
    "newest"
  );
  return result.posts;
});

// Get posts with pagination
export const getPostsWithPagination = cache(
  async (
    page = 1,
    limit = 10,
    filters: PostFilters = {},
    sort: PostSortOption = "newest"
  ) => getPosts(filters, { page, limit }, sort)
);

// Search posts by title or content
export const searchPosts = cache(
  async (
    searchTerm: string,
    pagination: PaginationOptions = {},
    filters: PostFilters = {}
  ) => {
    try {
      const where = {
        ...buildWhereClause(filters),
        OR: [
          { title: { contains: searchTerm, mode: "insensitive" as const } },
          { content: { contains: searchTerm, mode: "insensitive" as const } },
          { excerpt: { contains: searchTerm, mode: "insensitive" as const } },
        ],
      };

      const skip =
        pagination.skip ??
        ((pagination.page ?? 1) - 1) * (pagination.limit ?? 10);
      const take = pagination.take ?? pagination.limit ?? 10;

      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          include: {
            tags: true,
            categories: true,
            hlexiconEntries: true,
          },
          orderBy: { updatedAt: "desc" },
          skip: skip > 0 ? skip : undefined,
          take: take > 0 ? take : undefined,
        }),
        prisma.post.count({ where }),
      ]);

      return {
        posts,
        pagination: {
          total,
          page: pagination.page ?? 1,
          limit: take,
          totalPages: Math.ceil(total / take),
          hasNext: skip + take < total,
          hasPrev: skip > 0,
        },
      } as { posts: PostWithIncludes[]; pagination: PaginationResult };
    } catch {
      throw new Error("Failed to search posts");
    }
  }
);

// Get all available post IDs for navigation
export const getAllAvailablePostIds = cache(async (): Promise<string[]> => {
  const rows = await prisma.post.findMany({
    where: { status: PostStatus.PUBLISHED },
    select: { slug: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => r.slug);
});

// Get post count by status
export const getPostCountByStatus = cache(async () => {
  try {
    const counts = await prisma.post.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    });

    return counts.reduce(
      (acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      },
      {} as Record<PostStatus, number>
    );
  } catch {
    return {} as Record<PostStatus, number>;
  }
});

// Clear cache function for cache invalidation
export function clearPostCache(pattern?: string) {
  if (pattern) {
    // Clear specific cache entries matching pattern
    for (const key of postCache.keys()) {
      if (key.includes(pattern)) {
        postCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    postCache.clear();
  }
}

// ===== NEW NAVIGATION QUERY FUNCTIONS =====

/**
 * Get all concrete post IDs for navigation
 * @returns Promise<string[]> Array of concrete post slugs
 */
export const getAllConcretePostIds = cache(async (): Promise<string[]> => {
  try {
    const cacheKey = "concrete-post-ids";
    const cached = postCache.get(cacheKey);
    if (cached) {
      return cached as string[];
    }

    const concretePosts = await prisma.post.findMany({
      where: {
        type: PostType.CONCRETE,
        status: PostStatus.PUBLISHED,
      },
      select: {
        slug: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const slugs = concretePosts.map((post) => post.slug);
    postCache.set(cacheKey, slugs);
    return slugs;
  } catch {
    return []; // Return empty array on error to prevent UI crashes
  }
});

/**
 * Get all navigable posts (BLOG, FINDING, SIGHT) with their categories for navigation
 * @returns Promise<NavPostCategory[]> Array of posts grouped by categories
 */
export const getAllNavigablePostsWithCategories = cache(
  async (): Promise<NavPostCategory[]> => {
    try {
      const cacheKey = "nav-posts-with-categories";
      const cached = postCache.get(cacheKey);
      if (cached) {
        return cached as NavPostCategory[];
      }

      const navPosts = await prisma.post.findMany({
        where: {
          status: PostStatus.PUBLISHED,
          type: { in: [PostType.BLOG, PostType.FINDING, PostType.SIGHT] },
        },
        include: {
          categories: true,
        },
        orderBy: {
          lastEdited: "desc",
        },
      });

      const categoryMap = new Map<
        string,
        { posts: NavPostEntry[]; count: number }
      >();
      const uncategorizedPosts: NavPostEntry[] = [];

      navPosts.forEach((post) => {
        const postForNav: NavPostEntry = {
          id: post.slug,
          title: post.title,
          type: post.type,
          lastEdited: post.lastEdited,
          originalId: post.slug,
        };

        if (post.categories.length === 0) {
          uncategorizedPosts.push(postForNav);
        } else {
          post.categories.forEach((category) => {
            let categoryData = categoryMap.get(category.name);
            if (!categoryData) {
              categoryData = { posts: [], count: 0 };
              categoryMap.set(category.name, categoryData);
            }
            categoryData.posts.push(postForNav);
            categoryData.count++;
          });
        }
      });

      const result: NavPostCategory[] = Array.from(categoryMap.entries()).map(
        ([name, data]) => ({
          name,
          posts: data.posts,
          count: data.count,
          type: "NAV" as const,
        })
      );

      if (uncategorizedPosts.length > 0) {
        result.push({
          name: "Uncategorized",
          posts: uncategorizedPosts,
          count: uncategorizedPosts.length,
          type: "NAV" as const,
        });
      }

      // Sort categories by post count (descending)
      result.sort((a, b) => b.count - a.count);

      postCache.set(cacheKey, result);
      return result;
    } catch {
      return [];
    }
  }
);

/**
 * Get all unique tags from the database
 * @returns Promise<TagForNav[]> Array of all tags with their post counts
 */
export const getAllTags = cache(async (): Promise<TagForNav[]> => {
  try {
    const cacheKey = "all-tags";
    const cached = postCache.get(cacheKey);
    if (cached) {
      return cached as TagForNav[];
    }

    const tags = await prisma.tag.findMany({
      include: {
        posts: {
          where: {
            status: PostStatus.PUBLISHED,
          },
          select: {
            slug: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const result: TagForNav[] = tags
      .filter((tag) => tag.posts.length > 0) // Only include tags with published posts
      .map((tag) => ({
        name: tag.name,
        count: tag.posts.length,
        posts: tag.posts.map((post) => post.slug),
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    postCache.set(cacheKey, result);
    return result;
  } catch {
    return [];
  }
});

/**
 * Get all posts ordered by last edited date for timeline
 * @returns Promise<TimelineEntry[]> Array of posts grouped by date
 */
export const getAllPostsByLastEdited = cache(
  async (): Promise<TimelineEntry[]> => {
    try {
      const cacheKey = "posts-by-last-edited";
      const cached = postCache.get(cacheKey);
      if (cached) {
        return cached as TimelineEntry[];
      }

      const allPosts = await prisma.post.findMany({
        where: {
          status: PostStatus.PUBLISHED,
        },
        select: {
          slug: true,
          title: true,
          type: true,
          originalDate: true,
          lastEdited: true,
          createdAt: true,
        },
        orderBy: {
          originalDate: "desc",
        },
      });

      // Group posts by month and year
      const timelineMap = new Map<string, TimelineEntry>();

      allPosts.forEach((post) => {
        // Use originalDate if available, fallback to createdAt (not lastEdited which is sync time)
        const date = post.originalDate || post.createdAt;
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const formattedDate = formatDateWithoutTimezone(date, {
          year: "numeric",
          month: "long",
        });

        if (!timelineMap.has(monthKey)) {
          timelineMap.set(monthKey, {
            date,
            posts: [],
            formattedDate,
            monthKey,
          });
        }

        const timelinePost: PostForTimeline = {
          id: post.slug,
          title: post.title,
          type: post.type,
          lastEdited: post.originalDate || post.createdAt, // Use originalDate for display
          originalId: post.slug,
        };

        timelineMap.get(monthKey)?.posts.push(timelinePost);
      });

      const result: TimelineEntry[] = Array.from(timelineMap.values()).sort(
        (a, b) => b.date.getTime() - a.date.getTime()
      ); // Most recent first

      postCache.set(cacheKey, result);
      return result;
    } catch {
      return [];
    }
  }
);
