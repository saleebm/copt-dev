#!/usr/bin/env bun

import path from "node:path";
import { getAllPosts } from "@/lib/mdx-parser";

console.log("🔍 Checking for duplicate slugs in posts...\n");

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
const duplicates = Array.from(postsBySlug.entries())
  .filter(([_slug, posts]) => posts.length > 1)
  .sort((a, b) => b[1].length - a[1].length); // Sort by number of duplicates

if (duplicates.length === 0) {
  console.log("✅ No duplicate slugs found!");
} else {
  console.log(`⚠️  Found ${duplicates.length} duplicate slugs:\n`);

  for (const [slug, posts] of duplicates) {
    console.log(`📝 Slug: "${slug}" (${posts.length} files)`);

    for (const post of posts) {
      const relativePath = path.relative(process.cwd(), post.filePath);
      console.log(`   - ${relativePath}`);
      console.log(`     Title: ${post.title}`);
      console.log(`     Type: ${post.type}`);
      if (post.categories && post.categories.length > 0) {
        console.log(`     Categories: ${post.categories.join(", ")}`);
      }
    }
    console.log();
  }

  console.log(
    "💡 Suggestion: Rename files to have unique names, or consider merging duplicate content."
  );
  console.log(
    "   The sync script will automatically handle collisions by appending -1, -2, etc. to duplicates."
  );
}

// Summary
console.log("\n📊 Summary:");
console.log(`   Total posts: ${staticPosts.length}`);
console.log(`   Unique slugs: ${postsBySlug.size}`);
console.log(`   Duplicate slugs: ${duplicates.length}`);

if (duplicates.length > 0) {
  const totalDuplicateFiles = duplicates.reduce(
    (sum, [, posts]) => sum + posts.length - 1,
    0
  );
  console.log(`   Files that need renaming: ${totalDuplicateFiles}`);
}
