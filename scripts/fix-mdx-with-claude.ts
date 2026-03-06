#!/usr/bin/env bun
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Parse command line arguments
const args = process.argv.slice(2);
const filePath = args[0];

if (!filePath) {
  console.error("Usage: bun run fix-mdx-with-claude <file-path>");
  process.exit(1);
}

// Resolve the file path
const resolvedPath = path.resolve(filePath);

// Check if file exists
if (!fs.existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`);
  process.exit(1);
}

// Check if claude CLI is available
function isClaudeAvailable(): boolean {
  try {
    execSync("which claude", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!isClaudeAvailable()) {
  console.error("❌ Claude CLI is not installed or not in PATH");
  console.error(
    "Please install Claude CLI first: https://github.com/anthropics/claude-code"
  );
  process.exit(1);
}

// Validate MDX and get error message
function validateMDX(filePath: string): { valid: boolean; error?: string } {
  try {
    execSync(`bun run scripts/validate-mdx.ts "${filePath}"`, {
      stdio: "pipe",
    });
    return { valid: true };
  } catch (e: any) {
    const errorOutput = e.stderr?.toString() || e.stdout?.toString() || "";
    // Extract the actual error message
    const errorMatch = errorOutput.match(/Error: (.+)/);
    const errorMessage = errorMatch ? errorMatch[1] : errorOutput;
    return { valid: false, error: errorMessage };
  }
}

// Check if the file is already valid
const validationResult = validateMDX(resolvedPath);
if (validationResult.valid) {
  console.log(`✅ File is already valid MDX: ${resolvedPath}`);
  process.exit(0);
}

console.log(`🔧 Attempting to fix MDX errors in: ${resolvedPath}`);
if (validationResult.error) {
  console.log(`📍 Error detected: ${validationResult.error}`);
}

// Create the prompt for Claude
const errorInfo = validationResult.error
  ? `\nThe specific error is: "${validationResult.error}"`
  : "";
const prompt = `You are an MDX syntax fixer. Your ONLY job is to fix MDX/Markdown syntax errors in the file provided.

CRITICAL RULES:
1. ONLY fix syntax errors - DO NOT change the content, meaning, or structure
2. Keep all frontmatter intact
3. Preserve all links, code blocks, and formatting
4. Fix issues like:
   - Unclosed JSX tags
   - Invalid MDX syntax
   - Broken code fences
   - Malformed frontmatter
   - Unescaped special characters that break MDX parsing
5. Do NOT add new content, remove content, or rewrite prose
6. After fixing, validate the MDX compiles successfully using: bun run validate-mdx "${resolvedPath}"

The file to fix is: ${resolvedPath}${errorInfo}

Fix ONLY the MDX/Markdown syntax errors. Keep everything else exactly as is.`;

try {
  // Use Claude CLI to fix the file
  console.log("📝 Calling Claude to fix MDX syntax...");
  console.log("─".repeat(60));

  // Write prompt to a temporary file to avoid shell escaping issues
  const tmpFile = `/tmp/claude-prompt-${Date.now()}.txt`;
  fs.writeFileSync(tmpFile, prompt);

  try {
    const command = `claude -p "$(cat ${tmpFile})" --model sonnet --dangerously-skip-permissions`;
    execSync(command, {
      stdio: "inherit",
      cwd: process.cwd(),
      // Omit shell option to use default user shell (respects OAuth session)
    });
  } finally {
    // Clean up temp file
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }

  console.log("─".repeat(60));

  // Validate the fixed file
  console.log("\n🔍 Validating fixed MDX...");
  const finalValidation = validateMDX(resolvedPath);
  if (finalValidation.valid) {
    console.log(`✅ MDX successfully fixed: ${resolvedPath}`);
    console.log(`📁 File: ${path.relative(process.cwd(), resolvedPath)}`);
    process.exit(0);
  } else {
    console.error(
      `⚠️  MDX was modified but still has validation errors: ${resolvedPath}`
    );
    if (finalValidation.error) {
      console.error(`📍 Remaining error: ${finalValidation.error}`);
    }
    console.error("Manual intervention may be required.");
    process.exit(1);
  }
} catch (error) {
  console.error("❌ Failed to fix MDX with Claude:", error);
  process.exit(1);
}
