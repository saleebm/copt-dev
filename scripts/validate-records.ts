#!/usr/bin/env bun
/**
 * Validates all JSON records for schema correctness and referential integrity.
 * Also runs parity checks between MdxProvider output and the original parser.
 *
 * Usage: bun run records:validate
 */

import { z } from "zod";
import { MdxProvider } from "@/lib/content-sources/mdx-provider";
import { PostTypeSchema } from "@/lib/content-sources/schema";
import { getAllPosts } from "@/lib/mdx-parser";
import {
  getPostTypeRegistry,
  getProviderRegistry,
  getTemplateRegistry,
  PostTypeRecordSchema,
  ProviderRecordSchema,
  TemplateRecordSchema,
} from "@/lib/records/loaders";

let errors = 0;
let warnings = 0;

function fail(msg: string) {
  console.error(`  ❌ ${msg}`);
  errors++;
}

function warn(msg: string) {
  console.warn(`  ⚠️  ${msg}`);
  warnings++;
}

function pass(msg: string) {
  console.log(`  ✅ ${msg}`);
}

// ── Registry Schema Validation ──────────────────────────────────────

console.log("\n📋 Validating JSON registries...\n");

console.log("Post Types:");
try {
  const registry = getPostTypeRegistry();
  pass(`Loaded ${registry.length} post types`);

  const prismaTypes = PostTypeSchema.options;
  for (const pt of prismaTypes) {
    if (!registry.some((r) => r.value === pt)) {
      fail(`PostType "${pt}" exists in schema but missing from post-types.json`);
    }
  }
  for (const r of registry) {
    if (!prismaTypes.includes(r.value)) {
      fail(`Post type "${r.value}" in JSON but not in PostTypeSchema`);
    }
  }

  const dirs = registry.map((r) => r.directory);
  if (new Set(dirs).size !== dirs.length) {
    fail("Duplicate directories in post-types.json");
  }

  const orders = registry.map((r) => r.order);
  if (new Set(orders).size !== orders.length) {
    fail("Duplicate order values in post-types.json");
  }

  pass("Post type registry is valid and complete");
} catch (e) {
  fail(`Post type registry validation failed: ${e instanceof Error ? e.message : e}`);
}

console.log("\nTemplates:");
try {
  const templates = getTemplateRegistry();
  pass(`Loaded ${templates.length} templates`);
  pass("Template registry is valid");
} catch (e) {
  fail(`Template registry validation failed: ${e instanceof Error ? e.message : e}`);
}

console.log("\nProviders:");
try {
  const providers = getProviderRegistry();
  pass(`Loaded ${providers.length} providers`);
  pass("Provider registry is valid");
} catch (e) {
  fail(`Provider registry validation failed: ${e instanceof Error ? e.message : e}`);
}

// ── MdxProvider Parity Check ────────────────────────────────────────

console.log("\n📋 Running MdxProvider parity check...\n");

try {
  const originalPosts = getAllPosts();
  const provider = new MdxProvider();
  const normalizedPosts = provider.getPosts();

  if (originalPosts.length !== normalizedPosts.length) {
    fail(`Post count mismatch: original=${originalPosts.length}, normalized=${normalizedPosts.length}`);
  } else {
    pass(`Post count matches: ${originalPosts.length}`);
  }

  const originalSlugs = new Set(originalPosts.map((p) => p.slug));
  const normalizedSlugs = new Set(normalizedPosts.map((p) => p.slug));

  for (const slug of originalSlugs) {
    if (!normalizedSlugs.has(slug)) {
      fail(`Slug "${slug}" in original but missing from normalized`);
    }
  }
  for (const slug of normalizedSlugs) {
    if (!originalSlugs.has(slug)) {
      fail(`Slug "${slug}" in normalized but missing from original`);
    }
  }

  let fieldMismatches = 0;
  for (const orig of originalPosts) {
    const norm = normalizedPosts.find((p) => p.slug === orig.slug);
    if (!norm) continue;

    if (orig.title !== norm.title) {
      warn(`Title mismatch for "${orig.slug}": "${orig.title}" vs "${norm.title}"`);
      fieldMismatches++;
    }
    if (orig.type !== norm.type) {
      fail(`Type mismatch for "${orig.slug}": "${orig.type}" vs "${norm.type}"`);
      fieldMismatches++;
    }
    if (orig.status !== norm.status) {
      warn(`Status mismatch for "${orig.slug}": "${orig.status}" vs "${norm.status}"`);
      fieldMismatches++;
    }
    if (orig.content !== norm.content) {
      fail(`Content mismatch for "${orig.slug}"`);
      fieldMismatches++;
    }
    if (norm.provenance.sourceType !== "mdx") {
      fail(`Provenance sourceType should be "mdx" for "${orig.slug}"`);
    }
    if (norm.provenance.providerId !== "filesystem") {
      fail(`Provenance providerId should be "filesystem" for "${orig.slug}"`);
    }
  }

  if (fieldMismatches === 0) {
    pass("All field parity checks passed");
  } else {
    warn(`${fieldMismatches} field mismatches found`);
  }

  pass("MdxProvider parity check complete");
} catch (e) {
  fail(`MdxProvider parity check failed: ${e instanceof Error ? e.message : e}`);
}

// ── Summary ─────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(60));
if (errors > 0) {
  console.error(`\n❌ Validation FAILED: ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n⚠️  Validation PASSED with ${warnings} warning(s)`);
} else {
  console.log("\n✅ All validations passed");
}
