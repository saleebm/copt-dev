import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { compile } from "@mdx-js/mdx";
import remarkComment from "remark-comment";
import remarkGfm from "remark-gfm";
import { parsePostDate } from "@/lib/date-utils";
import { type PostStatus, PostType } from "@/lib/generated/prisma";
import { syncHlexiconEntries } from "@/lib/hlexicon-utils";
import { getAllPosts, type ParsedPost } from "@/lib/mdx-parser";
import { prisma } from "@/lib/prisma";

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run") || args.includes("-d");
const isVerbose = args.includes("--verbose") || args.includes("-v");

async function syncPosts() {
  console.log(
    isDryRun
      ? "🔍 Starting database sync (DRY RUN MODE)..."
      : "Starting database sync..."
  );

  if (isDryRun) {
    console.log("ℹ️  No changes will be made to the database or filesystem");
  }

  try {
    const allPosts = getAllPosts();
    // Filter out the dynamic posts for reporting
    const parsedPosts = allPosts.filter(
      (post) =>
        !(post.slug.startsWith("findings-") || post.slug.startsWith("sights-"))
    );
    const dynamicFindingPosts = allPosts.filter((post) =>
      post.slug.startsWith("findings-")
    );
    const dynamicSightPosts = allPosts.filter((post) =>
      post.slug.startsWith("sights-")
    );

    console.log(
      `Found ${parsedPosts.length} MDX files, ${dynamicFindingPosts.length} dynamic findings posts, and ${dynamicSightPosts.length} dynamic sight posts`
    );

    const existingPosts = await prisma.post.findMany({
      select: { slug: true, fileHash: true },
    });
    const existingPostMap = new Map(
      existingPosts.map((p) => [p.slug, p.fileHash])
    );

    // Track processed slugs to detect deleted files
    const processedSlugs = new Set<string>();

    // Statistics for dry-run
    let createCount = 0;
    let updateCount = 0;
    let skipCount = 0;
    let duplicateWarnings = 0;
    let rejectedCount = 0;

    for (const post of allPosts) {
      // Check if this post already exists in the database
      const existingHash = existingPostMap.get(post.slug);
      const isExistingPost = existingHash !== undefined;
      const needsUpdate = !existingHash || existingHash !== post.fileHash;

      // If this post exists and hasn't changed, skip it entirely
      if (isExistingPost && !needsUpdate) {
        if (isVerbose) {
          console.log(`Skipping unchanged post: ${post.slug}`);
        }
        processedSlugs.add(post.slug);
        skipCount++;
        continue;
      }

      // Warn about duplicates but don't try to fix them automatically
      if (
        !(
          post.slug.startsWith("findings-") || post.slug.startsWith("sights-")
        ) &&
        processedSlugs.has(post.slug)
      ) {
        console.log(`⚠️  DUPLICATE SLUG DETECTED: ${post.slug}`);
        console.log(`   File: ${path.relative(process.cwd(), post.filePath)}`);
        console.log(`   Run "bun run deduplicate" to consolidate duplicates`);
        duplicateWarnings++;
        continue; // Skip this duplicate
      }

      processedSlugs.add(post.slug);

      // Validate MDX content before touching the database
      try {
        // Only validate for posts that are created/updated (changed or new)
        if (needsUpdate) {
          await compile(post.content, {
            development: false,
            jsx: true,
            jsxImportSource: "react",
            remarkPlugins: [remarkGfm, remarkComment],
          });
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        // Prominent log so it stands out in CI/terminal
        console.error(`\n\n${"=".repeat(80)}`);
        console.error("🚫 MDX VALIDATION FAILED - Post Rejected");
        console.error(`Slug: ${post.slug}`);
        console.error(`File: ${path.relative(process.cwd(), post.filePath)}`);
        console.error(`Reason: ${errorMessage}`);
        console.error(
          "Action: Skipping create/update for this post, continuing with others..."
        );
        console.error(`${"=".repeat(80)}\n`);

        rejectedCount++;
        // Do NOT create/update this post; keep existing DB record as-is (if any)
        continue;
      }

      if (isDryRun) {
        // In dry-run mode, just log what would happen
        if (isExistingPost) {
          console.log(`[DRY RUN] Would update post: ${post.slug}`);
          updateCount++;
        } else {
          console.log(`[DRY RUN] Would create post: ${post.slug}`);
          createCount++;
        }

        if (isVerbose) {
          console.log(`  - Title: ${post.title}`);
          console.log(`  - Type: ${post.type}`);
          console.log(`  - Tags: ${(post.tags || []).join(", ")}`);
          console.log(`  - Categories: ${(post.categories || []).join(", ")}`);
        }
        continue;
      }

      // Create or update tags
      const tags = await Promise.all(
        (post.tags || []).map(async (tagName) => {
          const tagSlug = tagName.toLowerCase().replace(/\s+/g, "-");
          return prisma.tag.upsert({
            where: { slug: tagSlug },
            update: { name: tagName },
            create: { name: tagName, slug: tagSlug },
          });
        })
      );

      // Only process categories for non-CONCRETE post types
      // CONCRETE posts should not appear in category navigation
      const categories =
        post.type === PostType.CONCRETE
          ? []
          : await Promise.all(
              (post.categories || []).map(async (catName) => {
                const catSlug = catName.toLowerCase().replace(/\s+/g, "-");
                // Use kebab-case for name to match CategoryEmbedding, human-readable for displayName
                return prisma.category.upsert({
                  where: { slug: catSlug },
                  update: {
                    name: catSlug, // kebab-case to match CategoryEmbedding
                    displayName: catName, // human-readable name
                  },
                  create: {
                    name: catSlug, // kebab-case to match CategoryEmbedding
                    displayName: catName, // human-readable name
                    slug: catSlug,
                  },
                });
              })
            );

      // Create or update CategoryEmbedding records
      for (const category of categories) {
        await createOrUpdateCategoryEmbedding(category, post);
      }

      // Create or update post
      let postRecord;
      if (isExistingPost) {
        postRecord = await prisma.post.update({
          where: { slug: post.slug },
          data: {
            title: post.title,
            content: post.content,
            excerpt: post.excerpt || null,
            type: post.type as PostType,
            status: (post.status || "DRAFT") as PostStatus,
            published: post.published ?? true,
            filePath: post.filePath,
            fileHash: post.fileHash,
            findingsCount: post.findingsCount || null,
            originalDate: post.date
              ? parsePostDate(post.date, `post ${post.slug}`)
              : null,
            tags: {
              set: tags.map((tag) => ({ id: tag.id })),
            },
            categories: {
              set: categories.map((cat) => ({ id: cat.id })),
            },
          },
        });
        console.log(`✅ Updated post: ${post.slug}`);
        updateCount++;
      } else {
        postRecord = await prisma.post.create({
          data: {
            slug: post.slug,
            title: post.title,
            content: post.content,
            excerpt: post.excerpt || null,
            type: post.type as PostType,
            status: (post.status || "DRAFT") as PostStatus,
            published: post.published ?? true,
            filePath: post.filePath,
            fileHash: post.fileHash,
            findingsCount: post.findingsCount || null,
            originalDate: post.date
              ? parsePostDate(post.date, `post ${post.slug}`)
              : null,
            tags: {
              connect: tags.map((tag) => ({ id: tag.id })),
            },
            categories: {
              connect: categories.map((cat) => ({ id: cat.id })),
            },
          },
        });
        console.log(`✅ Created post: ${post.slug}`);
        createCount++;
      }

      // Sync Hlexicon entries if any were found in the post content
      if (!isDryRun && post.hlexiconTerms && post.hlexiconTerms.length > 0) {
        const hlexiconEntries = await syncHlexiconEntries(
          postRecord.id,
          post.hlexiconTerms
        );
        if (hlexiconEntries.length > 0) {
          console.log(`  Synced ${hlexiconEntries.length} Hlexicon entries`);
        }
      }
    }

    // Mark posts as unpublished if their files were deleted
    const deletedSlugs = [...existingPostMap.keys()].filter(
      (slug) => !processedSlugs.has(slug)
    );
    if (deletedSlugs.length > 0) {
      if (isDryRun) {
        console.log(
          `[DRY RUN] Would mark ${deletedSlugs.length} posts as unpublished:`
        );
        deletedSlugs.forEach((slug) => console.log(`  - ${slug}`));
      } else {
        await prisma.post.updateMany({
          where: { slug: { in: deletedSlugs } },
          data: { published: false },
        });
        console.log(
          `⚠️  Marked ${deletedSlugs.length} posts as unpublished: ${deletedSlugs.join(", ")}`
        );
      }
    }

    // Summary
    console.log("\n📊 Sync Summary:");
    console.log(`  - Skipped: ${skipCount} posts (unchanged)`);
    console.log(`  - Created: ${createCount} new posts`);
    console.log(`  - Updated: ${updateCount} existing posts`);
    if (rejectedCount > 0) {
      console.log(`  - 🚫 Rejected (invalid MDX): ${rejectedCount} posts`);
    }
    if (duplicateWarnings > 0) {
      console.log(`  - ⚠️  Duplicate slugs found: ${duplicateWarnings}`);
    }
    if (deletedSlugs.length > 0) {
      console.log(
        `  - Unpublished: ${deletedSlugs.length} posts (files deleted)`
      );
    }

    if (duplicateWarnings > 0) {
      console.log("\n⚠️  IMPORTANT: Found duplicate slugs!");
      console.log(
        '   Run "bun run deduplicate" to analyze and consolidate duplicates'
      );
      console.log(
        '   Run "bun run deduplicate:execute" to actually remove duplicates'
      );
    }

    if (isDryRun) {
      console.log("\n✅ Dry run completed successfully (no changes made)");
    } else {
      console.log("\n✅ Database sync completed successfully");
    }
  } catch (error) {
    console.error("❌ Error syncing posts:", error);
    throw error;
  }
}

async function createOrUpdateCategoryEmbedding(
  category: { id: string; name: string; slug: string },
  post: ParsedPost
) {
  try {
    // Calculate category path and metadata from the post's file path
    const postsDir = path.join(process.cwd(), "posts");
    const relativePath = path.relative(postsDir, post.filePath);
    const pathParts = relativePath.split(path.sep);

    // Find where this category appears in the path
    const categoryIndex = pathParts.findIndex(
      (part) =>
        part.toLowerCase().replace(/\s+/g, "-") === category.slug ||
        part.toLowerCase().replace(/[-_]/g, " ") === category.name.toLowerCase()
    );

    if (categoryIndex === -1) {
      // Fallback: use category name as path
      const categoryPath = category.name.toLowerCase().replace(/\s+/g, "-");
      const fullPath = path.join(postsDir, categoryPath);

      await prisma.categoryEmbedding.upsert({
        where: { path: categoryPath },
        update: {
          name: category.name,
          fullPath,
          parentPath: null,
          depth: 0,
          fileCount: 1, // Will be updated by recount logic
          description: generateCategoryDescription(category.name),
          embeddingHash: crypto
            .createHash("md5")
            .update(generateCategoryDescription(category.name))
            .digest("hex"),
          updatedAt: new Date(),
        },
        create: {
          path: categoryPath,
          name: category.name,
          fullPath,
          parentPath: null,
          depth: 0,
          fileCount: 1,
          description: generateCategoryDescription(category.name),
          embedding: [], // Empty for now - would need embedding service
          embeddingHash: crypto
            .createHash("md5")
            .update(generateCategoryDescription(category.name))
            .digest("hex"),
          modelVersion: "none",
          dimensionality: 0,
        },
      });
    } else {
      // Build hierarchical path
      const categoryParts = pathParts.slice(1, categoryIndex + 1); // Include up to this category
      const categoryPath = categoryParts
        .map((part) => part.toLowerCase().replace(/[-_\s]/g, "-"))
        .join("/");

      const fullPath = path.join(postsDir, ...categoryParts);
      const parentPath =
        categoryIndex > 1 ? categoryParts.slice(0, -1).join("/") : null;
      const depth = categoryIndex - 1;

      // Count files in this category directory
      const fileCount = await countFilesInCategory(fullPath);

      await prisma.categoryEmbedding.upsert({
        where: { path: categoryPath },
        update: {
          name: category.name,
          fullPath,
          parentPath,
          depth,
          fileCount,
          description: generateCategoryDescription(category.name),
          embeddingHash: crypto
            .createHash("md5")
            .update(generateCategoryDescription(category.name))
            .digest("hex"),
          updatedAt: new Date(),
        },
        create: {
          path: categoryPath,
          name: category.name,
          fullPath,
          parentPath,
          depth,
          fileCount,
          description: generateCategoryDescription(category.name),
          embedding: [], // Empty for now - would need embedding service
          embeddingHash: crypto
            .createHash("md5")
            .update(generateCategoryDescription(category.name))
            .digest("hex"),
          modelVersion: "none",
          dimensionality: 0,
        },
      });
    }
  } catch (error) {
    console.error(
      `Error creating/updating CategoryEmbedding for ${category.name}:`,
      error
    );
  }
}

async function countFilesInCategory(categoryPath: string): Promise<number> {
  try {
    if (!fs.existsSync(categoryPath)) {
      return 0;
    }

    const items = fs.readdirSync(categoryPath, { withFileTypes: true });
    let count = 0;

    for (const item of items) {
      if (item.isFile() && /\.mdx?$/.test(item.name)) {
        count++;
      } else if (item.isDirectory()) {
        // Recursively count in subdirectories
        count += await countFilesInCategory(path.join(categoryPath, item.name));
      }
    }

    return count;
  } catch (_error) {
    return 0;
  }
}

function generateCategoryDescription(categoryName: string): string {
  return `Category: ${categoryName}. Contains posts and articles related to ${categoryName}.`;
}

// Run the sync if this file is executed directly
if (require.main === module) {
  syncPosts()
    .catch((e) => {
      console.error("Sync failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { syncPosts };
