#!/usr/bin/env bun

/**
 * Tag Consolidation Runner
 *
 * This script runs the consolidate-tags codemod to analyze and consolidate
 * duplicate tags in finding and sight posts using AI embeddings.
 *
 * Usage:
 *   bun run scripts/consolidate-tags-embeddings.ts [--execute]
 *
 * By default, this runs in dry-run mode. Use --execute to actually perform the updates.
 *
 * Prerequisites:
 *   - GEMINI_API_KEY environment variable set (see .env.example)
 *   - @google/genai package installed
 *   - Database migration run for TagEmbedding model
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { consolidateTags } from "./codemods/consolidate-tags";
import { resolveApiKey } from "./lib/ai-config";

async function main() {
  const args = process.argv.slice(2);
  const executeMode = args.includes("--execute");
  const helpMode = args.includes("--help") || args.includes("-h");
  const clearCache = args.includes("--clear-cache");

  if (helpMode) {
    console.log(`
Tag Consolidation Tool

This tool analyzes tags in finding and sight posts using AI embeddings
to identify and consolidate duplicate or highly similar tags.

Usage:
  bun run scripts/consolidate-tags-embeddings.ts [options]

Options:
  --execute       Actually perform the consolidation (default: dry-run only)
  --clear-cache   Clear cached tag embeddings before running
  --help, -h      Show this help message

Environment Variables Required:
  GEMINI_API_KEY (or GOOGLE_API_KEY — see .env.example)

The tool will:
1. Scan all tags in finding and sight posts
2. Generate embeddings for tag names and variations
3. Find tags with >80% similarity or obvious text duplicates
4. Create a consolidation plan
5. Generate a detailed analysis report
6. Optionally execute the consolidation (with --execute flag)

Reports are saved to .analysis/tag-consolidation-report.md
    `);
    process.exit(0);
  }

  console.log("🔍 Starting tag consolidation analysis...");

  // Check for API key
  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.error(
      "❌ Error: GEMINI_API_KEY environment variable required (see .env.example)"
    );
    process.exit(1);
  }

  // Check if finding directory exists
  const findingsPath = join(process.cwd(), "posts", "finding");
  if (!existsSync(findingsPath)) {
    console.error("❌ Error: posts/finding directory not found");
    console.error("   Please run this script from the project root directory");
    process.exit(1);
  }

  // Clear cache if requested
  if (clearCache) {
    console.log("🗑️  Clearing tag embedding cache...");
    try {
      const { clearTagEmbeddingCache } = await import(
        "./codemods/consolidate-tags"
      );
      const result = await clearTagEmbeddingCache();
      console.log(`✅ Cleared ${result.deletedCount} cached embeddings`);
    } catch (error) {
      console.warn(
        "⚠️  Could not clear cache (table might not exist yet):",
        error
      );
    }
  }

  console.log("📁 Analyzing tags in: finding and sight posts");
  console.log(`🔧 Mode: ${executeMode ? "EXECUTE" : "DRY RUN"}`);

  if (executeMode) {
    console.log(
      "⚠️  EXECUTION MODE: This will actually update files and database!"
    );
    console.log("⚠️  Make sure you have:");
    console.log("    1. Backed up your data or committed your changes");
    console.log("    2. Run the database migration for TagEmbedding model");
    console.log("");
    console.log("Press Ctrl+C now to cancel, or wait 5 seconds to continue...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } else {
    console.log(
      "ℹ️  Running in dry-run mode. Use --execute to actually perform consolidation."
    );
  }

  try {
    // Run the consolidation codemod
    const result = await consolidateTags.transform({
      filePath: "", // Not used for tag consolidation
      content: "", // Not needed for tag analysis
      extension: "",
    });

    if (result.modified) {
      console.log("✅ Tags were consolidated successfully");
    } else {
      console.log("ℹ️  No changes made");
    }

    if (result.message) {
      console.log("\n📊 Analysis Results:");
      console.log(result.message);
    }

    console.log(
      "\n📋 Check .analysis/tag-consolidation-report.md for detailed results"
    );
  } catch (error) {
    console.error("❌ Error during consolidation:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
