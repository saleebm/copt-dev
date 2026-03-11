"use server";

import { formatDateWithoutTimezone } from "@/lib/date-utils";
import { PostStatus, PostType } from "@/lib/generated/prisma";
import { CategoryTreeBuilder } from "@/lib/navigation/category-tree-builder";
import {
  getAllBlogPostsWithCategories,
  getAllCategories,
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
 * Server action to get all blog posts grouped by categories
 */
export async function getBlogPostsWithCategoriesAction() {
  try {
    return await getAllBlogPostsWithCategories();
  } catch (_error) {
    return [];
  }
}

/**
 * Server action to get all tags
 */
export async function getAllTagsAction() {
  try {
    return await getAllTags();
  } catch (_error) {
    return [];
  }
}

/**
 * Server action to get all posts by last edited date
 */
export async function getAllPostsByLastEditedAction() {
  try {
    return await getAllPostsByLastEdited();
  } catch (_error) {
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
  } catch (_error) {
    return [];
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
  } catch (_error) {
    return [];
  }
}

/**
 * Server action to get all categories with post counts
 */
export async function getAllCategoriesAction() {
  try {
    return await getAllCategories();
  } catch (_error) {
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
  } catch (_error) {
    return [];
  }
}

/**
 * Server action: Fetch Chronicle posts (FINDING and SIGHT) ordered by originalDate desc
 * Skips any records without originalDate to ensure stable chronology without runtime hacks
 */
export async function getChroniclePostsAction() {
  try {
    const posts = await prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        type: { in: [PostType.FINDING, PostType.SIGHT] },
        NOT: { originalDate: null },
      },
      include: {
        tags: { select: { name: true } },
        categories: { select: { name: true } },
      },
      orderBy: [{ originalDate: "desc" }, { createdAt: "desc" }],
    });

    // Transform minimal shape for navigation consumption
    return posts.map((p) => ({
      id: p.slug,
      slug: p.slug,
      title: p.title,
      type: p.type,
      originalDate: p.originalDate!,
      tags: p.tags?.map((t) => ({ name: t.name })) ?? [],
      categories: p.categories?.map((c) => ({ name: c.name })) ?? [],
    }));
  } catch (_error) {
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
  } catch (_error) {
    return [];
  }
}

/**
 * Server action to get nested categories with hierarchy from CategoryEmbedding
 * Returns a tree structure with full post type distributions for client-side filtering
 * NOTE: Always returns all categories with complete post type counts - filtering happens client-side
 */
export async function getNestedCategoriesWithCounts(): Promise<CategoryNode[]> {
  try {
    // Fetch all category embeddings
    const embeddings = await prisma.categoryEmbedding.findMany({
      orderBy: {
        path: "asc",
      },
    });

    // Fetch category post counts with ALL post types (no filtering)
    // Client will filter based on user selection
    const categoryCounts = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            posts: {
              where: {
                status: PostStatus.PUBLISHED,
              },
            },
          },
        },
        posts: {
          where: {
            status: PostStatus.PUBLISHED,
          },
          select: {
            type: true,
          },
        },
      },
    });

    const _totalPosts = categoryCounts.reduce(
      (sum, cat) => sum + cat._count.posts,
      0
    );

    // Log categories with posts
    const categoriesWithPosts = categoryCounts.filter(
      (cat) => cat._count.posts > 0
    );
    // Categories with posts are available for logging if needed
    categoriesWithPosts.slice(0, 5);

    // Transform to a more usable structure - use name (kebab-case) to match with embeddings
    const categoryData = categoryCounts.map((cat) => ({
      name: cat.name, // Keep kebab-case name for matching with CategoryEmbedding
      displayName: cat.displayName, // Human-readable name for display
      postCount: cat._count.posts,
      postTypes: cat.posts.reduce(
        (acc, post) => {
          acc[post.type] = (acc[post.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    }));

    // Build the tree structure with full counts
    // NOTE: No pruning here - client will filter based on selected post types
    const builder = new CategoryTreeBuilder(embeddings, categoryData);
    return builder.buildTree();
  } catch (_error) {
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return posts;
  } catch (_error) {
    return [];
  }
}

/**
 * Server action to get post type counts for filtering UI
 */
export async function getPostTypeCounts(): Promise<PostTypeCount[]> {
  try {
    const counts = await prisma.post.groupBy({
      by: ["type"],
      where: {
        status: PostStatus.PUBLISHED,
      },
      _count: {
        type: true,
      },
    });

    const total = counts.reduce((sum, item) => sum + item._count.type, 0);

    return counts.map((item) => ({
      type: item.type,
      count: item._count.type,
      percentage: total > 0 ? (item._count.type / total) * 100 : 0,
    }));
  } catch (_error) {
    return [];
  }
}

/**
 * Server action to get tags with metadata for intelligent display
 * Returns all tags with full post type distributions for client-side filtering
 * Filters out findings-summary and sights-summary tags by default
 */
export async function getTagsWithMetadata(): Promise<TagWithMetadata[]> {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        posts: {
          where: {
            status: PostStatus.PUBLISHED,
          },
          select: {
            type: true,
          },
        },
      },
    });

    // Filter out auto-generated date-based tags and patterns that clutter the view
    const filteredTags = tags.filter((tag) => {
      // Exclude findings and sights date patterns
      const datePatterns = [
        /^findings-\d{4}-\d{2}-\d{2}$/, // findings-YYYY-MM-DD
        /^sights-\d{4}-\d{2}-\d{2}$/, // sights-YYYY-MM-DD
        /^findings-summary/, // findings-summary tags
        /^sights-summary/, // sights-summary tags
        /^\d{4}-\d{2}-\d{2}$/, // Pure date tags YYYY-MM-DD
        /^\d{8}$/, // Date tags YYYYMMDD
      ];

      // Check if tag matches any excluded pattern
      const isExcluded = datePatterns.some(
        (pattern) => pattern.test(tag.slug) || pattern.test(tag.name)
      );

      return !isExcluded && tag.posts.length > 0;
    });

    // Calculate max post count for weight normalization
    const maxCount = Math.max(
      ...filteredTags.map((tag) => tag.posts.length),
      1
    );

    return filteredTags.map((tag) => {
      // Calculate post type distribution
      const distribution = {
        CONCRETE: 0,
        BLOG: 0,
        FINDING: 0,
        SIGHT: 0,
      };

      tag.posts.forEach((post) => {
        if (post.type in distribution) {
          distribution[post.type]++;
        }
      });

      return {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        postCount: tag.posts.length,
        postTypes: distribution,
        weight: tag.posts.length / maxCount, // Normalized 0-1
        isAutoGenerated: false,
        // Could add clustering logic here based on co-occurrence
        cluster: undefined,
      } as TagWithMetadata;
    });
  } catch (_error) {
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
          orderBy: {
            lastEdited: "desc",
          },
        },
      },
    });

    return category?.posts || [];
  } catch (_error) {
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
      orderBy: [
        { originalDate: "desc" }, // Use originalDate as primary sort (Issue #2 fix)
        { lastEdited: "desc" }, // Fallback to lastEdited
      ],
    });

    return posts;
  } catch (_error) {
    return [];
  }
}
