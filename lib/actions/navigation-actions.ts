"use server";

import {
  getCachedChroniclePosts,
  getCachedNestedCategoriesWithCounts,
  getCachedPostTypeCounts,
  getCachedTagsWithMetadata,
} from "@/lib/cached-posts";
import { formatDateWithoutTimezone } from "@/lib/date-utils";
import { PostStatus, PostType } from "@/lib/generated/prisma";
import { POST_DATE_DESC } from "@/lib/post-ordering";
import {
  getAllCategories,
  getAllNavigablePostsWithCategories,
  getAllPostsByLastEdited,
  getAllPublishedPosts,
  getAllTags,
  getPostsByTagName,
} from "@/lib/posts";
import { prisma } from "@/lib/prisma";
import {
  GetCategoryPostsInputSchema,
  GetPostsByCategoryNameInputSchema,
  GetPostsByTagNameInputSchema,
  GetPostsByTypeInputSchema,
  validateInput,
} from "@/lib/validation/navigation-schemas";
import type {
  CategoryNode,
  PostTypeCount,
  TagWithMetadata,
} from "@/types/navigation";

interface FindingsByDate {
  count: number;
  date: string;
  formattedDate: string;
  slug: string;
}

/**
 * Server action to get all navigable posts (BLOG, FINDING, SIGHT) grouped by categories
 */
export async function getNavigablePostsWithCategoriesAction() {
  try {
    return await getAllNavigablePostsWithCategories();
  } catch {
    return [];
  }
}

/**
 * Server action to get all tags
 */
export async function getAllTagsAction() {
  try {
    return await getAllTags();
  } catch {
    return [];
  }
}

/**
 * Server action to get all posts by last edited date
 */
export async function getAllPostsByLastEditedAction() {
  try {
    return await getAllPostsByLastEdited();
  } catch {
    return [];
  }
}

/**
 * Server action to get posts by tag name with input validation and optional type filter
 */
export async function getPostsByTagNameAction(
  tagName: string,
  postTypes?: PostType[]
) {
  const validation = validateInput(GetPostsByTagNameInputSchema, { tagName });

  if (!validation.success) {
    throw new Error(`Invalid tag name: ${validation.error}`);
  }

  try {
    const posts = await getPostsByTagName(validation.data.tagName);

    // Filter by post types if provided
    if (postTypes && postTypes.length > 0) {
      return posts.filter((post: { type: PostType | string }) =>
        postTypes.includes(post.type as PostType)
      );
    }

    return posts;
  } catch {
    return [];
  }
}

/**
 * Server action to get the number of related posts per tag, excluding a given post slug.
 * Used by post-tag UI to disable tags that have no other posts behind them.
 */
