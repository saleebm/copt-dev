#!/usr/bin/env bun

/**
 * Post Deduplication Script
 *
 * This script finds posts with duplicate slugs and consolidates them into a single location,
 * picking the best category based on depth, specificity, and file organization.
 *
 * Usage:
 *   bun run scripts/deduplicate-posts.ts [--execute] [--verbose]
 *
 * By default, this runs in dry-run mode. Use --execute to actually perform the consolidation.
 */

import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { getAllPosts, type ParsedPost } from "@/lib/mdx-parser";

type DuplicateGroup = {
  slug: string;
  posts: Array<{
    title: string;
    type: string;
    filePath: string;
    categories: string[];
    tags: string[];
    date?: string | null;
    score?: number;
  }>;
  bestPath?: string;
  reason?: string;
};

/**
 * Score a post location based on its categories and path
 * Higher score = better location
 */
function scorePostLocation(post: ParsedPost): number {
  let score = 0;
  const relativePath = path.relative(process.cwd(), post.filePath);
  const pathParts = relativePath.split(path.sep);

  // 1. Prefer more specific paths (deeper nesting)
  score += pathParts.length * 10;

  // 2. Prefer paths with more categories
  score += (post.categories?.length || 0) * 20;

  // 3. Penalize generic locations
  const genericTerms = ["misc", "other", "general", "uncategorized", "temp"];
  for (const term of genericTerms) {
    if (relativePath.toLowerCase().includes(term)) {
      score -= 50;
    }
  }

  // 4. Bonus for well-organized paths (matching category hierarchy)
  const pathCategories = pathParts.slice(2, -1); // Skip posts/finding and filename
  const categoryMatch = pathCategories.every((part) =>
    post.categories?.some(
      (cat: string) =>
        cat.toLowerCase().replace(/\s+/g, "-") === part.toLowerCase()
    )
  );
  if (categoryMatch) {
    score += 30;
  }

  // 5. Prefer paths with semantic alignment to content
  // Check if the path contains key terms from the title
  const titleWords = post.title.toLowerCase().split(/\s+/);
  const pathString = relativePath.toLowerCase();
  for (const word of titleWords) {
    if (word.length > 3 && pathString.includes(word)) {
      score += 5;
    }
  }

  // 6. Special handling for specific category patterns
  const categoryPatterns = [
    { pattern: ["ai-tools", "developer-tools"], score: 50 },
    { pattern: ["ai-tools", "prompt-engineering"], score: 45 },
    { pattern: ["large-language-models", "developer-tools"], score: 48 },
    { pattern: ["ai-tools", "ai-agents"], score: 47 },
    { pattern: ["open-source-software"], score: 40 },
  ];

  for (const { pattern, score: bonusScore } of categoryPatterns) {
    if (
      pattern.every((cat) =>
        post.categories?.some(
          (c: string) => c.toLowerCase().replace(/\s+/g, "-") === cat
        )
      )
    ) {
      score += bonusScore;
    }
  }

  return score;
}

/**
 * Use AI to determine the best location when scores are close
 */
