import crypto from "node:crypto";
import { constants, type Stats } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

// Configuration constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
const ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
];
// Reserved for future MIME type validation
// const ALLOWED_MIME_TYPES = {
//     '.jpg': 'image/jpeg',
//     '.jpeg': 'image/jpeg',
//     '.png': 'image/png',
//     '.gif': 'image/gif',
//     '.webp': 'image/webp',
//     '.svg': 'image/svg+xml',
//     '.ico': 'image/x-icon',
// }

/**
 * Sanitizes and validates a file path to prevent path traversal attacks
 */
export function sanitizePath(
  inputPath: string,
  basePath: string
): string | null {
  if (!inputPath || typeof inputPath !== "string") {
    return null;
  }

  // Normalize the path to resolve '..' and '.' segments
  const normalizedPath = path.normalize(inputPath);

  // Resolve to absolute path
  const absolutePath = path.resolve(basePath, normalizedPath);

  // Ensure the resolved path is within the base directory
  const normalizedBase = path.resolve(basePath);
  if (
    !absolutePath.startsWith(normalizedBase + path.sep) &&
    absolutePath !== normalizedBase
  ) {
    return null; // Path traversal attempt detected
  }

  return absolutePath;
}

/**
 * Validates if a file is an allowed image type
 */
export function isAllowedImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Validates file size asynchronously
 */
export async function validateFileSize(
  filePath: string,
  maxSize: number = MAX_FILE_SIZE
): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size <= maxSize;
  } catch {
    return false;
  }
}

/**
 * Checks if a file exists asynchronously
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets file stats with caching to avoid duplicate checks
 */
const statsCache = new Map<string, { stats: Stats; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

export async function getCachedStats(filePath: string) {
  const cached = statsCache.get(filePath);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.stats;
  }

  try {
    const stats = await fs.stat(filePath);
    statsCache.set(filePath, { stats, timestamp: now });
    return stats;
  } catch {
    statsCache.delete(filePath);
    return null;
  }
}

/**
 * Safely copies a file with validation
 */
export async function safeCopyFile(
  sourcePath: string,
  destPath: string,
  options: {
    baseSourceDir?: string;
    baseDestDir?: string;
    validateImage?: boolean;
    maxSize?: number;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate source path
    const safeSourcePath = options.baseSourceDir
      ? sanitizePath(sourcePath, options.baseSourceDir)
      : sourcePath;

    if (!safeSourcePath) {
      return { success: false, error: "Invalid source path" };
    }

    // Validate destination path
    const safeDestPath = options.baseDestDir
      ? sanitizePath(destPath, options.baseDestDir)
      : destPath;

    if (!safeDestPath) {
      return { success: false, error: "Invalid destination path" };
    }

    // Check if source exists
    if (!(await fileExists(safeSourcePath))) {
      return { success: false, error: "Source file does not exist" };
    }

    // Validate image type if required
    if (options.validateImage && !isAllowedImageFile(safeSourcePath)) {
      return { success: false, error: "File type not allowed" };
    }

    // Validate file size
    if (!(await validateFileSize(safeSourcePath, options.maxSize))) {
      return { success: false, error: "File size exceeds limit" };
    }

    // Create destination directory if it doesn't exist
    const destDir = path.dirname(safeDestPath);
    await fs.mkdir(destDir, { recursive: true });

    // Check if we need to copy (source is newer or dest doesn't exist)
    const sourceStats = await getCachedStats(safeSourcePath);
    const destExists = await fileExists(safeDestPath);

    if (destExists) {
      const destStats = await getCachedStats(safeDestPath);
      if (destStats && sourceStats && sourceStats.mtime <= destStats.mtime) {
        return { success: true }; // File is up to date
      }
    }

    // Perform the copy
    await fs.copyFile(safeSourcePath, safeDestPath);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Reads a file safely with size validation
 */
export async function safeReadFile(
  filePath: string,
  options: {
    encoding?: BufferEncoding;
    maxSize?: number;
    baseDir?: string;
  } = {}
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const safePath = options.baseDir
      ? sanitizePath(filePath, options.baseDir)
      : filePath;

    if (!safePath) {
      return { success: false, error: "Invalid file path" };
    }

    if (!(await fileExists(safePath))) {
      return { success: false, error: "File does not exist" };
    }

    if (!(await validateFileSize(safePath, options.maxSize))) {
      return { success: false, error: "File size exceeds limit" };
    }

    const content = await fs.readFile(safePath, options.encoding || "utf8");
    return { success: true, content: content as string };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Creates a safe logger that doesn't expose sensitive paths
 */
export function createSafeLogger() {
  const sanitizePathForLog = (path: string): string => {
    // Hash the path for tracking while hiding actual path
    const hash = crypto
      .createHash("sha256")
      .update(path)
      .digest("hex")
      .substring(0, 8);
    return `[file:${hash}]`;
  };

  return {
    log: (message: string, filePath?: string) => {
      const _safeMessage = filePath
        ? `${message} ${sanitizePathForLog(filePath)}`
        : message;
    },
    error: (message: string, filePath?: string, error?: Error) => {
      const _safeMessage = filePath
        ? `${message} ${sanitizePathForLog(filePath)}`
        : message;
      if (error && process.env.NODE_ENV === "development") {
        // Development error logging intentionally suppressed
      } else {
        // Production error logging intentionally suppressed
      }
    },
    warn: (message: string, filePath?: string) => {
      const _safeMessage = filePath
        ? `${message} ${sanitizePathForLog(filePath)}`
        : message;
    },
  };
}

export const logger = createSafeLogger();