export async function getRelatedPostCountsByTagsAction(
  tagNames: string[],
  excludePostSlug: string
): Promise<Record<string, number>> {
  const validNames = Array.from(
    new Set(
      tagNames.filter(
        (name): name is string =>
          typeof name === "string" && name.trim().length > 0
      )
    )
  );

  if (validNames.length === 0) {
    return {};
  }

  try {
    const tags = await prisma.tag.findMany({
      where: { name: { in: validNames } },
      select: {
        name: true,
        _count: {
          select: {
            posts: {
              where: {
                status: PostStatus.PUBLISHED,
                slug: { not: excludePostSlug },
              },
            },
          },
        },
      },
    });

    const result: Record<string, number> = {};
    for (const name of validNames) {
      result[name] = 0;
    }
    for (const tag of tags) {
      result[tag.name] = tag._count.posts;
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Server action to get all findings grouped by date
 */
export async function getAllFindingsByDateAction(): Promise<FindingsByDate[]> {
  try {
    // Query dynamic findings posts from database instead of reading files
    const dynamicFindingPosts = await prisma.post.findMany({
      where: {
        type: PostType.FINDING,
        status: PostStatus.PUBLISHED,
      },
      select: {
        slug: true,
        originalDate: true,
        createdAt: true,
        findingsCount: true,
      },
      orderBy: {
        originalDate: "desc",
      },
    });

    return dynamicFindingPosts.map((post) => {
      // Use originalDate (from frontmatter) if available, otherwise fall back to createdAt
      const date = post.originalDate || post.createdAt;
      const formattedDate = formatDateWithoutTimezone(date, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Extract date from slug (findings-YYYY-MM-DD) for consistency
      const dateMatch = post.slug.match(/findings-(\d{4}-\d{2}-\d{2})/);
      const dateString = dateMatch
        ? dateMatch[1]
        : new Date(date).toISOString().split("T")[0];

      return {
        date: dateString, // YYYY-MM-DD format
        formattedDate,
        count: post.findingsCount || 0,
        slug: post.slug,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Server action to get all categories with post counts
 */
export async function getAllCategoriesAction() {
  try {
    return await getAllCategories();
  } catch {
    return [];
  }
}

/**
 * Server action to get all sights grouped by date
 */
export async function getAllSightsByDateAction(): Promise<FindingsByDate[]> {
  try {
    const dynamicSightPosts = await prisma.post.findMany({
      where: {
        type: PostType.SIGHT,
        slug: {
          startsWith: "sights-",
        },
        status: PostStatus.PUBLISHED,
      },
      select: {
        slug: true,
        originalDate: true,
        createdAt: true,
        findingsCount: true, // Reused for sight count
      },
      orderBy: {
        originalDate: "desc",
      },
    });

    return dynamicSightPosts.map((post) => {
      const date = post.originalDate || post.createdAt;
      const formattedDate = formatDateWithoutTimezone(date, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const dateMatch = post.slug.match(/sights-(\d{4}-\d{2}-\d{2})/);
      const dateString = dateMatch
        ? dateMatch[1]
        : new Date(date).toISOString().split("T")[0];

      return {
        date: dateString,
        formattedDate,
        count: post.findingsCount || 0,
        slug: post.slug,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Server action wrapper for Chronicle posts.
 * Data fetching + caching lives in `lib/cached-posts.ts`.
 */
export async function getChroniclePostsAction() {
  try {
    return await getCachedChroniclePosts();
  } catch {
    return [];
  }
}

/**
 * Server action to get all published posts with full navigation data
 * This provides all posts with their categories and tags for client-side navigation
 */
export async function getAllPostsForNavigationAction() {
  try {
    const posts = await getAllPublishedPosts();

    // Transform to include proper category and tag arrays
    return posts.map(
      (post: {
        slug: string;
        title: string;
        type: string;
        originalDate?: Date | null;
        lastEdited: Date;
        createdAt: Date;
        tags?: Array<{ name: string }>;
        categories?: Array<{ name: string }>;
      }) => ({
        id: post.slug,
        originalId: post.slug,
        title: post.title,
        type: post.type,
        originalDate: post.originalDate,
        lastEdited: post.originalDate || post.lastEdited, // Use originalDate if available
        createdAt: post.createdAt,
        tags: post.tags?.map((tag: { name: string }) => tag.name) || [],
        categories:
          post.categories?.map((category: { name: string }) => category.name) ||
          [],
      })
    );
  } catch {
    return [];
  }
}

/**
 * Server action wrapper for nested categories.
 * Data fetching + caching lives in `lib/cached-posts.ts`.
 */
export async function getNestedCategoriesWithCounts(): Promise<CategoryNode[]> {
  try {
    return await getCachedNestedCategoriesWithCounts();
  } catch {
    return [];
  }
}

/**
 * Server action to get posts filtered by type with input validation
 * Useful for navigation filtering by post type
 */
export async function getPostsByType(type: PostType) {
  const validation = validateInput(GetPostsByTypeInputSchema, { type });

  if (!validation.success) {
    throw new Error(`Invalid post type: ${validation.error}`);
  }

  try {
    const posts = await prisma.post.findMany({
      where: {
        type: validation.data.type,
        status: PostStatus.PUBLISHED,
      },
      include: {
        categories: true,
        tags: true,
      },
      orderBy: POST_DATE_DESC,
    });

    return posts;
  } catch {
    return [];
  }
}

/**
 * Server action wrapper for post type counts.
 * Data fetching + caching lives in `lib/cached-posts.ts`.
 */
export async function getPostTypeCounts(): Promise<PostTypeCount[]> {
  try {
    return await getCachedPostTypeCounts();
  } catch {
    return [];
  }
}

/**
 * Server action wrapper for tags-with-metadata.
 * Data fetching + caching lives in `lib/cached-posts.ts`.
 */
export async function getTagsWithMetadata(): Promise<TagWithMetadata[]> {
  try {
    return await getCachedTagsWithMetadata();
  } catch {
    return [];
  }
}

/**
 * Server action to get posts by category name with input validation
 */
export async function getPostsByCategoryName(categoryName: string) {
  const validation = validateInput(GetPostsByCategoryNameInputSchema, {
    categoryName,
  });

  if (!validation.success) {
    throw new Error(`Invalid category name: ${validation.error}`);
  }

  try {
    const category = await prisma.category.findUnique({
      where: { name: validation.data.categoryName },
      include: {
        posts: {
          where: {
            status: PostStatus.PUBLISHED,
            type: {
              in: [PostType.BLOG, PostType.FINDING, PostType.SIGHT],
            },
          },
          include: {
            tags: true,
            categories: true,
          },
          orderBy: POST_DATE_DESC,
        },
      },
    });

    return category?.posts || [];
  } catch {
    return [];
  }
}

/**
 * Server action to get posts by category path with hierarchical matching and input validation
 * This supports matching posts in nested categories and their parent categories
 */
export async function getCategoryPosts(
  categoryPath: string[],
  postTypes?: PostType[]
) {
  const validation = validateInput(GetCategoryPostsInputSchema, {
    categoryPath,
  });

  if (!validation.success) {
    throw new Error(`Invalid category path: ${validation.error}`);
  }

  try {
    const validatedPath = validation.data.categoryPath;

    if (!validatedPath || validatedPath.length === 0) {
      return [];
    }

    // Build the full path string from the array
    const pathString = validatedPath.join("/");

    // Find the category embedding for this path
    const categoryEmbedding = await prisma.categoryEmbedding.findUnique({
      where: { path: pathString },
    });

    if (!categoryEmbedding) {
      return [];
    }

    // Get all posts that match this category or any of its subcategories
    // We need to find categories that have paths starting with our path
    const matchingEmbeddings = await prisma.categoryEmbedding.findMany({
      where: {
        path: {
          startsWith: pathString,
        },
      },
    });

    // Extract the category names from the embeddings
    const categoryNames = matchingEmbeddings.map((embedding) => embedding.name);

    if (categoryNames.length === 0) {
      return [];
    }

    // Find posts that belong to any of these categories - filter by post types if provided
    // Default to all types if not specified
    const typeFilter =
      postTypes && postTypes.length > 0 ? postTypes : Object.values(PostType);

    // NOTE: To show draft posts (e.g., for logged-in users), add an additional filter:
    // status: { in: [PostStatus.PUBLISHED, PostStatus.DRAFT] }
    const posts = await prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED, // Only show published posts to public users
        type: {
          in: typeFilter,
        },
        categories: {
          some: {
            name: {
              in: categoryNames,
            },
          },
        },
      },
      include: {
        tags: {
          select: {
            name: true,
            slug: true,
          },
        },
        categories: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: POST_DATE_DESC,
    });

    return posts;
  } catch {
    return [];
  }
}
