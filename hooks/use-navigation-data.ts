"use client";

import { useMemo } from "react";
import type { RenderedPost } from "@/types/post";

// Types
interface Category {
  count: number;
  name: string;
  posts: RenderedPost[];
  type: "CONCRETE" | "BLOG";
}

interface Tag {
  count: number;
  name: string;
  posts: string[]; // Post IDs
}

interface TimelineEntry {
  date: Date;
  formattedDate: string;
  monthKey: string;
  posts: RenderedPost[];
}

interface NavigationData {
  blogPostIds: string[];
  categories: Category[];
  tags: Tag[];
  timeline: TimelineEntry[];
}

interface UseNavigationDataProps {
  allAvailablePostIds: string[];
  concretePostIds: string[];
  posts: RenderedPost[];
}

export function useNavigationData({
  posts,
  allAvailablePostIds,
  concretePostIds: _concretePostIds,
}: UseNavigationDataProps): NavigationData {
  return useMemo(() => {
    // Group posts by actual categories from post.categories array
    const categoryMap = new Map<
      string,
      { posts: RenderedPost[]; type: "CONCRETE" | "BLOG" }
    >();

    posts.forEach((post) => {
      // Use post.categories if available
      const postCategories = post.categories || [];
      const postType = (post.type as "CONCRETE" | "BLOG") || "BLOG";

      postCategories.forEach((categoryName: string) => {
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, { posts: [], type: postType });
        }
        categoryMap.get(categoryName)?.posts.push(post);
      });
    });

    const categories: Category[] = Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        posts: data.posts,
        count: data.posts.length,
        type: data.type,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count, most used first

    // Extract tags from ALL posts (including CONCRETE)
    const tagMap = new Map<string, { count: number; posts: string[] }>();

    posts.forEach((post) => {
      // Use post.tags if available, otherwise skip
      const postTags = post.tags || [];

      postTags.forEach((tag: string) => {
        let tagData = tagMap.get(tag);
        if (!tagData) {
          tagData = { count: 0, posts: [] };
          tagMap.set(tag, tagData);
        }
        tagData.count++;
        tagData.posts.push(post.originalId);
      });
    });

    const tags: Tag[] = Array.from(tagMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        posts: data.posts,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count, most used first

    // Create timeline grouped by month, excluding FINDING posts
    const timelineMap = new Map<string, TimelineEntry>();

    posts.forEach((post) => {
      // Filter out FINDING posts from timeline
      if (post.type === "FINDING") {
        return;
      }

      // Use post.lastEdited or post.createdAt if available
      const date = post.lastEdited || post.createdAt || new Date();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const formattedDate = date.toLocaleDateString("en-US", {
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

      timelineMap.get(monthKey)?.posts.push(post);
    });

    const timeline: TimelineEntry[] = Array.from(timelineMap.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    ); // Most recent first

    // Get blog post IDs (excluding FINDING posts)
    const blogPosts = posts.filter(
      (post) =>
        post.type === "BLOG" && allAvailablePostIds.includes(post.originalId)
    );

    return {
      categories,
      tags,
      timeline,
      blogPostIds: blogPosts.map((post) => post.originalId),
    };
  }, [posts, allAvailablePostIds]);
}
