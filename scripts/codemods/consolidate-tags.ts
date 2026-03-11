import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { glob } from "glob";
import { PrismaClient } from "@/lib/generated/prisma";
import type { CodemodDefinition } from "./types";
import { resolveApiKey, getAIConfig } from "../lib/ai-config";

// Configuration for tag analysis and consolidation
type TagAnalysisConfig = {
  similarityThreshold: number;
  maxTagsPerGroup: number;
  minPostsForTag: number;
  embeddingDimensionality: number;
  modelVersion: string;
};

type TagInfo = {
  name: string;
  posts: string[]; // File paths of posts using this tag
  postCount: number;
  embedding?: number[];
  description: string;
  descriptionHash: string;
};

type TagGroup = {
  canonicalTag: TagInfo;
  duplicates: TagInfo[];
  similarity: number;
  reason: string;
};

type TagConsolidationPlan = {
  groups: TagGroup[];
  replacements: Map<string, string>; // Map of old tag to new tag
  postUpdates: Array<{
    filePath: string;
    oldTags: string[];
    newTags: string[];
  }>;
};

// Default configuration
const DEFAULT_CONFIG: TagAnalysisConfig = {
  similarityThreshold: 0.8,
  maxTagsPerGroup: 10,
  minPostsForTag: 1,
  embeddingDimensionality: 256,
  modelVersion: process.env.EMBEDDING_MODEL ?? "gemini-embedding-001",
};

/**
 * Calculate cosine similarity between two embedding vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate a hash for the tag description to detect changes
 */
function generateDescriptionHash(description: string): string {
  return createHash("sha256").update(description).digest("hex");
}

/**
 * Clear all cached tag embeddings from the database
 */
