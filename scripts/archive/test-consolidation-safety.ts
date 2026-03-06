#!/usr/bin/env bun

/**
 * Test script to verify category consolidation doesn't create duplicate files
 *
 * This script checks for potential file conflicts before running consolidation
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

type FileLocation = {
  path: string;
  category: string;
};

function scanFindingsDirectory(
  findingsPath: string
): Map<string, FileLocation[]> {
  const fileMap = new Map<string, FileLocation[]>();

  function scanDir(dirPath: string, relativePath = "") {
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      const relPath = relativePath
        ? join(relativePath, entry.name)
        : entry.name;

      if (entry.isDirectory()) {
        scanDir(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
        const locations = fileMap.get(entry.name) || [];
        locations.push({
          path: fullPath,
          category: relativePath.replace(/[/\\][^/\\]+\.mdx$/, ""),
        });
        fileMap.set(entry.name, locations);
      }
    }
  }

  scanDir(findingsPath);
  return fileMap;
}

function checkPotentialConflicts(findingsPath: string) {
  console.log("🔍 Scanning for potential consolidation conflicts...\n");

  const fileMap = scanFindingsDirectory(findingsPath);
  const conflicts: Array<{ filename: string; locations: FileLocation[] }> = [];

  // Find files that exist in multiple locations
  for (const [filename, locations] of fileMap.entries()) {
    if (locations.length > 1) {
      conflicts.push({ filename, locations });
    }
  }

  if (conflicts.length === 0) {
    console.log("✅ No potential conflicts found!");
    console.log("   Category consolidation should be safe to run.\n");
    return;
  }

  console.log(
    `⚠️  Found ${conflicts.length} files that exist in multiple categories:\n`
  );

  for (const { filename, locations } of conflicts) {
    console.log(`📄 ${filename} (${locations.length} locations):`);
    for (const loc of locations) {
      console.log(`   - ${loc.category}/`);
    }
    console.log();
  }

  console.log(
    "⚠️  WARNING: Running category consolidation may handle these duplicates by:"
  );
  console.log("   1. Keeping the file in the target (consolidated) category");
  console.log("   2. Deleting duplicate files from source categories");
  console.log();
  console.log("💡 Recommendation:");
  console.log(
    '   1. Run "bun run deduplicate:execute" first to clean up duplicates'
  );
  console.log("   2. Then run category consolidation");
  console.log();
}

// Main
const findingsPath = join(process.cwd(), "posts", "finding");

if (!existsSync(findingsPath)) {
  console.error("❌ Error: posts/finding directory not found");
  process.exit(1);
}

checkPotentialConflicts(findingsPath);

// Also check current duplicate status
console.log("📊 Current duplicate status:");
console.log('   Run "bun run deduplicate" to see current duplicates');
console.log('   Run "bun run deduplicate:execute" to remove duplicates');
