/**
 * File Service - Interface and implementation for file system operations
 * Follows Single Responsibility Principle
 */

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { PostType } from "@/lib/generated/prisma";

export type FileCreationRequest = {
  content: string;
  filePath: string;
  overwrite?: boolean;
};

export type FileCreationResult = {
  success: boolean;
  filePath: string;
  created: boolean;
  error?: string;
};

export type FileService = {
  createFile(request: FileCreationRequest): Promise<FileCreationResult>;
  ensureDirectory(dirPath: string): Promise<boolean>;
  fileExists(filePath: string): boolean;
  generateFilePath(title: string, type: PostType, category?: string): string;
};

/**
 * Bun File Service Implementation
 */
export class BunFileService implements FileService {
  private readonly projectRoot: string;

  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async createFile(request: FileCreationRequest): Promise<FileCreationResult> {
    try {
      const { content, filePath, overwrite = false } = request;

      // Check if file exists
      if (this.fileExists(filePath) && !overwrite) {
        return {
          success: false,
          filePath,
          created: false,
          error: "File already exists. Use overwrite flag to replace.",
        };
      }

      // Ensure directory exists
      const directory = filePath.substring(0, filePath.lastIndexOf("/"));
      const dirCreated = await this.ensureDirectory(directory);

      if (!dirCreated) {
        return {
          success: false,
          filePath,
          created: false,
          error: "Failed to create directory",
        };
      }

      // Write file
      await Bun.write(filePath, content);

      return {
        success: true,
        filePath,
        created: true,
      };
    } catch (error) {
      return {
        success: false,
        filePath: request.filePath,
        created: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async ensureDirectory(dirPath: string): Promise<boolean> {
    try {
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
      return true;
    } catch (error) {
      console.error("Failed to create directory:", dirPath, error);
      return false;
    }
  }

  fileExists(filePath: string): boolean {
    return existsSync(filePath);
  }

  generateFilePath(title: string, type: PostType, category?: string): string {
    const slug = this.slugify(title);
    const fileName = this.generateFileName(slug, type);
    const directory = this.getPostDirectory(type, category);

    return join(directory, fileName);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  }

  private generateFileName(slug: string, type: PostType): string {
    if (type === "BLOG") {
      // For blog posts, include date prefix
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const year = now.getFullYear();
      return `${month}${day}${year}-${slug}.mdx`;
    }

    return `${slug}.mdx`;
  }

  private getPostDirectory(type: PostType, category?: string): string {
    const baseDir = join(this.projectRoot, "posts");

    switch (type) {
      case "CONCRETE":
        return join(baseDir, "concrete");

      case "BLOG":
        if (category) {
          return join(baseDir, "blog", this.slugify(category));
        }
        return join(baseDir, "blog");

      case "FINDING":
        if (category) {
          return join(baseDir, "finding", this.slugify(category));
        }
        return join(baseDir, "finding");

      default:
        return baseDir;
    }
  }
}

/**
 * Mock File Service for testing
 */
export class MockFileService implements FileService {
  private readonly createdFiles = new Set<string>();

  async createFile(request: FileCreationRequest): Promise<FileCreationResult> {
    const { filePath, overwrite = false } = request;

    if (this.createdFiles.has(filePath) && !overwrite) {
      return {
        success: false,
        filePath,
        created: false,
        error: "File already exists (mock)",
      };
    }

    this.createdFiles.add(filePath);

    return {
      success: true,
      filePath,
      created: true,
    };
  }

  async ensureDirectory(): Promise<boolean> {
    return true; // Always succeed in mock
  }

  fileExists(filePath: string): boolean {
    return this.createdFiles.has(filePath);
  }

  generateFilePath(title: string, type: PostType, category?: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-");
    const fileName = type === "BLOG" ? `01012025-${slug}.mdx` : `${slug}.mdx`;

    let dir = "posts";
    if (type === "CONCRETE") {
      dir += "/concrete";
    } else if (type === "BLOG") {
      dir += category ? `/blog/${category}` : "/blog";
    } else if (type === "FINDING") {
      dir += category ? `/finding/${category}` : "/finding";
    }

    return `${dir}/${fileName}`;
  }

  getCreatedFiles(): string[] {
    return Array.from(this.createdFiles);
  }

  reset(): void {
    this.createdFiles.clear();
  }
}

/**
 * Factory for creating file service instances
 */
export class FileServiceFactory {
  static create(useMock = false, projectRoot?: string): FileService {
    return useMock ? new MockFileService() : new BunFileService(projectRoot);
  }
}
