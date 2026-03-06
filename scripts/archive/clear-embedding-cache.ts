// Previously ran via: "clear:embeddings": "bun run scripts/clear-embedding-cache.ts"
#!/usr/bin/env bun

/**
 * Clear Embedding Cache Tool
 *
 * This script clears all cached embeddings from the database to force regeneration
 * on the next run of the category consolidation tool.
 *
 * Usage:
 *   bun run scripts/clear-embedding-cache.ts
 */

import { clearEmbeddingCache } from "./codemods/consolidate-categories";

async function main() {
  const args = process.argv.slice(2);
  const helpMode = args.includes("--help") || args.includes("-h");

  if (helpMode) {
    console.log(`
Clear Embedding Cache Tool

This tool clears all cached embeddings from the database. This forces
the category consolidation tool to regenerate embeddings on the next run,
which is useful when you want to:

- Test with fresh embeddings
- Clear potentially corrupted cache data  
- Reset after changing the embedding model or dimensions

Usage:
  bun run scripts/clear-embedding-cache.ts [options]

Options:
  --help, -h   Show this help message

Note: This operation cannot be undone. All cached embeddings will be permanently deleted.
    `);
    process.exit(0);
  }

  console.log("🧹 Clearing embedding cache...");

  try {
    const result = await clearEmbeddingCache();

    if (result.success) {
      console.log(
        `\n✅ Successfully cleared ${result.deletedCount} cached embeddings`
      );
      console.log(
        "💡 The next run of category consolidation will regenerate embeddings"
      );
    }
  } catch (error) {
    console.error("❌ Error clearing cache:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
