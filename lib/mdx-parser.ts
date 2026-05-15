import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { PostType } from "@/lib/generated/prisma";
import {
  extractDateFromBody,
  formatDateWithoutTimezone,
  parsePostDate,
} from "./date-utils";
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

  // 5. Try to extract a date token from the start of the post body
  //    (e.g., a "7/20/25" mentioned in the opening paragraph).
  if (!parsedDate) {
    const dateFromBody = extractDateFromBody(transformedContent);
    if (dateFromBody) {
      parsedDate = dateFromBody.toISOString();
    }
  }

  // 6. Use file creation/modification time as last resort (but NOT current date)
  if (!parsedDate) {
    try {
      const stats = fs.statSync(filePath);
      // Use birthtime (creation) if available, otherwise mtime (modification)
      const fileDate =
        stats.birthtime < stats.mtime ? stats.birthtime : stats.mtime;
      parsedDate = fileDate.toISOString();
    } catch {
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

/**
 * Extract a date from a filename. Tries patterns in order of specificity
 * and delegates the actual Y/M/D validation to `parsePostDate`.
 *
 * Recognized patterns (first match wins):
 *   - YYYY-MM-DD     2025-09-26-post.mdx
 *   - MM-DD-YYYY     09-26-2025.mdx       (also slash-separated)
 *   - YYYYMMDD       20250926-post.mdx
 *   - MMDDYYYY       05122026-post.mdx    (used by /posts/finding)
 *   - MM-DD-YY       09-26-25.mdx         (also slash-separated)
 */
function extractDateFromFilename(filePath: string): string | null {
  const filename = path.basename(filePath);

  const patterns: RegExp[] = [
    /(\d{4}-\d{1,2}-\d{1,2})/,
    /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/,
    /(\d{8})/, // YYYYMMDD or MMDDYYYY — parsePostDate disambiguates
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2})/,
  ];

  for (const re of patterns) {
    const m = filename.match(re);
    if (m) {
      const parsed = parsePostDate(m[1], `filename ${filename}`);
      if (parsed) {
        return parsed.toISOString();
      }
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
    } catch {
      // Silently handle directory read errors
    }

    return posts;
  }

  // For SIGHT posts, look for directories with README.md files (legacy
  // layout) and also flat .mdx files at the sight root (ingest pipeline
  // layout). Flat files are parsed via the standard frontmatter pipeline.
  if (type === PostType.SIGHT) {
    const dirPosts = getSightPostsRecursively(postsDirectory);
    const flatPosts: ParsedPost[] = [];

    try {
      const items = fs.readdirSync(postsDirectory, { withFileTypes: true });
      for (const item of items) {
        if (item.isFile() && /\.mdx?$/.test(item.name)) {
          const fullPath = path.join(postsDirectory, item.name);
          flatPosts.push(parseFlatSightPost(fullPath));
        }
      }
    } catch {
      // Silently handle directory read errors
    }

    return [...flatPosts, ...dirPosts];
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
  } catch {
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

  const findingsData = findings.map((finding) => ({
    slug: finding.slug,
    title: finding.title,
    content: finding.content,
    original_url: finding.original_url,
    categories: finding.categories,
    tags: finding.tags,
  }));

  // Encode as base64 JSON so the MDX runtime evaluates a single-line string
  // attribute instead of a multi-line JSX expression whose contents can be
  // arbitrarily large/markdown-flavoured.
  const findingsB64 = Buffer.from(
    JSON.stringify(findingsData),
    "utf8"
  ).toString("base64");
  const content = `<FindingsList findingsB64="${findingsB64}" />`;

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
function extractFirstMarkdownImage(
  content: string
): { alt: string; src: string } | undefined {
  const match = content.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  if (!match) {
    return;
  }
  return { alt: match[1], src: match[2] };
}

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
  const publicPath = path.join(process.cwd(), "public", originalPath.slice(1)); // Remove leading /
  const publicDir = path.dirname(publicPath);
  // Relative target so the symlink is portable across machines (and survives git)
  const relativeTarget = path.relative(publicDir, sourceImagePath);

  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Check if symlink or file already exists. lstat does not follow links, so
    // dangling symlinks (e.g. older absolute-path links committed from another
    // machine) are still detected and cleaned up here.
    let existingStats: fs.Stats | undefined;
    try {
      existingStats = fs.lstatSync(publicPath);
    } catch {
      existingStats = undefined;
    }
    if (existingStats) {
      try {
        if (existingStats.isSymbolicLink()) {
          // Check if symlink points to the correct relative source
          const currentTarget = fs.readlinkSync(publicPath);
          if (currentTarget === relativeTarget) {
            // Symlink already correct, no action needed
            return originalPath;
          }
          // Remove incorrect symlink (absolute, stale, or dangling)
          fs.unlinkSync(publicPath);
        } else if (existingStats.isFile()) {
          // Remove the copied file to replace with symlink
          fs.unlinkSync(publicPath);
        }
      } catch {
        // Error reading link, remove and recreate
        fs.unlinkSync(publicPath);
      }
    }

    // Create symlink instead of copying
    fs.symlinkSync(relativeTarget, publicPath, "file");

    // Return the path that Next.js can serve (without /public prefix)
    return originalPath;
  } catch {
    // Fallback to copying if symlink fails (e.g., on Windows without permissions)
    try {
      fs.copyFileSync(sourceImagePath, publicPath);
      return originalPath;
    } catch {
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

// Flat SIGHT posts (ingest pipeline output) live at `posts/sight/<slug>.mdx`
// with rich frontmatter and reference images at `/posts/sight/<dir>/<file>`.
// Parse via the standard frontmatter pipeline, then symlink referenced images
// into `public/` so Next.js can serve them.
function parseFlatSightPost(filePath: string): ParsedPost {
  const post = parsePostFile(filePath, PostType.SIGHT);
  return {
    ...post,
    content: transformFlatSightImagePaths(post.content),
  };
}

function transformFlatSightImagePaths(content: string): string {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

  return content.replace(imageRegex, (match, _alt, originalPath) => {
    if (!originalPath.startsWith("/posts/sight/")) {
      return match;
    }

    const sourcePath = path.join(process.cwd(), originalPath.slice(1));
    if (fs.existsSync(sourcePath)) {
      copyImageToPublic(sourcePath, originalPath);
    }
    return match;
  });
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
  } catch {
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

  const sightsData = sights.map((sight) => ({
    slug: sight.slug,
    title: sight.title,
    content: sight.content,
    categories: sight.categories,
    tags: sight.tags,
    previewImage: extractFirstMarkdownImage(sight.content),
  }));

  // Base64 JSON string attribute — see createFindingSummaryPost for rationale.
  const sightsB64 = Buffer.from(JSON.stringify(sightsData), "utf8").toString(
    "base64"
  );
  const content = `<SightsList sightsB64="${sightsB64}" />`;

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
