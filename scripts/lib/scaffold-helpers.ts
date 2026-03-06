/**
 * Helper functions for post scaffolding
 */

import { join } from "node:path";
import type { GoogleGenAI } from "@google/genai";
import { format } from "date-fns";
import type { PostType } from "@/lib/generated/prisma";

/**
 * Create a URL-safe slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generate a filename for the post
 */
export function generateFileName(title: string, type: PostType): string {
  const slug = slugify(title);

  if (type === "BLOG") {
    // For blog posts, include date
    const dateStr = format(new Date(), "MMddyyyy");
    return `${dateStr}-${slug}.mdx`;
  }

  return `${slug}.mdx`;
}

/**
 * Get the appropriate directory for the post type and category
 */
export function getPostDirectory(type: PostType, category?: string): string {
  const baseDir = join(process.cwd(), "posts");

  switch (type) {
    case "CONCRETE":
      return join(baseDir, "concrete");

    case "BLOG":
      if (category) {
        return join(baseDir, "blog", slugify(category));
      }
      return join(baseDir, "blog");

    case "FINDING":
      if (category) {
        return join(baseDir, "finding", slugify(category));
      }
      return join(baseDir, "finding");

    default:
      return baseDir;
  }
}

/**
 * Generate an AI-powered outline using Gemini
 */
export async function createPostOutline(
  genai: GoogleGenAI,
  title: string,
  type: PostType,
  category?: string
): Promise<string> {
  // Create context-aware prompt based on post type
  const prompt = createOutlinePrompt(title, type, category);

  try {
    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    if (!response.text) {
      throw new Error("No outline generated");
    }

    return formatOutline(response.text);
  } catch (error) {
    throw new Error(
      `AI outline generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a context-aware prompt for outline generation
 */
function createOutlinePrompt(
  title: string,
  type: PostType,
  category?: string
): string {
  const baseContext = `You are helping create an outline for a blog post titled "${title}".`;

  let typeContext = "";
  switch (type) {
    case "CONCRETE":
      typeContext =
        "This is a CONCRETE post - foundational, principle-based content that serves as a cornerstone reference. It should be comprehensive, well-structured, and timeless.";
      break;
    case "BLOG":
      typeContext =
        "This is a BLOG post - personal, chronological content that reflects thoughts, experiences, or insights. It should be engaging and conversational.";
      break;
    case "FINDING":
      typeContext =
        "This is a FINDING post - research discoveries, insights, or curated external content. It should be analytical and informative.";
      break;
  }

  const categoryContext = category
    ? `The post is categorized under "${category}".`
    : "";

  const instructions = `
Create a detailed, hierarchical outline using markdown headers (##, ###, ####) that:

1. Provides a logical flow of ideas
2. Includes key points and sub-points
3. Suggests specific areas to explore
4. Maintains consistency with the ${type.toLowerCase()} post format
5. Uses markdown formatting for clarity

The outline should be comprehensive enough to guide writing but flexible enough to allow creative development.

Format the response as clean markdown with proper header hierarchy.`;

  return `${baseContext} ${typeContext} ${categoryContext}\n\n${instructions}`;
}

/**
 * Format the AI-generated outline
 */
function formatOutline(rawOutline: string): string {
  // Clean up the outline and ensure proper formatting
  let formatted = rawOutline
    .replace(/^```markdown\s*/, "") // Remove markdown code block start
    .replace(/\s*```$/, "") // Remove markdown code block end
    .trim();

  // Ensure we have proper spacing between sections
  formatted = formatted.replace(/\n(?=##)/g, "\n\n");

  // Add a header comment
  const header = "<!-- AI-Generated Outline - Edit as needed -->\n\n";

  return header + formatted;
}

/**
 * Validate post title
 */
export function validateTitle(title: string): boolean {
  return title.trim().length > 0 && title.length <= 200;
}

/**
 * Validate category name
 */
export function validateCategory(category: string): boolean {
  if (!category) {
    return true; // Optional
  }
  return category.trim().length > 0 && category.length <= 100;
}

/**
 * Validate tags
 */
export function validateTags(tags: string[]): boolean {
  return tags.every(
    (tag) => tag.trim().length > 0 && tag.length <= 50 && !/[,;]/.test(tag) // No commas or semicolons in individual tags
  );
}

/**
 * Create a safe category slug for directory creation
 */
export function createCategorySlug(category: string): string {
  return slugify(category).substring(0, 50); // Limit length for filesystem
}

/**
 * Extract keywords from title for better AI context
 */
export function extractKeywords(title: string): string[] {
  const commonWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "up",
    "about",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "between",
    "among",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
  ]);

  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !commonWords.has(word))
    .slice(0, 10); // Limit to top 10 keywords
}

/**
 * Generate post metadata for better organization
 */
export function generatePostMetadata(
  title: string,
  type: PostType,
  category?: string
) {
  const slug = slugify(title);
  const keywords = extractKeywords(title);
  const now = new Date();

  return {
    slug,
    keywords,
    createdAt: now.toISOString(),
    estimatedReadTime: Math.max(1, Math.ceil(title.split(" ").length / 200)), // Rough estimate
    type,
    category,
  };
}
