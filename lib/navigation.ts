import { cache } from "react";
import type { Post } from "./generated/prisma/client";
import { getPostsByType } from "./posts";

export type NavigationItem = {
  title: string;
  slug: string;
  type: "CONCRETE" | "BLOG";
};

export type NavigationData = {
  concretePages: NavigationItem[];
  blogPosts: NavigationItem[];
};

export const getNavigationData = cache(async (): Promise<NavigationData> => {
  const [concretePages, blogPosts] = await Promise.all([
    getPostsByType("CONCRETE"),
    getPostsByType("BLOG"),
  ]);

  return {
    concretePages: concretePages.map((post: Post) => ({
      title: post.title,
      slug: post.slug,
      type: "CONCRETE" as const,
    })),
    blogPosts: blogPosts.map((post: Post) => ({
      title: post.title,
      slug: post.slug,
      type: "BLOG" as const,
    })),
  };
});

// Helper function to get all navigation items in a flat array
export const getAllNavigationItems = cache(
  async (): Promise<NavigationItem[]> => {
    const { concretePages, blogPosts } = await getNavigationData();
    return [...concretePages, ...blogPosts];
  }
);

// Helper function to get navigation items by type
export const getNavigationItemsByType = cache(
  async (type: "CONCRETE" | "BLOG"): Promise<NavigationItem[]> => {
    const { concretePages, blogPosts } = await getNavigationData();
    return type === "CONCRETE" ? concretePages : blogPosts;
  }
);
