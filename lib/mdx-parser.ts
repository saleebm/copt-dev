import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { PostType } from "@/lib/generated/prisma";
import { formatDateWithoutTimezone, parsePostDate } from "./date-utils";
import {
  extractHlexiconTerms,
  type HlexiconTerm,
  transformHlexiconInContent,
} from "./hlexicon-utils";

export interface PostMetadata {
  categories?: string[];
  date?: string | null;
  excerpt?: string;
  fileHash: string;
  filePath: string;
  findingsCount?: number;
  hlexiconTerms?: HlexiconTerm[];
  original_url?: string;
  published?: boolean;
  slug: string;
  status?: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  tags?: string[];
  title: string;
  type: PostType;
}

export type ParsedPost = PostMetadata & {
  content: string;
};

export function parsePostFile(filePath: string, type: PostType): ParsedPost {
  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);
  const slug = path.basename(filePath, path.extname(filePath));

  // Generate file hash for change detection
  const fileHash = crypto.createHash("md5").update(fileContents).digest("hex");

  // Extract title from frontmatter or first heading
  let title = data.title || slug;
  if (!data.title && content) {
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      title = headingMatch[1].trim();
    }
  }

  // Auto-detect categories from folder structure - for BLOG, FINDING, and SIGHT posts
  const autoCategories =
    type === PostType.BLOG ||
    type === PostType.FINDING ||
    type === PostType.SIGHT
      ? extractCategoriesFromPath(filePath, type)
      : [];
  const frontmatterCategories = data.categories || [];
  const allCategories = [
    ...new Set([...autoCategories, ...frontmatterCategories]),
  ];

  // Parse tags from frontmatter (support comma-separated string or array)
  let tags: string[] = [];
  if (data.tags) {
    if (typeof data.tags === "string") {
      tags = data.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    } else if (Array.isArray(data.tags)) {
      tags = data.tags
        .map((tag) => String(tag).trim())
        .filter((tag) => tag.length > 0);
    }
  }

  // Handle status field with DRAFT as default
  const status = data.status || "DRAFT";
  const validStatuses = ["PUBLISHED", "DRAFT", "ARCHIVED"];
  const finalStatus = validStatuses.includes(status) ? status : "DRAFT";

  // Extract Hlexicon terms from content
  const hlexiconTerms = extractHlexiconTerms(content);

  // Transform content to replace Hlexicon patterns with JSX components
  const transformedContent = transformHlexiconInContent(content);

  // Parse date from frontmatter with multiple fallback strategies
  let parsedDate: string | null = null;

  // Priority order for date extraction:
  // 1. frontmatter.date
  if (data.date) {
    const date = parsePostDate(data.date, `post ${slug}`);
    if (date) {
      parsedDate = date.toISOString();
    }
  }

  // 2. frontmatter.originalDate
  if (!parsedDate && data.originalDate) {
    const date = parsePostDate(
      data.originalDate,
      `post ${slug} (originalDate)`
    );
    if (date) {
      parsedDate = date.toISOString();
    }
  }

  // 3. frontmatter.publishedAt
  if (!parsedDate && data.publishedAt) {
    const date = parsePostDate(data.publishedAt, `post ${slug} (publishedAt)`);
    if (date) {
      parsedDate = date.toISOString();
    }
  }

  // 4. Try to extract date from filename (e.g., "2025-09-26-post-title.mdx")
  if (!parsedDate) {
    const dateFromFilename = extractDateFromFilename(filePath);
    if (dateFromFilename) {
      parsedDate = dateFromFilename;
    }
  }

  // 5. Use file creation/modification time as last resort (but NOT current date)
  if (!parsedDate) {
    try {
      const stats = fs.statSync(filePath);
      // Use birthtime (creation) if available, otherwise mtime (modification)
      const fileDate =
        stats.birthtime < stats.mtime ? stats.birthtime : stats.mtime;
      parsedDate = fileDate.toISOString();
    } catch (_error) {
      // Silently handle file stat errors
    }
  }

  return {
    slug,
    title,
    excerpt: data.excerpt || "",
    date: parsedDate,
    tags,
    categories: allCategories,
    type,
    status: finalStatus as "PUBLISHED" | "DRAFT" | "ARCHIVED",
    published: data.published !== false, // Default to true if not specified
    filePath,
    fileHash,
    hlexiconTerms,
    content: transformedContent,
    original_url: data.original_url || "",
  };
}