async function pickBestLocationWithAI(
  group: DuplicateGroup,
  apiKey: string
): Promise<{ bestIndex: number; reason: string }> {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
Given a post with duplicate locations, pick the BEST location based on semantic fit and organization.

Post Title: ${group.posts[0].title}
Post Type: ${group.posts[0].type}

Locations to choose from:
${group.posts
  .map(
    (p, i) => `
${i + 1}. Path: ${path.relative(process.cwd(), p.filePath)}
   Categories: ${p.categories?.join(", ") || "none"}
   Score: ${p.score}
`
  )
  .join("")}

Consider:
1. Semantic alignment between title and path
2. Category specificity and relevance
3. Avoid redundant nesting (e.g., ai-tools/developer-tools/ai-workflow-management is redundant)
4. Prefer paths that best describe what the content is about

Return ONLY a JSON object with:
{
  "bestIndex": <0-based index of best location>,
  "reason": "<brief explanation>"
}
`;

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });
    const text = result.text || "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        bestIndex: parsed.bestIndex,
        reason: parsed.reason,
      };
    }
  } catch (error) {
    console.warn("AI scoring failed, using heuristic score:", error);
  }

  // Fallback to highest score
  const bestIndex = group.posts.reduce(
    (best, post, index) =>
      (post.score || 0) > (group.posts[best].score || 0) ? index : best,
    0
  );

  return {
    bestIndex,
    reason: "Selected based on highest heuristic score",
  };
}

/**
 * Find and consolidate duplicate posts
 */
async function deduplicatePosts(execute = false, verbose = false) {
  console.log(
    execute
      ? "🔧 EXECUTE MODE: Will consolidate duplicates"
      : "🔍 DRY RUN: Analyzing duplicates..."
  );

  const allPosts = getAllPosts();

  // Filter out dynamic posts
  const staticPosts = allPosts.filter(
    (post) =>
      !(post.slug.startsWith("findings-") || post.slug.startsWith("sights-"))
  );

  // Group posts by slug
  const postsBySlug = new Map<string, typeof staticPosts>();
  for (const post of staticPosts) {
    if (!postsBySlug.has(post.slug)) {
      postsBySlug.set(post.slug, []);
    }
    postsBySlug.get(post.slug)?.push(post);
  }

  // Find duplicates
  const duplicateGroups: DuplicateGroup[] = [];
  for (const [slug, posts] of postsBySlug.entries()) {
    if (posts.length > 1) {
      duplicateGroups.push({
        slug,
        posts: posts.map((p) => ({
          title: p.title,
          type: p.type,
          filePath: p.filePath,
          categories: p.categories || [],
          tags: p.tags || [],
          date: p.date,
          score: scorePostLocation(p),
        })),
      });
    }
  }

  if (duplicateGroups.length === 0) {
    console.log("✅ No duplicate slugs found!");
    return;
  }

  console.log(
    `\n📊 Found ${duplicateGroups.length} duplicate slugs to consolidate\n`
  );

  // Check for API key if we might need AI scoring
  const apiKey =
    process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || "";
  const useAI = !!apiKey;

  if (useAI) {
    console.log("🤖 Using AI-assisted location selection\n");
  } else {
    console.log("📏 Using heuristic scoring for location selection\n");
  }

  // Process each duplicate group
  const moves: Array<{ from: string; to: string }> = [];
  const deletions: string[] = [];

  for (const group of duplicateGroups) {
    // Sort by score
    group.posts.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Check if scores are close (within 20 points)
    const topScore = group.posts[0].score || 0;
    const closeScores = group.posts.filter(
      (p) => Math.abs((p.score || 0) - topScore) <= 20
    );

    let bestIndex = 0;
    let reason = "Highest heuristic score";

    // Use AI if available and scores are close
    if (useAI && closeScores.length > 1) {
      const aiResult = await pickBestLocationWithAI(group, apiKey);
      bestIndex = aiResult.bestIndex;
      reason = aiResult.reason;
    }

    const bestPost = group.posts[bestIndex];
    group.bestPath = bestPost.filePath;
    group.reason = reason;

    console.log(`📝 Slug: "${group.slug}"`);
    console.log(
      `   Best location: ${path.relative(process.cwd(), bestPost.filePath)}`
    );
    console.log(`   Reason: ${reason}`);

    if (verbose) {
      console.log("   All locations:");
      for (const post of group.posts) {
        const isBest = post.filePath === bestPost.filePath;
        console.log(
          `     ${isBest ? "✓" : "⨯"} ${path.relative(process.cwd(), post.filePath)} (score: ${post.score})`
        );
      }
    }

    // Plan moves for duplicates
    for (const post of group.posts) {
      if (post.filePath !== bestPost.filePath) {
        moves.push({
          from: post.filePath,
          to: bestPost.filePath,
        });
        deletions.push(post.filePath);
      }
    }

    console.log();
  }

  // Execute or report the plan
  console.log("\n📋 Consolidation Plan:");
  console.log(`   Files to delete: ${deletions.length}`);
  console.log(
    `   Unique posts after consolidation: ${postsBySlug.size - deletions.length}`
  );

  if (execute) {
    console.log("\n⚠️  Executing consolidation...\n");

    let successCount = 0;
    let errorCount = 0;

    for (const filePath of deletions) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(
            `   ✅ Deleted: ${path.relative(process.cwd(), filePath)}`
          );
          successCount++;
        } else {
          console.log(
            `   ⚠️  Already gone: ${path.relative(process.cwd(), filePath)}`
          );
        }
      } catch (error) {
        console.error(`   ❌ Failed to delete ${filePath}:`, error);
        errorCount++;
      }
    }

    console.log("\n✅ Consolidation complete!");
    console.log(`   Deleted: ${successCount} files`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} files`);
    }

    console.log(
      '\n💡 Next step: Run "bun run db:sync-posts" to update the database'
    );
  } else {
    console.log("\n💡 To execute this plan, run with --execute flag");
    console.log(
      "   This will DELETE the duplicate files, keeping only the best location"
    );

    if (verbose && deletions.length > 0) {
      console.log("\n   Files that would be deleted:");
      for (const file of deletions) {
        console.log(`     - ${path.relative(process.cwd(), file)}`);
      }
    }
  }
}

// Parse arguments
const args = process.argv.slice(2);
const execute = args.includes("--execute") || args.includes("-e");
const verbose = args.includes("--verbose") || args.includes("-v");
const help = args.includes("--help") || args.includes("-h");

if (help) {
  console.log(`
Post Deduplication Tool

This tool finds posts with duplicate slugs and consolidates them into the best location,
removing the duplicate files.

Usage:
  bun run scripts/deduplicate-posts.ts [options]

Options:
  --execute, -e    Actually delete duplicate files (default: dry-run)
  --verbose, -v    Show detailed information
  --help, -h       Show this help message

Environment Variables (optional):
  GOOGLE_GENAI_API_KEY or GEMINI_API_KEY
  If set, uses AI to help pick the best location when scores are close

The tool will:
1. Find all posts with duplicate slugs
2. Score each location based on path specificity and organization
3. Pick the best location for each duplicate
4. Delete the duplicate files (with --execute)
  `);
  process.exit(0);
}

// Run the deduplication
deduplicatePosts(execute, verbose).catch(console.error);