export async function clearTagEmbeddingCache(): Promise<{
  success: boolean;
  deletedCount: number;
}> {
  console.log("🗑️  Clearing tag embedding cache...");

  const prisma = new PrismaClient();

  try {
    const deletedCount = await prisma.tagEmbedding.deleteMany();
    console.log(
      `✅ Cleared ${deletedCount.count} cached tag embeddings from database`
    );
    return { success: true, deletedCount: deletedCount.count };
  } catch (error) {
    console.error("❌ Failed to clear tag embedding cache:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Extract tag information from finding and sight posts
 */
async function extractTags(postTypes: string[]): Promise<TagInfo[]> {
  const tagMap = new Map<string, TagInfo>();

  for (const postType of postTypes) {
    const postsPath = join(process.cwd(), "posts", postType);

    if (!existsSync(postsPath)) {
      console.log(`ℹ️  Skipping ${postType} posts - directory not found`);
      continue;
    }

    // Find all MDX files in the post type directory
    const mdxFiles = await glob(`${postsPath}/**/*.mdx`);
    console.log(`Found ${mdxFiles.length} ${postType} posts`);

    for (const filePath of mdxFiles) {
      const content = readFileSync(filePath, "utf-8");
      const tagsMatch = content.match(/^tags:\s*\[(.*?)\]/m);

      if (tagsMatch) {
        // Parse tags from the frontmatter
        const tagsString = tagsMatch[1];
        const tags = tagsString
          .split(",")
          .map((tag) => tag.trim().replace(/^["']|["']$/g, ""))
          .filter((tag) => tag.length > 0);

        for (const tag of tags) {
          if (tagMap.has(tag)) {
            const tagInfo = tagMap.get(tag)!;
            tagInfo.posts.push(filePath);
            tagInfo.postCount++;
          } else {
            // Create a comprehensive description for embedding
            const description = [
              tag.replace(/-/g, " "),
              `tag: ${tag}`,
              // Add variations and expansions
              tag.includes("-") ? tag.replace(/-/g, " ") : "",
              tag.includes(" ") ? tag.replace(/ /g, "-") : "",
              // Common variations
              tag === "ai" ? "artificial intelligence" : "",
              tag === "llm" ? "large language model" : "",
              tag === "ml" ? "machine learning" : "",
              tag === "dev" ? "development developer" : "",
              tag === "ui" ? "user interface" : "",
              tag === "ux" ? "user experience" : "",
              tag === "api" ? "application programming interface" : "",
              tag === "rag" ? "retrieval augmented generation" : "",
              tag === "mcp" ? "model control protocol" : "",
            ]
              .filter(Boolean)
              .join(" ");

            tagMap.set(tag, {
              name: tag,
              posts: [filePath],
              postCount: 1,
              description,
              descriptionHash: generateDescriptionHash(description),
            });
          }
        }
      }
    }
  }

  return Array.from(tagMap.values());
}

/**
 * Get or generate embeddings for tags using database persistence
 */
async function getOrGenerateEmbeddings(
  tags: TagInfo[],
  apiKey: string,
  config: TagAnalysisConfig
): Promise<TagInfo[]> {
  const prisma = new PrismaClient();
  const ai = new GoogleGenAI({ apiKey });

  const tagsWithEmbeddings: TagInfo[] = [];

  try {
    for (const tag of tags) {
      try {
        // Check if we have a cached embedding
        const existingEmbedding = await prisma.tagEmbedding.findUnique({
          where: { name: tag.name },
        });

        let embedding: number[] | undefined;

        if (
          existingEmbedding &&
          existingEmbedding.embeddingHash === tag.descriptionHash &&
          existingEmbedding.modelVersion === config.modelVersion &&
          existingEmbedding.dimensionality === config.embeddingDimensionality
        ) {
          // Use cached embedding
          embedding = existingEmbedding.embedding;
          console.log(`Using cached embedding for: ${tag.name}`);
        } else {
          // Generate new embedding
          console.log(
            `Generating embedding for: ${tag.name} (${tag.postCount} posts)`
          );

          const result = await ai.models.embedContent({
            model: config.modelVersion,
            contents: tag.description,
          });

          if (result.embeddings?.[0]?.values) {
            embedding = result.embeddings[0].values;

            // Save or update embedding in database
            await prisma.tagEmbedding.upsert({
              where: { name: tag.name },
              update: {
                description: tag.description,
                embedding,
                embeddingHash: tag.descriptionHash,
                modelVersion: config.modelVersion,
                dimensionality: config.embeddingDimensionality,
                postCount: tag.postCount,
              },
              create: {
                name: tag.name,
                description: tag.description,
                embedding,
                embeddingHash: tag.descriptionHash,
                modelVersion: config.modelVersion,
                dimensionality: config.embeddingDimensionality,
                postCount: tag.postCount,
              },
            });

            // Rate limiting - wait 100ms between API requests
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        if (embedding) {
          tagsWithEmbeddings.push({
            ...tag,
            embedding,
          });
        } else {
          console.warn(`Failed to get embedding for tag: ${tag.name}`);
          tagsWithEmbeddings.push(tag);
        }
      } catch (error) {
        console.warn(`Error processing embedding for ${tag.name}:`, error);
        tagsWithEmbeddings.push(tag);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  return tagsWithEmbeddings;
}

/**
 * Find duplicate tags using embedding similarity
 */
function findDuplicateTags(
  tags: TagInfo[],
  config: TagAnalysisConfig
): TagGroup[] {
  const groups: TagGroup[] = [];
  const processed = new Set<string>();

  // Sort tags by post count (descending) to prefer more popular tags as canonical
  const sortedTags = [...tags].sort((a, b) => b.postCount - a.postCount);

  for (let i = 0; i < sortedTags.length; i++) {
    const tag = sortedTags[i];

    if (processed.has(tag.name) || !tag.embedding) {
      continue;
    }

    const group: TagGroup = {
      canonicalTag: tag,
      duplicates: [],
      similarity: 1.0,
      reason: "Initial canonical tag",
    };

    // Find similar tags
    for (let j = i + 1; j < sortedTags.length; j++) {
      const otherTag = sortedTags[j];

      if (processed.has(otherTag.name) || !otherTag.embedding) {
        continue;
      }

      const similarity = cosineSimilarity(tag.embedding, otherTag.embedding);

      // Also check for obvious text-based duplicates
      const isTextDuplicate =
        tag.name.toLowerCase() === otherTag.name.toLowerCase() ||
        tag.name.replace(/[-_\s]/g, "") ===
          otherTag.name.replace(/[-_\s]/g, "") ||
        (tag.name.includes("-") &&
          tag.name.replace(/-/g, " ") === otherTag.name) ||
        (tag.name.includes(" ") &&
          tag.name.replace(/ /g, "-") === otherTag.name) ||
        (tag.name.includes("_") &&
          tag.name.replace(/_/g, "-") === otherTag.name);

      if (similarity >= config.similarityThreshold || isTextDuplicate) {
        group.duplicates.push(otherTag);
        processed.add(otherTag.name);

        // Update similarity to the minimum similarity in the group
        group.similarity = Math.min(group.similarity, similarity);
      }
    }

    // Only add groups that have duplicates
    if (group.duplicates.length > 0) {
      // Choose the best canonical tag based on multiple criteria
      const allTags = [group.canonicalTag, ...group.duplicates];
      const bestTag = allTags.reduce((best, current) => {
        // Strongly prefer tags with more posts
        if (current.postCount > best.postCount * 1.5) {
          return current;
        }
        if (current.postCount < best.postCount * 0.7) {
          return best;
        }

        // Among similar post counts, prefer:
        // 1. Tags without spaces (kebab-case over space-separated)
        const bestHasSpace = best.name.includes(" ");
        const currentHasSpace = current.name.includes(" ");
        if (!currentHasSpace && bestHasSpace) {
          return current;
        }
        if (currentHasSpace && !bestHasSpace) {
          return best;
        }

        // 2. Tags with hyphens over underscores
        const bestHasUnderscore = best.name.includes("_");
        const currentHasUnderscore = current.name.includes("_");
        if (!currentHasUnderscore && bestHasUnderscore) {
          return current;
        }
        if (currentHasUnderscore && !bestHasUnderscore) {
          return best;
        }

        // 3. Shorter names (more generic)
        if (current.name.length < best.name.length) {
          return current;
        }
        if (current.name.length > best.name.length) {
          return best;
        }

        // 4. Alphabetically first
        return current.name < best.name ? current : best;
      });

      if (bestTag !== group.canonicalTag) {
        group.duplicates = group.duplicates.filter((tag) => tag !== bestTag);
        group.duplicates.unshift(group.canonicalTag);
        group.canonicalTag = bestTag;
      }

      group.reason = `Consolidated ${group.duplicates.length + 1} similar tags (${(group.similarity * 100).toFixed(1)}% similarity)`;
      groups.push(group);
    }

    processed.add(tag.name);
  }

  return groups;
}

/**
 * Create a consolidation plan for tags
 */
function createTagConsolidationPlan(
  groups: TagGroup[],
  tags: TagInfo[]
): TagConsolidationPlan {
  const replacements = new Map<string, string>();
  const postUpdates: Array<{
    filePath: string;
    oldTags: string[];
    newTags: string[];
  }> = [];

  // Build replacement map
  for (const group of groups) {
    for (const duplicate of group.duplicates) {
      replacements.set(duplicate.name, group.canonicalTag.name);
    }
  }

  // Collect all unique post files that need updating
  const postsToUpdate = new Set<string>();
  for (const tag of tags) {
    if (replacements.has(tag.name)) {
      for (const postPath of tag.posts) {
        postsToUpdate.add(postPath);
      }
    }
  }

  // Create update plan for each post
  for (const postPath of postsToUpdate) {
    const content = readFileSync(postPath, "utf-8");
    const tagsMatch = content.match(/^tags:\s*\[(.*?)\]/m);

    if (tagsMatch) {
      const tagsString = tagsMatch[1];
      const oldTags = tagsString
        .split(",")
        .map((tag) => tag.trim().replace(/^["']|["']$/g, ""))
        .filter((tag) => tag.length > 0);

      // Apply replacements and deduplicate
      const newTagSet = new Set<string>();
      for (const tag of oldTags) {
        const newTag = replacements.get(tag) || tag;
        newTagSet.add(newTag);
      }
      const newTags = Array.from(newTagSet).sort();

      // Only add to updates if tags actually changed
      if (JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags)) {
        postUpdates.push({
          filePath: postPath,
          oldTags,
          newTags,
        });
      }
    }
  }

  return { groups, replacements, postUpdates };
}

/**
 * Execute the tag consolidation plan
 */
async function executeTagConsolidationPlan(
  plan: TagConsolidationPlan,
  dryRun = true
): Promise<{ success: boolean; summary: string }> {
  const summary: string[] = [];
  const prisma = new PrismaClient();

  try {
    summary.push("=== Tag Consolidation Plan ===\n");
    summary.push(`Found ${plan.groups.length} groups of duplicate tags:`);
    summary.push(`Will update ${plan.postUpdates.length} posts:\n`);

    // Report duplicate groups
    for (const group of plan.groups) {
      summary.push(
        `\nGroup: "${group.canonicalTag.name}" (${group.canonicalTag.postCount} posts, similarity: ${(group.similarity * 100).toFixed(1)}%)`
      );
      summary.push(
        `  Canonical: "${group.canonicalTag.name}" (${group.canonicalTag.postCount} posts)`
      );

      for (const duplicate of group.duplicates) {
        summary.push(
          `  Duplicate: "${duplicate.name}" (${duplicate.postCount} posts)`
        );
      }
      summary.push(`  Reason: ${group.reason}`);
    }

    summary.push("\n=== Post Updates ===");
    summary.push(`Total posts to update: ${plan.postUpdates.length}\n`);

    if (dryRun) {
      summary.push("=== DRY RUN - No changes made ===\n");

      // Show sample of updates
      const sampleSize = Math.min(10, plan.postUpdates.length);
      summary.push(`Showing first ${sampleSize} post updates:\n`);

      for (let i = 0; i < sampleSize; i++) {
        const update = plan.postUpdates[i];
        const relativePath = update.filePath.replace(`${process.cwd()}/`, "");
        summary.push(`File: ${relativePath}`);
        summary.push(
          `  Old tags: [${update.oldTags.map((t) => `"${t}"`).join(", ")}]`
        );
        summary.push(
          `  New tags: [${update.newTags.map((t) => `"${t}"`).join(", ")}]`
        );
        summary.push("");
      }

      if (plan.postUpdates.length > sampleSize) {
        summary.push(
          `... and ${plan.postUpdates.length - sampleSize} more posts`
        );
      }
    } else {
      // Execute the actual updates
      summary.push("=== EXECUTION MODE - Applying changes ===\n");
      let updatedFiles = 0;
      let updatedDatabasePosts = 0;
      let errors = 0;

      for (const update of plan.postUpdates) {
        try {
          // Read the file
          const content = readFileSync(update.filePath, "utf-8");

          // Replace the tags line
          const _oldTagsLine = `tags: [${update.oldTags.map((t) => `"${t}"`).join(",")}]`;
          const newTagsLine = `tags: [${update.newTags.map((t) => `"${t}"`).join(", ")}]`;

          // Use regex to replace the tags line precisely
          const updatedContent = content.replace(
            /^tags:\s*\[.*?\]$/m,
            newTagsLine
          );

          // Write the updated content back
          writeFileSync(update.filePath, updatedContent);
          updatedFiles++;

          const relativePath = update.filePath.replace(`${process.cwd()}/`, "");
          summary.push(`Updated: ${relativePath}`);

          // Update the database - find post by file path
          const post = await prisma.post.findFirst({
            where: { filePath: { endsWith: relativePath } },
            include: { tags: true },
          });

          if (post) {
            // Disconnect old tags and connect new tags
            await prisma.post.update({
              where: { id: post.id },
              data: {
                tags: {
                  disconnect: post.tags.map((tag) => ({ id: tag.id })),
                  connectOrCreate: update.newTags.map((tagName) => ({
                    where: { name: tagName },
                    create: {
                      name: tagName,
                      slug: tagName.toLowerCase().replace(/\s+/g, "-"),
                    },
                  })),
                },
              },
            });
            updatedDatabasePosts++;
            summary.push(`  ✅ Database updated for post: ${post.slug}`);
          } else {
            summary.push(
              `  ⚠️  Post not found in database for: ${relativePath}`
            );
          }
        } catch (error) {
          errors++;
          summary.push(`ERROR updating ${update.filePath}: ${error}`);
        }
      }

      summary.push("\nSUMMARY:");
      summary.push(`  Updated files: ${updatedFiles}`);
      summary.push(`  Updated database posts: ${updatedDatabasePosts}`);
      if (errors > 0) {
        summary.push(`  Errors: ${errors}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  return {
    success: true,
    summary: summary.join("\n"),
  };
}

export const consolidateTags: CodemodDefinition = {
  name: "consolidate-tags",
  description:
    "Consolidates duplicate tags in finding and sight posts using AI embeddings",
  transform: async (_context) => {
    try {
      // Get API key from environment
      const apiKey = resolveApiKey();
      if (!apiKey) {
        return {
          modified: false,
          message:
            "GEMINI_API_KEY environment variable required (see .env.example)",
        };
      }

      // Extract tags from finding and sight posts
      const postTypes = ["finding", "sight"];
      const tags = await extractTags(postTypes);

      if (tags.length === 0) {
        return {
          modified: false,
          message: "No tags found in finding or sight posts",
        };
      }

      console.log(`Found ${tags.length} unique tags. Processing embeddings...`);

      // Get or generate embeddings for all tags
      const tagsWithEmbeddings = await getOrGenerateEmbeddings(
        tags,
        apiKey,
        DEFAULT_CONFIG
      );

      // Find duplicate tags
      const duplicateGroups = findDuplicateTags(
        tagsWithEmbeddings,
        DEFAULT_CONFIG
      );

      // Create consolidation plan
      const plan = createTagConsolidationPlan(
        duplicateGroups,
        tagsWithEmbeddings
      );

      // Execute plan (check for execution mode from environment)
      const executeMode = process.argv.includes("--execute");
      const result = await executeTagConsolidationPlan(plan, !executeMode);

      // Write analysis report
      const reportPath = join(
        process.cwd(),
        ".analysis/tag-consolidation-report.md"
      );
      const reportDir = dirname(reportPath);
      if (!existsSync(reportDir)) {
        mkdirSync(reportDir, { recursive: true });
      }

      const reportContent = [
        "# Tag Consolidation Analysis Report",
        "",
        `Generated on: ${new Date().toISOString()}`,
        `Total unique tags analyzed: ${tags.length}`,
        `Tags with embeddings: ${tagsWithEmbeddings.filter((t) => t.embedding).length}`,
        `Duplicate groups found: ${duplicateGroups.length}`,
        `Posts to update: ${plan.postUpdates.length}`,
        `Similarity threshold: ${DEFAULT_CONFIG.similarityThreshold}`,
        `Model version: ${DEFAULT_CONFIG.modelVersion}`,
        `Embedding dimensionality: ${DEFAULT_CONFIG.embeddingDimensionality}`,
        "",
        "## Top Tags by Usage",
        "",
        ...tags
          .sort((a, b) => b.postCount - a.postCount)
          .slice(0, 20)
          .map((tag) => `- "${tag.name}": ${tag.postCount} posts`),
        "",
        "## Analysis Results",
        "",
        result.summary,
        "",
        "## Raw Tag Data",
        "",
        "```json",
        JSON.stringify(
          {
            tags: tagsWithEmbeddings
              .map((tag) => ({
                name: tag.name,
                postCount: tag.postCount,
                hasEmbedding: !!tag.embedding,
              }))
              .slice(0, 50), // Limit to first 50 for readability
            duplicateGroups: duplicateGroups.map((group) => ({
              canonical: group.canonicalTag.name,
              duplicates: group.duplicates.map((d) => d.name),
              similarity: group.similarity,
              reason: group.reason,
            })),
          },
          null,
          2
        ),
        "```",
      ].join("\n");

      writeFileSync(reportPath, reportContent);

      const summaryMessage =
        duplicateGroups.length > 0
          ? `Tag analysis complete. ${duplicateGroups.length} duplicate groups found. ${plan.postUpdates.length} posts need updating.`
          : "Tag analysis complete. No duplicate tags found.";

      return {
        modified: false, // We don't modify the original file, just generate a report
        message: `${summaryMessage} Report saved to ${reportPath}.\n\n${result.summary.split("\n").slice(0, 20).join("\n")}`,
      };
    } catch (error) {
      return {
        modified: false,
        message: `Error during tag consolidation: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