function extractDateFromFilename(filePath: string): string | null {
  const filename = path.basename(filePath);

  // Try various date patterns in filename
  // Pattern 1: YYYY-MM-DD (e.g., "2025-09-26-post-title.mdx")
  const pattern1 = /(\d{4})-(\d{2})-(\d{2})/;
  const match1 = filename.match(pattern1);
  if (match1) {
    const date = new Date(`${match1[1]}-${match1[2]}-${match1[3]}`);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Pattern 2: MM-DD-YYYY or MM/DD/YYYY (e.g., "06-11-2025.mdx" or "06/11/2025.mdx")
  const pattern2 = /(\d{2})[-/](\d{2})[-/](\d{4})/;
  const match2 = filename.match(pattern2);
  if (match2) {
    const date = new Date(`${match2[3]}-${match2[1]}-${match2[2]}`);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Pattern 3: YYYYMMDD (e.g., "20250926-post.mdx")
  const pattern3 = /(\d{4})(\d{2})(\d{2})/;
  const match3 = filename.match(pattern3);
  if (match3) {
    const date = new Date(`${match3[1]}-${match3[2]}-${match3[3]}`);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}

function extractCategoriesFromPath(filePath: string, type: PostType): string[] {
  // Only extract categories for BLOG, FINDING, and SIGHT posts
  if (type === PostType.CONCRETE) {
    return [];
  }

  const categories: string[] = [];

  // Get the relative path from the posts directory
  const postsDir = path.join(process.cwd(), "posts");
  const relativePath = path.relative(postsDir, filePath);

  // Split the path into parts and extract folder names
  const pathParts = relativePath.split(path.sep);

  // Remove the filename and the type folder (concrete/blog)
  const folderParts = pathParts.slice(1, -1); // Remove type folder and filename

  // Convert folder names to category names
  for (const folder of folderParts) {
    if (folder && folder !== "." && folder !== "..") {
      // Convert kebab-case or snake_case to Title Case
      const categoryName = folder
        .replace(/[-_]/g, " ")
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
      categories.push(categoryName);
    }
  }

  return categories;
}

export function getAllPosts(): ParsedPost[] {
  const concretePosts = getPostsOfType(PostType.CONCRETE);
  const blogPosts = getPostsOfType(PostType.BLOG);
  const findingPosts = getPostsOfType(PostType.FINDING);
  const sightPosts = getPostsOfType(PostType.SIGHT); // Add sight posts
  const dynamicFindingPosts = getDynamicFindingPosts(findingPosts);
  const dynamicSightPosts = getDynamicSightPosts(sightPosts); // Add dynamic sight posts
  return [
    ...concretePosts,
    ...blogPosts,
    ...findingPosts,
    ...sightPosts,
    ...dynamicFindingPosts,
    ...dynamicSightPosts,
  ];
}

export function getPostsOfType(type: PostType): ParsedPost[] {
  const postsDirectory = path.join(process.cwd(), "posts", type.toLowerCase());

  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  // For CONCRETE posts, only parse files in the root directory without recursion
  if (type === PostType.CONCRETE) {
    const posts: ParsedPost[] = [];

    try {
      const items = fs.readdirSync(postsDirectory, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(postsDirectory, item.name);

        if (item.isFile() && /\.mdx?$/.test(item.name)) {
          // Parse markdown/mdx files directly in the concrete directory
          posts.push(parsePostFile(fullPath, type));
        }
      }
    } catch (_error) {
      // Silently handle directory read errors
    }

    return posts;
  }

  // For SIGHT posts, look for directories with README.md files
  if (type === PostType.SIGHT) {
    return getSightPostsRecursively(postsDirectory);
  }

  // For BLOG and FINDING posts, use recursive parsing as before
  return getPostsRecursively(postsDirectory, type);
}

function getPostsRecursively(directory: string, type: PostType): ParsedPost[] {
  const posts: ParsedPost[] = [];

  try {
    const items = fs.readdirSync(directory, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(directory, item.name);

      if (item.isDirectory()) {
        // Recursively search subdirectories
        posts.push(...getPostsRecursively(fullPath, type));
      } else if (item.isFile() && /\.mdx?$/.test(item.name)) {
        // Parse markdown/mdx files
        posts.push(parsePostFile(fullPath, type));
      }
    }
  } catch (_error) {
    // Silently handle directory read errors
  }

  return posts;
}

export function getPostBySlug(slug: string): ParsedPost | null {
  // Check if it's a dynamic findings post first
  if (slug.startsWith("findings-")) {
    const dynamicFindingPosts = getDynamicFindingPosts();
    const dynamicPost = dynamicFindingPosts.find((post) => post.slug === slug);
    if (dynamicPost) {
      return dynamicPost;
    }
  }

  // Check if it's a dynamic sights post
  if (slug.startsWith("sights-")) {
    const dynamicSightPosts = getDynamicSightPosts();
    const dynamicPost = dynamicSightPosts.find((post) => post.slug === slug);
    if (dynamicPost) {
      return dynamicPost;
    }
  }

  // Fall back to regular posts
  const allPosts = getAllPosts();
  return allPosts.find((post) => post.slug === slug) || null;
}

function groupFindingsByDate(
  posts: ParsedPost[]
): Record<string, ParsedPost[]> {
  return posts.reduce(
    (acc, post) => {
      if (!post.date) {
        return acc;
      }
      const dateKey = new Date(post.date).toISOString().split("T")[0]; // YYYY-MM-DD
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(post);
      return acc;
    },
    {} as Record<string, ParsedPost[]>
  );
}

function createFindingSummaryPost(
  date: string,
  findings: ParsedPost[]
): ParsedPost {
  // Use the date from the findings themselves, not generate a new one
  const [year, month, day] = date.split("-").map(Number);
  const postDateUTC = new Date(Date.UTC(year, month - 1, day));

  const formattedDate = formatDateWithoutTimezone(postDateUTC, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const slug = `findings-${date}`;
  const title = `Findings for ${formattedDate}`;

  // Create clean MDX content using the FindingsList component
  const findingsData = findings.map((finding) => ({
    slug: finding.slug,
    title: finding.title,
    content: finding.content,
    original_url: finding.original_url,
    categories: finding.categories,
    tags: finding.tags,
  }));

  const content = `<FindingsList findings={${JSON.stringify(findingsData, null, 2)}} />`;

  return {
    slug,
    title,
    content: content.trim(),
    excerpt: `A collection of ${findings.length} findings from ${formattedDate}.`,
    date: postDateUTC.toISOString(),
    tags: ["findings-summary", date],
    categories: ["Findings"],
    type: PostType.FINDING,
    status: "PUBLISHED",
    published: true,
    filePath: `virtual/findings/${slug}.mdx`,
    fileHash: crypto.createHash("md5").update(content).digest("hex"),
    hlexiconTerms: [],
    original_url: "", // Not applicable for summary posts
    findingsCount: findings.length,
  };
}

export function getDynamicFindingPosts(findings?: ParsedPost[]): ParsedPost[] {
  // Use provided findings or fetch them if not provided
  const findingPosts = findings || getPostsOfType(PostType.FINDING);

  if (!findingPosts || findingPosts.length === 0) {
    return [];
  }

  const findingsByDate = groupFindingsByDate(findingPosts);

  const dynamicPosts = Object.entries(findingsByDate).map(([date, posts]) =>
    createFindingSummaryPost(date, posts)
  );

  return dynamicPosts;
}

// Function to transform sight post image paths for Next.js compatibility
function transformSightImagePaths(
  content: string,
  sightDirPath: string
): string {
  // Find all markdown image references: ![alt text](/posts/sight/...)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

  return content.replace(imageRegex, (match, alt, originalPath) => {
    // Only transform paths that start with /posts/sight/
    if (!originalPath.startsWith("/posts/sight/")) {
      return match; // Return unchanged if not a sight image
    }

    // Extract filename from the original path
    const filename = path.basename(originalPath);
    const imageFullPath = path.join(sightDirPath, filename);

    // Check if the image file actually exists in the sight directory
    if (fs.existsSync(imageFullPath)) {
      // Copy image to public directory and return new path
      const publicImagePath = copyImageToPublic(imageFullPath, originalPath);
      return `![${alt}](${publicImagePath})`;
    }
    return match;
  });
}

// Function to create symlink for sight images in public directory
function copyImageToPublic(
  sourceImagePath: string,
  originalPath: string
): string {
  // Create the target path in public directory (declare at function scope)
  const publicPath = path.join(
    process.cwd(),
    "public",
    originalPath.substring(1)
  ); // Remove leading /
  const publicDir = path.dirname(publicPath);

  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Check if symlink or file already exists
    if (fs.existsSync(publicPath)) {
      try {
        const stats = fs.lstatSync(publicPath);
        if (stats.isSymbolicLink()) {
          // Check if symlink points to the correct source
          const currentTarget = fs.readlinkSync(publicPath);
          if (currentTarget === sourceImagePath) {
            // Symlink already correct, no action needed
            return originalPath;
          }
          // Remove incorrect symlink
          fs.unlinkSync(publicPath);
        } else if (stats.isFile()) {
          // Remove the copied file to replace with symlink
          fs.unlinkSync(publicPath);
        }
      } catch (_e) {
        // Error reading link, remove and recreate
        fs.unlinkSync(publicPath);
      }
    }

    // Create symlink instead of copying
    fs.symlinkSync(sourceImagePath, publicPath, "file");

    // Return the path that Next.js can serve (without /public prefix)
    return originalPath;
  } catch (_error) {
    // Fallback to copying if symlink fails (e.g., on Windows without permissions)
    try {
      fs.copyFileSync(sourceImagePath, publicPath);
      return originalPath;
    } catch (_copyError) {
      return originalPath; // Return original path on error
    }
  }
}

// Add function to parse sight posts (similar to parsePostFile but for sight structure)
function parseSightPostFile(dirPath: string): ParsedPost {
  const readmePath = path.join(dirPath, "README.md");
  const fileContents = fs.readFileSync(readmePath, "utf8");
  const { data, content } = matter(fileContents);

  // Extract date from directory name (e.g., 20250808030321)
  const dirName = path.basename(dirPath);
  const dateMatch = dirName.match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/
  );

  let date: string;
  if (dateMatch) {
    const [, year, month, day, hour, minute, second] = dateMatch;
    date = new Date(
      Date.UTC(
        Number.parseInt(year, 10),
        Number.parseInt(month, 10) - 1,
        Number.parseInt(day, 10),
        Number.parseInt(hour, 10),
        Number.parseInt(minute, 10),
        Number.parseInt(second, 10)
      )
    ).toISOString();
  } else {
    // Fallback to last line of content or current date
    const lastLineMatch = content.match(/\*Captured and analyzed on (.+)\*/);
    date = lastLineMatch
      ? new Date(lastLineMatch[1]).toISOString()
      : new Date().toISOString();
  }

  // Generate slug from path
  const postsDir = path.join(process.cwd(), "posts");
  const relativePath = path.relative(postsDir, dirPath);
  const slug = relativePath.replace(/\\/g, "/").replace(/\//g, "-");

  // Extract title from content
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : dirName;

  // Extract categories from path (similar to findings)
  const categories = extractCategoriesFromPath(dirPath, PostType.SIGHT);

  // Extract tags from markdown metadata section
  const tagsMatch = content.match(/- \*\*Tags\*\*:\s*(.+)$/m);
  const tags = tagsMatch
    ? tagsMatch[1].split(",").map((tag) => tag.trim())
    : [];

  // Transform image paths for Next.js compatibility
  const transformedContent = transformSightImagePaths(content, dirPath);

  const fileHash = crypto.createHash("md5").update(fileContents).digest("hex");
  const hlexiconTerms = extractHlexiconTerms(transformedContent);
  const finalContent = transformHlexiconInContent(transformedContent);

  return {
    slug,
    title,
    excerpt: data.excerpt || "",
    date,
    tags,
    categories,
    type: PostType.SIGHT,
    status: "PUBLISHED",
    published: true,
    filePath: dirPath,
    fileHash,
    hlexiconTerms,
    content: finalContent,
  };
}

function getSightPostsRecursively(directory: string): ParsedPost[] {
  const posts: ParsedPost[] = [];

  try {
    const items = fs.readdirSync(directory, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(directory, item.name);

      if (item.isDirectory()) {
        // Check if this directory contains a README.md (sight post)
        const readmePath = path.join(fullPath, "README.md");
        if (fs.existsSync(readmePath)) {
          // This is a sight post directory
          posts.push(parseSightPostFile(fullPath));
        } else {
          // Recursively search subdirectories
          posts.push(...getSightPostsRecursively(fullPath));
        }
      }
    }
  } catch (_error) {
    // Silently handle directory read errors
  }

  return posts;
}

// Add dynamic sight posts aggregation (reuse pattern from findings)
export function getDynamicSightPosts(sights?: ParsedPost[]): ParsedPost[] {
  const sightPosts = sights || getPostsOfType(PostType.SIGHT);

  if (!sightPosts || sightPosts.length === 0) {
    return [];
  }

  const sightsByDate = groupSightsByDate(sightPosts);

  const dynamicPosts = Object.entries(sightsByDate).map(([date, posts]) =>
    createSightSummaryPost(date, posts)
  );

  return dynamicPosts;
}

function groupSightsByDate(posts: ParsedPost[]): Record<string, ParsedPost[]> {
  return posts.reduce(
    (acc, post) => {
      if (!post.date) {
        return acc;
      }
      const dateKey = new Date(post.date).toISOString().split("T")[0]; // YYYY-MM-DD
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(post);
      return acc;
    },
    {} as Record<string, ParsedPost[]>
  );
}

function createSightSummaryPost(
  date: string,
  sights: ParsedPost[]
): ParsedPost {
  const [year, month, day] = date.split("-").map(Number);
  const postDateUTC = new Date(Date.UTC(year, month - 1, day));

  const formattedDate = formatDateWithoutTimezone(postDateUTC, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const slug = `sights-${date}`;
  const title = `Sights for ${formattedDate}`;

  // Create MDX content using SightsList component (similar to FindingsList)
  const sightsData = sights.map((sight) => ({
    slug: sight.slug,
    title: sight.title,
    content: sight.content,
    categories: sight.categories,
    tags: sight.tags,
  }));

  const content = `<SightsList sights={${JSON.stringify(sightsData, null, 2)}} />`;

  return {
    slug,
    title,
    content: content.trim(),
    excerpt: `A collection of ${sights.length} sights from ${formattedDate}.`,
    date: postDateUTC.toISOString(),
    tags: ["sights-summary", date],
    categories: ["Sights"],
    type: PostType.SIGHT,
    status: "PUBLISHED",
    published: true,
    filePath: `virtual/sights/${slug}.mdx`,
    fileHash: crypto.createHash("md5").update(content).digest("hex"),
    hlexiconTerms: [],
    findingsCount: sights.length, // Reuse this field for sight count
  };
}
