import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, sep } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { PrismaClient } from "@/lib/generated/prisma";
import { resolveApiKey } from "../lib/ai-config";
import type { CodemodDefinition } from "./types";

// Configuration for category analysis and consolidation
type CategoryAnalysisConfig = {
  similarityThreshold: number;
  maxCategoriesPerGroup: number;
  minFilesForCategory: number;
  preventParentChildDuplication: boolean;
  embeddingDimensionality: number;
  modelVersion: string;
};

type CategoryInfo = {
  path: string;
  name: string;
  fullPath: string;
  files: string[];
  parentPath: string | null;
  depth: number;
  embedding?: number[];
  description: string;
  descriptionHash: string;
};

type CategoryGroup = {
  canonicalCategory: CategoryInfo;
  duplicates: CategoryInfo[];
  similarity: number;
  suggestedPath: string;
  reason: string;
};

type ConsolidationPlan = {
  groups: CategoryGroup[];
  moves: Array<{
    from: string;
    to: string;
    files: string[];
  }>;
  deletions: string[];
  parentChildConflicts: Array<{
    parent: string;
    child: string;
    action: "merge_up" | "merge_down" | "keep_separate";
  }>;
};

// Default configuration
const DEFAULT_CONFIG: CategoryAnalysisConfig = {
  similarityThreshold: 0.7, // Categories with >70% similarity are considered duplicates (lowered based on user feedback)
  maxCategoriesPerGroup: 5, // Maximum categories to merge into one group
  minFilesForCategory: 1, // Minimum files required to keep a category
  preventParentChildDuplication: true, // Prevent parent/child categories from being merged
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
 * Generate a hash for the category description to detect changes
 */
function generateDescriptionHash(description: string): string {
  return createHash("sha256").update(description).digest("hex");
}

/**
 * Check if one category is a parent/child of another
 */
function isParentChild(
  categoryA: CategoryInfo,
  categoryB: CategoryInfo
): boolean {
  const pathA = categoryA.path;
  const pathB = categoryB.path;

  // Check if A is parent of B or B is parent of A
  return pathA.startsWith(`${pathB}/`) || pathB.startsWith(`${pathA}/`);
}

/**
 * Determine if a parent-child relationship should prevent consolidation
 * Returns true if consolidation should be prevented, false if it should be allowed
 */
function shouldPreventParentChildConsolidation(
  categoryA: CategoryInfo,
  categoryB: CategoryInfo,
  similarity: number
): boolean {
  if (!isParentChild(categoryA, categoryB)) {
    return false; // Not a parent-child relationship, no need to prevent
  }

  const [parent, child] =
    categoryA.depth < categoryB.depth
      ? [categoryA, categoryB]
      : [categoryB, categoryA];

  // Allow consolidation in these cases (more aggressive approach based on user feedback):

  // 1. High similarity (>75%) - they're likely the same concept, especially for sparse categories
  if (similarity > 0.75) {
    return false;
  }

  // 2. Either parent or child has very few files (<=2) and similarity is >70%
  // This suggests they're splitting content that should be together
  if (
    similarity > 0.7 &&
    (parent.files.length <= 2 || child.files.length <= 2)
  ) {
    return false;
  }

  // 3. Child has same name as parent (e.g., "developer-tools" under "ai-tools/developer-tools")
  if (child.name === parent.name) {
    return false;
  }

  // 4. Child name is contained in parent name or vice versa
  if (child.name.includes(parent.name) || parent.name.includes(child.name)) {
    return false;
  }

  // 5. Parent has no files and child has files - consolidate up
  if (parent.files.length === 0 && child.files.length > 0) {
    return false;
  }

  // 6. Child has no files and parent has files - consolidate down
  if (child.files.length === 0 && parent.files.length > 0) {
    return false;
  }

  // 7. Medium similarity (>65%) with specific patterns that suggest redundancy
  if (similarity > 0.65) {
    // Check for redundant patterns
    const redundantPatterns = [
      ["tools", "developer-tools"],
      ["ai", "ai-tools"],
      ["framework", "frameworks"],
      ["agent", "agents"],
      ["tool", "tools"],
      ["automation", "browser-automation"],
      ["management", "ai-workflow-management"],
    ];

    for (const [pattern1, pattern2] of redundantPatterns) {
      if (
        (parent.name.includes(pattern1) && child.name.includes(pattern2)) ||
        (parent.name.includes(pattern2) && child.name.includes(pattern1))
      ) {
        return false; // Allow consolidation for redundant patterns
      }
    }
  }

  // 8. Both parent and child have very few files (<=3 each) and medium similarity (>60%)
  // This suggests an over-granular categorization
  if (similarity > 0.6 && parent.files.length <= 3 && child.files.length <= 3) {
    return false;
  }

  // Only prevent consolidation for meaningful hierarchical relationships
  // where parent and child serve clearly different purposes with substantial content
  // AND lower similarity scores
  return similarity <= 0.6 && parent.files.length > 3 && child.files.length > 3;
}

/**
 * Clear all cached embeddings from the database
 */
export async function clearEmbeddingCache(): Promise<{
  success: boolean;
  deletedCount: number;
}> {
  console.log("🗑️  Clearing embedding cache...");

  const prisma = new PrismaClient();

  try {
    const deletedCount = await prisma.categoryEmbedding.deleteMany();
    console.log(
      `✅ Cleared ${deletedCount.count} cached embeddings from database`
    );
    return { success: true, deletedCount: deletedCount.count };
  } catch (error) {
    console.error("❌ Failed to clear embedding cache:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Extract category information from the findings directory
 */
function extractCategories(findingsPath: string): CategoryInfo[] {
  const categories: CategoryInfo[] = [];

  function traverseDirectory(
    currentPath: string,
    relativePath = "",
    depth = 0
  ): void {
    const fullPath = join(findingsPath, relativePath);

    if (!(existsSync(fullPath) && statSync(fullPath).isDirectory())) {
      return;
    }

    const entries = readdirSync(fullPath);
    const mdxFiles = entries.filter((entry) => entry.endsWith(".mdx"));
    const subdirs = entries.filter((entry) => {
      const entryPath = join(fullPath, entry);
      return statSync(entryPath).isDirectory();
    });

    // If this directory has MDX files, it's a category
    if (mdxFiles.length > 0) {
      const categoryName = relativePath.split(sep).pop() || "";
      const parentPath = relativePath.split(sep).slice(0, -1).join(sep) || null;

      // Create a comprehensive description for embedding
      const description = [
        categoryName.replace(/-/g, " "),
        relativePath.replace(/\//g, " ").replace(/-/g, " "),
        `${mdxFiles.length} files`,
        `depth ${depth}`,
        parentPath
          ? `under ${parentPath.replace(/\//g, " ").replace(/-/g, " ")}`
          : "top level",
        // Add context from file names
        mdxFiles
          .map((f) => f.replace(/\.mdx$/, "").replace(/-/g, " "))
          .slice(0, 3)
          .join(" "),
      ].join(" ");

      categories.push({
        path: relativePath,
        name: categoryName,
        fullPath,
        files: mdxFiles,
        parentPath,
        depth,
        description,
        descriptionHash: generateDescriptionHash(description),
      });
    }

    // Recursively process subdirectories
    for (const subdir of subdirs) {
      const subPath = relativePath ? join(relativePath, subdir) : subdir;
      traverseDirectory(currentPath, subPath, depth + 1);
    }
  }

  traverseDirectory(findingsPath);
  return categories;
}

/**
 * Get or generate embeddings for categories using database persistence
 */
async function getOrGenerateEmbeddings(
  categories: CategoryInfo[],
  apiKey: string,
  config: CategoryAnalysisConfig
): Promise<CategoryInfo[]> {
  const prisma = new PrismaClient();
  const ai = new GoogleGenAI({ apiKey });

  const categoriesWithEmbeddings: CategoryInfo[] = [];

  try {
    for (const category of categories) {
      try {
        // Check if we have a cached embedding
        const existingEmbedding = await prisma.categoryEmbedding.findUnique({
          where: { path: category.path },
        });

        let embedding: number[] | undefined;

        if (
          existingEmbedding &&
          existingEmbedding.embeddingHash === category.descriptionHash &&
          existingEmbedding.modelVersion === config.modelVersion &&
          existingEmbedding.dimensionality === config.embeddingDimensionality
        ) {
          // Use cached embedding
          embedding = existingEmbedding.embedding;
          console.log(`Using cached embedding for: ${category.path}`);
        } else {
          // Generate new embedding
          console.log(`Generating embedding for: ${category.path}`);

          const result = await ai.models.embedContent({
            model: config.modelVersion,
            contents: category.description,
          });

          if (result.embeddings?.[0]?.values) {
            embedding = result.embeddings[0].values;

            // Save or update embedding in database
            await prisma.categoryEmbedding.upsert({
              where: { path: category.path },
              update: {
                name: category.name,
                fullPath: category.fullPath,
                parentPath: category.parentPath,
                depth: category.depth,
                fileCount: category.files.length,
                description: category.description,
                embedding,
                embeddingHash: category.descriptionHash,
                modelVersion: config.modelVersion,
                dimensionality: config.embeddingDimensionality,
              },
              create: {
                path: category.path,
                name: category.name,
                fullPath: category.fullPath,
                parentPath: category.parentPath,
                depth: category.depth,
                fileCount: category.files.length,
                description: category.description,
                embedding,
                embeddingHash: category.descriptionHash,
                modelVersion: config.modelVersion,
                dimensionality: config.embeddingDimensionality,
              },
            });

            // Rate limiting - wait 100ms between API requests
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        if (embedding) {
          categoriesWithEmbeddings.push({
            ...category,
            embedding,
          });
        } else {
          console.warn(
            `Failed to get embedding for category: ${category.path}`
          );
          categoriesWithEmbeddings.push(category);
        }
      } catch (error) {
        console.warn(`Error processing embedding for ${category.path}:`, error);
        categoriesWithEmbeddings.push(category);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  return categoriesWithEmbeddings;
}

/**
 * Find duplicate categories using embedding similarity with proper nesting handling
 */
function findDuplicateCategories(
  categories: CategoryInfo[],
  config: CategoryAnalysisConfig
): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];

    if (processed.has(category.path) || !category.embedding) {
      continue;
    }

    const group: CategoryGroup = {
      canonicalCategory: category,
      duplicates: [],
      similarity: 1.0,
      suggestedPath: category.path,
      reason: "Initial canonical category",
    };

    // Find similar categories
    for (let j = i + 1; j < categories.length; j++) {
      const otherCategory = categories[j];

      if (processed.has(otherCategory.path) || !otherCategory.embedding) {
        continue;
      }

      const similarity = cosineSimilarity(
        category.embedding,
        otherCategory.embedding
      );

      // Skip parent-child relationships if prevention is enabled and should be prevented
      if (
        config.preventParentChildDuplication &&
        shouldPreventParentChildConsolidation(
          category,
          otherCategory,
          similarity
        )
      ) {
        console.log(
          `Skipping parent-child relationship (protected): ${category.path} <-> ${otherCategory.path} (similarity: ${(similarity * 100).toFixed(1)}%)`
        );
        continue;
      }

      if (similarity >= config.similarityThreshold) {
        // Log if this is a parent-child relationship being allowed
        if (isParentChild(category, otherCategory)) {
          console.log(
            `Allowing parent-child consolidation: ${category.path} <-> ${otherCategory.path} (similarity: ${(similarity * 100).toFixed(1)}%)`
          );
        }

        group.duplicates.push(otherCategory);
        processed.add(otherCategory.path);

        // Update similarity to the minimum similarity in the group
        group.similarity = Math.min(group.similarity, similarity);
      }
    }

    // Only add groups that have duplicates
    if (group.duplicates.length > 0) {
      // Choose the best canonical category based on multiple criteria
      const allCategories = [group.canonicalCategory, ...group.duplicates];
      const bestCategory = allCategories.reduce((best, current) => {
        // Prefer categories with more files
        if (current.files.length > best.files.length) {
          return current;
        }
        if (current.files.length < best.files.length) {
          return best;
        }

        // Prefer categories with less nesting (closer to root)
        if (current.depth < best.depth) {
          return current;
        }
        if (current.depth > best.depth) {
          return best;
        }

        // Prefer more generic names (shorter)
        if (current.name.length < best.name.length) {
          return current;
        }
        if (current.name.length > best.name.length) {
          return best;
        }

        // Prefer alphabetically first
        return current.path < best.path ? current : best;
      });

      if (bestCategory !== group.canonicalCategory) {
        group.duplicates = group.duplicates.filter(
          (cat) => cat !== bestCategory
        );
        group.duplicates.unshift(group.canonicalCategory);
        group.canonicalCategory = bestCategory;
      }

      group.suggestedPath = group.canonicalCategory.path;
      group.reason = `Consolidated ${group.duplicates.length + 1} similar categories (${(group.similarity * 100).toFixed(1)}% similarity)`;
      groups.push(group);
    }

    processed.add(category.path);
  }

  return groups;
}

/**
 * Detect parent-child conflicts and suggest resolutions
 */
function detectParentChildConflicts(categories: CategoryInfo[]): Array<{
  parent: string;
  child: string;
  action: "merge_up" | "merge_down" | "keep_separate";
}> {
  const conflicts: Array<{
    parent: string;
    child: string;
    action: "merge_up" | "merge_down" | "keep_separate";
  }> = [];

  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const catA = categories[i];
      const catB = categories[j];

      if (isParentChild(catA, catB)) {
        const [parent, child] =
          catA.depth < catB.depth ? [catA, catB] : [catB, catA];

        // Decide action based on file counts and naming
        let action: "merge_up" | "merge_down" | "keep_separate";

        if (parent.files.length === 0 && child.files.length > 0) {
          action = "merge_up"; // Move child files to parent and remove child
        } else if (parent.files.length > 0 && child.files.length === 0) {
          action = "merge_down"; // Remove empty child
        } else if (
          parent.name === child.name ||
          child.name.includes(parent.name)
        ) {
          action = "merge_up"; // Similar names, consolidate to parent
        } else {
          action = "keep_separate"; // Different purposes, keep both
        }

        conflicts.push({
          parent: parent.path,
          child: child.path,
          action,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Create a consolidation plan with proper nesting handling
 * This function creates a plan for moving files between categories without creating duplicates.
 * If a file already exists in the target directory, it will be skipped during execution
 * and the source file will be deleted to prevent duplicates.
 */
function createConsolidationPlan(
  groups: CategoryGroup[],
  categories: CategoryInfo[],
  _findingsPath: string
): ConsolidationPlan {
  const moves: Array<{ from: string; to: string; files: string[] }> = [];
  const deletions: string[] = [];
  const parentChildConflicts = detectParentChildConflicts(categories);

  // Handle duplicate groups
  for (const group of groups) {
    for (const duplicate of group.duplicates) {
      // Move all files from duplicate to canonical category
      if (duplicate.files.length > 0) {
        moves.push({
          from: duplicate.path,
          to: group.canonicalCategory.path,
          files: duplicate.files,
        });
      }

      // Mark duplicate directory for deletion
      deletions.push(duplicate.path);
    }
  }

  // Handle parent-child conflicts
  for (const conflict of parentChildConflicts) {
    if (conflict.action === "merge_up") {
      const childCategory = categories.find((c) => c.path === conflict.child);
      const parentCategory = categories.find((c) => c.path === conflict.parent);

      if (childCategory && parentCategory && childCategory.files.length > 0) {
        moves.push({
          from: conflict.child,
          to: conflict.parent,
          files: childCategory.files,
        });
        deletions.push(conflict.child);
      }
    }
  }

  return { groups, moves, deletions, parentChildConflicts };
}

/**
 * Execute the consolidation plan
 */
function executeConsolidationPlan(
  plan: ConsolidationPlan,
  findingsPath: string,
  dryRun = true
): { success: boolean; summary: string } {
  const summary: string[] = [];
  summary.push("=== Enhanced Category Consolidation Plan ===\n");
  summary.push(`Found ${plan.groups.length} groups of duplicate categories:`);
  summary.push(
    `Found ${plan.parentChildConflicts.length} parent-child conflicts:\n`
  );

  // Report duplicate groups
  for (const group of plan.groups) {
    summary.push(
      `Group: ${group.canonicalCategory.name} (similarity: ${(group.similarity * 100).toFixed(1)}%)`
    );
    summary.push(
      `  Canonical: ${group.canonicalCategory.path} (${group.canonicalCategory.files.length} files, depth: ${group.canonicalCategory.depth})`
    );

    for (const duplicate of group.duplicates) {
      summary.push(
        `  Duplicate: ${duplicate.path} (${duplicate.files.length} files, depth: ${duplicate.depth})`
      );
    }
    summary.push(`  Reason: ${group.reason}\n`);
  }

  // Report parent-child conflicts
  if (plan.parentChildConflicts.length > 0) {
    summary.push("\n=== Parent-Child Conflicts ===");
    for (const conflict of plan.parentChildConflicts) {
      summary.push(
        `${conflict.parent} -> ${conflict.child}: ${conflict.action}`
      );
    }
  }

  summary.push("\n=== Planned Actions ===");
  summary.push(`File moves: ${plan.moves.length}`);
  summary.push(`Directory deletions: ${plan.deletions.length}\n`);

  if (dryRun) {
    summary.push("=== DRY RUN - No changes made ===");

    // Check for potential file conflicts
    let conflictCount = 0;
    for (const move of plan.moves) {
      const targetPath = join(findingsPath, move.to);
      const conflicts: string[] = [];

      for (const file of move.files) {
        const targetFile = join(targetPath, file);
        if (existsSync(targetFile)) {
          conflicts.push(file);
          conflictCount++;
        }
      }

      summary.push(
        `MOVE: ${move.files.length} files from ${move.from} → ${move.to}`
      );

      if (conflicts.length > 0) {
        summary.push(
          `  ⚠️  WARNING: ${conflicts.length} files already exist in target (would be skipped):`
        );
        for (const conflict of conflicts) {
          summary.push(
            `    - ${conflict} (duplicate - source would be deleted)`
          );
        }
      }

      for (const file of move.files) {
        if (!conflicts.includes(file)) {
          summary.push(`  - ${file}`);
        }
      }
    }

    if (conflictCount > 0) {
      summary.push(
        `\n⚠️  IMPORTANT: ${conflictCount} potential file conflicts detected!`
      );
      summary.push("   These files already exist in target directories.");
      summary.push(
        "   During execution, duplicates will be deleted from source, keeping target versions."
      );
    }

    for (const deletion of plan.deletions) {
      summary.push(`DELETE: ${deletion}/`);
    }
  } else {
    // Execute the actual moves
    summary.push("=== EXECUTION MODE - Changes applied ===");
    let movedFiles = 0;
    let skippedFiles = 0;
    let deletedDuplicates = 0;
    let deletedDirs = 0;

    for (const move of plan.moves) {
      const sourcePath = join(findingsPath, move.from);
      const targetPath = join(findingsPath, move.to);

      // Ensure target directory exists
      if (!existsSync(targetPath)) {
        mkdirSync(targetPath, { recursive: true });
      }

      // Move files
      for (const file of move.files) {
        const sourceFile = join(sourcePath, file);
        const targetFile = join(targetPath, file);

        if (existsSync(sourceFile)) {
          try {
            // Check if target file already exists
            if (existsSync(targetFile)) {
              // Skip moving but delete source to avoid duplicates
              skippedFiles++;
              deletedDuplicates++;
              summary.push(`SKIPPED: ${file} - already exists in ${move.to}`);

              // Delete the source file to avoid duplicates
              unlinkSync(sourceFile);
              summary.push(`  Deleted duplicate source: ${move.from}/${file}`);
              continue;
            }

            // Move the file (read, write to target, delete source)
            const content = readFileSync(sourceFile, "utf-8");
            writeFileSync(targetFile, content);
            unlinkSync(sourceFile); // Always delete source after successful copy
            movedFiles++;
            summary.push(`MOVED: ${file} from ${move.from} to ${move.to}`);
          } catch (error) {
            summary.push(`ERROR moving ${file}: ${error}`);
          }
        }
      }
    }

    // Delete empty directories
    for (const deletion of plan.deletions) {
      const deletionPath = join(findingsPath, deletion);
      if (existsSync(deletionPath)) {
        try {
          const entries = readdirSync(deletionPath);
          if (entries.length === 0) {
            // Only delete if directory is empty
            require("node:fs").rmdirSync(deletionPath);
            deletedDirs++;
            summary.push(`DELETED: ${deletion}/`);
          } else {
            summary.push(`SKIPPED deletion of ${deletion}/ - not empty`);
          }
        } catch (error) {
          summary.push(`ERROR deleting ${deletion}/: ${error}`);
        }
      }
    }

    summary.push("\nSUMMARY:");
    summary.push(`  Moved: ${movedFiles} files`);
    if (skippedFiles > 0) {
      summary.push(
        `  Skipped: ${skippedFiles} files (already existed in target)`
      );
      summary.push(`  Deleted duplicates: ${deletedDuplicates} files`);
    }
    summary.push(`  Deleted directories: ${deletedDirs}`);
  }

  return {
    success: true,
    summary: summary.join("\n"),
  };
}

export const consolidateCategories: CodemodDefinition = {
  name: "consolidate-categories",
  description:
    "Consolidates duplicate categories in findings directory using AI embeddings with proper nesting handling",
  transform: async (context) => {
    // This transform expects to be run on the findings directory root
    const findingsPath = context.filePath;

    if (!context.filePath.includes("posts/finding")) {
      return {
        modified: false,
        message: "This codemod should only be run on the findings directory",
      };
    }

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

      // Extract categories from findings directory
      const rootFindingsPath = `${findingsPath.split("posts/finding")[0]}posts/finding`;
      const categories = extractCategories(rootFindingsPath);

      if (categories.length === 0) {
        return {
          modified: false,
          message: "No categories found in findings directory",
        };
      }

      console.log(
        `Found ${categories.length} categories. Processing embeddings...`
      );

      // Get or generate embeddings for all categories
      const categoriesWithEmbeddings = await getOrGenerateEmbeddings(
        categories,
        apiKey,
        DEFAULT_CONFIG
      );

      // Find duplicate categories with proper nesting handling
      const duplicateGroups = findDuplicateCategories(
        categoriesWithEmbeddings,
        DEFAULT_CONFIG
      );

      // Create enhanced consolidation plan (even if no duplicates, we want to show parent-child analysis)
      const plan = createConsolidationPlan(
        duplicateGroups,
        categoriesWithEmbeddings,
        rootFindingsPath
      );

      // Execute plan (check for execution mode from environment)
      const executeMode = process.argv.includes("--execute");
      const result = executeConsolidationPlan(
        plan,
        rootFindingsPath,
        !executeMode
      );

      // Write enhanced analysis report
      // Find the project root by looking for package.json
      let projectRoot = rootFindingsPath;
      while (projectRoot !== dirname(projectRoot)) {
        if (existsSync(join(projectRoot, "package.json"))) {
          break;
        }
        projectRoot = dirname(projectRoot);
      }

      const reportPath = join(
        projectRoot,
        ".analysis/category-consolidation-report.md"
      );
      const reportDir = dirname(reportPath);
      if (!existsSync(reportDir)) {
        mkdirSync(reportDir, { recursive: true });
      }

      const reportContent = [
        "# Enhanced Category Consolidation Analysis Report",
        "",
        `Generated on: ${new Date().toISOString()}`,
        `Total categories analyzed: ${categories.length}`,
        `Categories with embeddings: ${categoriesWithEmbeddings.filter((c) => c.embedding).length}`,
        `Duplicate groups found: ${duplicateGroups.length}`,
        `Parent-child conflicts: ${plan.parentChildConflicts.length}`,
        `Similarity threshold: ${DEFAULT_CONFIG.similarityThreshold}`,
        `Model version: ${DEFAULT_CONFIG.modelVersion}`,
        `Embedding dimensionality: ${DEFAULT_CONFIG.embeddingDimensionality}`,
        "",
        "## Analysis Results",
        "",
        result.summary,
        "",
        "## Category Hierarchy Analysis",
        "",
        "### Top-level categories:",
        ...categoriesWithEmbeddings
          .filter((c) => c.depth === 0)
          .map((c) => `- ${c.path} (${c.files.length} files)`),
        "",
        "### Deepest categories:",
        ...categoriesWithEmbeddings
          .filter((c) => c.depth >= 3)
          .map(
            (c) => `- ${c.path} (depth: ${c.depth}, ${c.files.length} files)`
          ),
        "",
        "## Raw Category Data",
        "",
        "```json",
        JSON.stringify(
          {
            categories: categoriesWithEmbeddings.map((cat) => ({
              path: cat.path,
              name: cat.name,
              parentPath: cat.parentPath,
              files: cat.files.length,
              depth: cat.depth,
              hasEmbedding: !!cat.embedding,
              descriptionHash: cat.descriptionHash,
            })),
            duplicateGroups: duplicateGroups.map((group) => ({
              canonical: group.canonicalCategory.path,
              duplicates: group.duplicates.map((d) => d.path),
              similarity: group.similarity,
              reason: group.reason,
            })),
            parentChildConflicts: plan.parentChildConflicts,
          },
          null,
          2
        ),
        "```",
      ].join("\n");

      writeFileSync(reportPath, reportContent);

      const summaryMessage =
        duplicateGroups.length > 0
          ? `Enhanced analysis complete. ${duplicateGroups.length} duplicate groups and ${plan.parentChildConflicts.length} parent-child conflicts found.`
          : `Enhanced analysis complete. No duplicate categories found (parent-child relationships properly handled). ${plan.parentChildConflicts.length} parent-child relationships detected.`;

      return {
        modified: false, // We don't modify the original file, just generate a report
        message: `${summaryMessage} Report saved to ${reportPath}.\n\n${result.summary.split("\n").slice(0, 15).join("\n")}`,
      };
    } catch (error) {
      return {
        modified: false,
        message: `Error during category consolidation: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
