/**
 * Database Service - Interface and implementation for database operations
 * Follows Single Responsibility Principle
 */

import { PrismaClient } from "@/lib/generated/prisma";

export type CategorySuggestion = {
  name: string;
  count: number;
};

export type TagSuggestion = {
  name: string;
  count: number;
};

export type DatabaseService = {
  getCategories(): Promise<CategorySuggestion[]>;
  getTags(): Promise<TagSuggestion[]>;
  getCategoryByName(name: string): Promise<CategorySuggestion | null>;
  getTagByName(name: string): Promise<TagSuggestion | null>;
  close(): Promise<void>;
};

/**
 * Prisma Database Service Implementation
 */
export class PrismaDatabaseService implements DatabaseService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getCategories(): Promise<CategorySuggestion[]> {
    try {
      const categories = await this.prisma.category.findMany({
        select: {
          name: true,
          _count: {
            select: {
              posts: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      return categories.map((cat) => ({
        name: cat.name,
        count: cat._count.posts,
      }));
    } catch (error) {
      console.warn("Failed to fetch categories from database:", error);
      return [];
    }
  }

  async getTags(): Promise<TagSuggestion[]> {
    try {
      const tags = await this.prisma.tag.findMany({
        select: {
          name: true,
          _count: {
            select: {
              posts: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      return tags.map((tag) => ({
        name: tag.name,
        count: tag._count.posts,
      }));
    } catch (error) {
      console.warn("Failed to fetch tags from database:", error);
      return [];
    }
  }

  async getCategoryByName(name: string): Promise<CategorySuggestion | null> {
    try {
      const category = await this.prisma.category.findUnique({
        where: { name },
        select: {
          name: true,
          _count: {
            select: {
              posts: true,
            },
          },
        },
      });

      return category
        ? {
            name: category.name,
            count: category._count.posts,
          }
        : null;
    } catch (error) {
      console.warn(`Failed to fetch category "${name}" from database:`, error);
      return null;
    }
  }

  async getTagByName(name: string): Promise<TagSuggestion | null> {
    try {
      const tag = await this.prisma.tag.findUnique({
        where: { name },
        select: {
          name: true,
          _count: {
            select: {
              posts: true,
            },
          },
        },
      });

      return tag
        ? {
            name: tag.name,
            count: tag._count.posts,
          }
        : null;
    } catch (error) {
      console.warn(`Failed to fetch tag "${name}" from database:`, error);
      return null;
    }
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

/**
 * Mock Database Service for testing
 */
export class MockDatabaseService implements DatabaseService {
  private readonly mockCategories: CategorySuggestion[] = [
    { name: "technology", count: 15 },
    { name: "philosophy", count: 8 },
    { name: "productivity", count: 12 },
    { name: "design", count: 6 },
  ];

  private readonly mockTags: TagSuggestion[] = [
    { name: "ai", count: 10 },
    { name: "javascript", count: 8 },
    { name: "typescript", count: 6 },
    { name: "react", count: 12 },
    { name: "philosophy", count: 5 },
    { name: "productivity", count: 9 },
  ];

  async getCategories(): Promise<CategorySuggestion[]> {
    return [...this.mockCategories];
  }

  async getTags(): Promise<TagSuggestion[]> {
    return [...this.mockTags];
  }

  async getCategoryByName(name: string): Promise<CategorySuggestion | null> {
    return (
      this.mockCategories.find(
        (cat) => cat.name.toLowerCase() === name.toLowerCase()
      ) || null
    );
  }

  async getTagByName(name: string): Promise<TagSuggestion | null> {
    return (
      this.mockTags.find(
        (tag) => tag.name.toLowerCase() === name.toLowerCase()
      ) || null
    );
  }

  async close(): Promise<void> {
    // No-op for mock
  }
}

/**
 * Factory for creating database service instances
 */
export class DatabaseServiceFactory {
  static create(useMock = false): DatabaseService {
    return useMock ? new MockDatabaseService() : new PrismaDatabaseService();
  }
}
