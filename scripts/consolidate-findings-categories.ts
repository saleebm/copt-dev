#!/usr/bin/env bun

/**
 * Category Consolidation Runner
 *
 * This script runs the consolidate-categories codemod to analyze and consolidate
 * duplicate categories in the posts/finding directory using AI embeddings.
 *
 * Usage:
 *   bun run scripts/consolidate-findings-categories.ts [--execute]
 *
 * By default, this runs in dry-run mode. Use --execute to actually perform moves.
 *
 * Prerequisites:
 *   - GEMINI_API_KEY environment variable set (see .env.example)
 *   - @google/genai package installed
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { consolidateCategories } from "./codemods/consolidate-categories";
import { resolveApiKey } from "./lib/ai-config";

async function main() {
  const args = process.argv.slice(2);
  const executeMode = args.includes("--execute");
  const helpMode = args.includes("--help") || args.includes("-h");

  if (helpMode) {
    console.log(`
Category Consolidation Tool

This tool analyzes categories in the posts/finding directory using AI embeddings
to identify and consolidate duplicate or highly similar categories.

Usage:
  bun run scripts/consolidate-findings-categories.ts [options]

Options:
  --execute    Actually perform the consolidation (default: dry-run only)
  --help, -h   Show this help message

Environment Variables Required:
  GEMINI_API_KEY (or GOOGLE_API_KEY — see .env.example)

The tool will:
1. Scan all categories in posts/finding directory
2. Generate embeddings for category names and descriptions
3. Find categories with >85% similarity
4. Create a consolidation plan
5. Generate a detailed analysis report
6. Optionally execute the consolidation (with --execute flag)

Reports are saved to .analysis/category-consolidation-report.md
    `);
    process.exit(0);
  }

  console.log("🔍 Starting category consolidation analysis...");

  // Check for API key
  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.error(
      "❌ Error: GEMINI_API_KEY environment variable required (see .env.example)"
    );
    process.exit(1);
  }

  // Check if findings directory exists
  const findingsPath = join(process.cwd(), "posts", "finding");
  if (!existsSync(findingsPath)) {
    console.error("❌ Error: posts/finding directory not found");
    console.error("   Please run this script from the project root directory");
    process.exit(1);
  }

  console.log(`📁 Analyzing categories in: ${findingsPath}`);
  console.log(`🔧 Mode: ${executeMode ? "EXECUTE" : "DRY RUN"}`);

  if (executeMode) {
    console.log(
      "⚠️  EXECUTION MODE: This will actually move files and delete directories!"
    );
  } else {
    console.log(
      "ℹ️  Running in dry-run mode. Use --execute to actually perform consolidation."
    );
  }

  try {
    // Run the consolidation codemod
    const result = await consolidateCategories.transform({
      filePath: findingsPath,
      content: "", // Not needed for directory analysis
      extension: "",
    });

    if (result.modified) {
      console.log("✅ Categories were consolidated successfully");
    } else {
      console.log("ℹ️  No changes made");
    }

    if (result.message) {
      console.log("\n📊 Analysis Results:");
      console.log(result.message);
    }

    console.log(
      "\n📋 Check .analysis/category-consolidation-report.md for detailed results"
    );
  } catch (error) {
    console.error("❌ Error during consolidation:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
