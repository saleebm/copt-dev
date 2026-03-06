#!/usr/bin/env bun
import fs from "node:fs";
import path from "node:path";
import { compile } from "@mdx-js/mdx";
import remarkComment from "remark-comment";
import remarkGfm from "remark-gfm";

// Parse command line arguments
const args = process.argv.slice(2);
const filePath = args[0];

if (!filePath) {
  console.error("Usage: bun run validate-mdx <file-path>");
  process.exit(1);
}

// Resolve the file path
const resolvedPath = path.resolve(filePath);

// Check if file exists
if (!fs.existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`);
  process.exit(1);
}

// Check if it's a file (not a directory)
const stats = fs.statSync(resolvedPath);
if (stats.isDirectory()) {
  console.error(`Path is a directory, not a file: ${resolvedPath}`);
  process.exit(1);
}

// Read the file content
const content = fs.readFileSync(resolvedPath, "utf-8");

async function validateMDX(
  content: string,
  filePath: string
): Promise<boolean> {
  try {
    await compile(content, {
      development: false,
      jsx: true,
      jsxImportSource: "react",
      remarkPlugins: [remarkGfm, remarkComment],
    });
    console.log(`✅ MDX validation passed: ${filePath}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ MDX validation failed: ${filePath}`);
    console.error(`Error: ${errorMessage}`);
    return false;
  }
}

// Run validation
validateMDX(content, resolvedPath).then((isValid) => {
  process.exit(isValid ? 0 : 1);
});
