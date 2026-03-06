#!/usr/bin/env bun
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PostType } from "@/lib/generated/prisma";

// Parse command line arguments
const args = process.argv.slice(2);
const maxFiles = Number.parseInt(args[0], 10) || 5; // Default to fixing max 5 files

// Check if claude CLI is available
function isClaudeAvailable(): boolean {
  try {
    execSync("which claude", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Validate MDX file
function validateMDX(filePath: string): boolean {
  try {
    // Skip if it's a directory
    if (fs.statSync(filePath).isDirectory()) {
      return true; // Directories are "valid" (skip them)
    }
    execSync(`bun run scripts/validate-mdx.ts "${filePath}"`, {
      stdio: "pipe",
      encoding: "utf-8",
    });
    return true;
  } catch {
    return false;
  }
}

// Fix MDX file with Claude
function fixMDXWithClaude(filePath: string): boolean {
  try {
    console.log(`\n🔧 Fixing: ${path.relative(process.cwd(), filePath)}`);
    console.log("─".repeat(60));

    execSync(`bun run scripts/fix-mdx-with-claude.ts "${filePath}"`, {
      stdio: "inherit",
    });

    console.log("─".repeat(60));
    return true;
  } catch {
    return false;
  }
}

// Walk directories and find MDX files without parsing them all
function* walkMDXFiles(
  baseDir: string,
  type: PostType
): Generator<string, void, unknown> {
  if (!fs.existsSync(baseDir)) {
    return;
  }

  function* walkDir(dir: string): Generator<string, void, unknown> {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        // Skip virtual post directories
        if (
          item.name.startsWith("findings-") ||
          item.name.startsWith("sights-")
        ) {
          continue;
        }

        if (item.isDirectory()) {
          // For SIGHT posts, look for README.md in directories
          if (type === PostType.SIGHT) {
            const readmePath = path.join(fullPath, "README.md");
            if (fs.existsSync(readmePath)) {
              yield readmePath;
            }
          }
          // For CONCRETE posts, don't recurse
          if (type !== PostType.CONCRETE) {
            yield* walkDir(fullPath);
          }
        } else if (item.isFile() && /\.mdx?$/.test(item.name)) {
          // For SIGHT posts, we already handled README.md above
          if (type !== PostType.SIGHT) {
            yield fullPath;
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
  }

  yield* walkDir(baseDir);
}

// Find broken files with early termination
function findBrokenFiles(maxToFind: number): string[] {
  const brokenFiles: string[] = [];
  let checkedCount = 0;

  const postTypes = [
    PostType.CONCRETE,
    PostType.BLOG,
    PostType.FINDING,
    PostType.SIGHT,
  ];

  console.log(
    `Scanning for broken MDX files (will stop after finding ${maxToFind})...`
  );
  console.log("─".repeat(60));

  // Iterate through post types and stop early when we have enough
  for (const type of postTypes) {
    const postsDir = path.join(process.cwd(), "posts", type.toLowerCase());

    for (const filePath of walkMDXFiles(postsDir, type)) {
      checkedCount++;
      process.stdout.write(
        `\rProgress: ${checkedCount} files checked, ${brokenFiles.length} broken found...`
      );

      if (!validateMDX(filePath)) {
        brokenFiles.push(filePath);
        // Clear the progress line and show the broken file
        process.stdout.write(`\r${" ".repeat(70)}\r`);
        console.log(
          `❌ Found broken MDX: ${path.relative(process.cwd(), filePath)}`
        );

        // Stop scanning if we've found enough broken files
        if (brokenFiles.length >= maxToFind) {
          process.stdout.write(`\r${" ".repeat(70)}\r`);
          console.log(`\n⚠️  Found ${maxToFind} broken files, stopping scan...`);
          return brokenFiles;
        }
      }
    }
  }

  // Clear the progress line
  process.stdout.write(`\r${" ".repeat(70)}\r`);
  return brokenFiles;
}

async function main() {
  console.log(
    `🔍 Starting efficient MDX scan (will fix max ${maxFiles} files)...`
  );

  if (!isClaudeAvailable()) {
    console.error("❌ Claude CLI is not installed or not in PATH");
    console.error(
      "Please install Claude CLI first: https://github.com/anthropics/claude-code"
    );
    process.exit(1);
  }

  try {
    // Find broken files with early termination
    const brokenFiles = findBrokenFiles(maxFiles);

    if (brokenFiles.length === 0) {
      console.log("✅ No broken MDX files found!");
      process.exit(0);
    }

    console.log(`\n📊 Found ${brokenFiles.length} broken MDX files`);
    console.log(`🔧 Will fix ${brokenFiles.length} files in this batch`);
    console.log("─".repeat(60));
    console.log("\nStarting automatic fix process...\n");

    let fixedCount = 0;
    let failedCount = 0;

    for (const filePath of brokenFiles) {
      if (fixMDXWithClaude(filePath)) {
        fixedCount++;
        console.log("✅ Successfully fixed!");
      } else {
        failedCount++;
        console.log("❌ Failed to fix");
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("📊 Fix Summary:");
    console.log(`  ✅ Fixed: ${fixedCount}`);
    console.log(`  ❌ Failed: ${failedCount}`);
    console.log(`  📝 Processed: ${brokenFiles.length}`);

    // Note: We can't know if there are more broken files without continuing to scan
    console.log("\nRun the command again to check for more broken files.");

    if (failedCount > 0) {
      console.log("\n⚠️  Some files could not be fixed automatically.");
      console.log("Manual intervention may be required.");
      process.exit(1);
    } else if (fixedCount > 0) {
      console.log("\n✅ Batch fix completed successfully!");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Error during MDX fix process:", error);
    process.exit(1);
  }
}

main();
