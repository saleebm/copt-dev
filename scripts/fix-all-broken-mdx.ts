#!/usr/bin/env bun
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getAllPosts } from "../lib/mdx-parser";

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
    execSync(`bun run scripts/fix-mdx-with-claude.ts "${filePath}"`, {
      stdio: "inherit",
    });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("🔍 Scanning for broken MDX files...");

  if (!isClaudeAvailable()) {
    console.error("❌ Claude CLI is not installed or not in PATH");
    console.error(
      "Please install Claude CLI first: https://github.com/anthropics/claude-code"
    );
    process.exit(1);
  }

  try {
    const allPosts = getAllPosts();

    // Filter out virtual posts (they don't have real files)
    const realPosts = allPosts.filter(
      (post) =>
        !(post.slug.startsWith("findings-") || post.slug.startsWith("sights-"))
    );

    const brokenFiles: string[] = [];
    let checkedCount = 0;

    // Find all broken MDX files
    console.log(
      `Checking ${realPosts.length} MDX files (excluding ${allPosts.length - realPosts.length} virtual posts)...`
    );
    console.log("─".repeat(60));

    for (const post of realPosts) {
      checkedCount++;
      process.stdout.write(
        `\rProgress: ${checkedCount}/${realPosts.length} files checked...`
      );

      // For sight posts, check the README.md file inside the directory
      let fileToCheck = post.filePath;
      if (
        post.type === "SIGHT" &&
        fs.existsSync(post.filePath) &&
        fs.statSync(post.filePath).isDirectory()
      ) {
        fileToCheck = path.join(post.filePath, "README.md");
        if (!fs.existsSync(fileToCheck)) {
          continue; // Skip if README.md doesn't exist
        }
      }

      if (!validateMDX(fileToCheck)) {
        brokenFiles.push(fileToCheck);
        // Clear the progress line and show the broken file
        process.stdout.write(`\r${" ".repeat(50)}\r`);
        console.log(
          `❌ Found broken MDX: ${path.relative(process.cwd(), fileToCheck)}`
        );
      }
    }

    // Clear the progress line
    process.stdout.write(`\r${" ".repeat(50)}\r`);

    if (brokenFiles.length === 0) {
      console.log("✅ No broken MDX files found!");
      process.exit(0);
    }

    console.log(`\n📊 Found ${brokenFiles.length} broken MDX files`);
    console.log("─".repeat(60));

    // Ask for confirmation before proceeding with fixes
    console.log(
      "\n⚠️  This will attempt to fix all broken MDX files using Claude CLI."
    );
    console.log("Starting automatic fix process...\n");

    let fixedCount = 0;
    let failedCount = 0;

    for (const filePath of brokenFiles) {
      console.log(`\n🔧 Fixing: ${path.relative(process.cwd(), filePath)}`);
      console.log("-".repeat(60));

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
    console.log(`  📝 Total: ${brokenFiles.length}`);

    if (failedCount > 0) {
      console.log("\n⚠️  Some files could not be fixed automatically.");
      console.log("Manual intervention may be required.");
      process.exit(1);
    } else {
      console.log("\n✅ All broken MDX files have been fixed!");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Error during MDX fix process:", error);
    process.exit(1);
  }
}

main();
