#!/usr/bin/env bun

/**
 * Test script for the post scaffolding system
 */

import {
  generateFileName,
  generatePostMetadata,
  getPostDirectory,
  slugify,
  validateCategory,
  validateTags,
  validateTitle,
} from "./lib/scaffold-helpers";
import {
  createPostTemplate,
  createTemplateVariation,
  getTemplateVariations,
} from "./lib/scaffold-templates";
import {
  POST_TYPE_CHOICES,
  type PostTemplateConfig,
} from "./lib/scaffold-types";

function runTests() {
  console.log("🧪 Testing Post Scaffolding System\n");

  // Test utility functions
  testUtilityFunctions();

  // Test template generation
  testTemplateGeneration();

  // Test validation
  testValidation();

  console.log("\n✅ All tests passed!");
}

function testUtilityFunctions() {
  console.log("📝 Testing utility functions...");

  // Test slugify
  const slug = slugify("My Amazing Post Title!");
  console.assert(
    slug === "my-amazing-post-title",
    `Expected 'my-amazing-post-title', got '${slug}'`
  );

  // Test filename generation
  const blogFileName = generateFileName("Test Blog Post", "BLOG");
  console.assert(
    blogFileName.includes(".mdx"),
    `Blog filename should end with .mdx: ${blogFileName}`
  );

  const concreteFileName = generateFileName("Test Principle", "CONCRETE");
  console.assert(
    concreteFileName === "test-principle.mdx",
    `Expected 'test-principle.mdx', got '${concreteFileName}'`
  );

  // Test directory paths
  const blogDir = getPostDirectory("BLOG", "technology");
  console.assert(
    blogDir.includes("posts/blog/technology"),
    `Blog directory incorrect: ${blogDir}`
  );

  const concreteDir = getPostDirectory("CONCRETE");
  console.assert(
    concreteDir.includes("posts/concrete"),
    `Concrete directory incorrect: ${concreteDir}`
  );

  console.log("✅ Utility functions working correctly");
}

function testTemplateGeneration() {
  console.log("📄 Testing template generation...");

  const config: PostTemplateConfig = {
    title: "Test Post",
    type: "BLOG",
    category: "testing",
    tags: ["test", "scaffold"],
    date: "2025-01-20",
    status: "DRAFT",
    published: false,
  };

  // Test default template
  const defaultTemplate = createPostTemplate(config);
  console.assert(
    defaultTemplate.includes("# Test Post"),
    "Template should include title"
  );
  console.assert(
    defaultTemplate.includes('title: "Test Post"'),
    "Template should include frontmatter title"
  );
  console.assert(
    defaultTemplate.includes("tags:"),
    "Template should include tags"
  );

  // Test template variations
  const variations = getTemplateVariations();
  console.assert(variations.length > 0, "Should have template variations");

  const detailedTemplate = createTemplateVariation(config, "detailed");
  console.assert(
    detailedTemplate.includes("## Abstract"),
    "Detailed template should include Abstract section"
  );

  console.log("✅ Template generation working correctly");
}

function testValidation() {
  console.log("🔍 Testing validation functions...");

  // Test title validation
  console.assert(validateTitle("Valid Title"), "Valid title should pass");
  console.assert(!validateTitle(""), "Empty title should fail");
  console.assert(!validateTitle("a".repeat(201)), "Too long title should fail");

  // Test category validation
  console.assert(
    validateCategory("Valid Category"),
    "Valid category should pass"
  );
  console.assert(validateCategory(""), "Empty category should pass (optional)");
  console.assert(
    !validateCategory("a".repeat(101)),
    "Too long category should fail"
  );

  // Test tags validation
  console.assert(validateTags(["tag1", "tag2"]), "Valid tags should pass");
  console.assert(
    !validateTags(["tag,with,comma"]),
    "Tags with commas should fail"
  );
  console.assert(!validateTags(["a".repeat(51)]), "Too long tag should fail");

  console.log("✅ Validation functions working correctly");
}

function testPostMetadata() {
  console.log("📊 Testing metadata generation...");

  const metadata = generatePostMetadata("My Test Post", "BLOG", "technology");
  console.assert(
    metadata.slug === "my-test-post",
    `Expected slug 'my-test-post', got '${metadata.slug}'`
  );
  console.assert(
    metadata.type === "BLOG",
    `Expected type 'BLOG', got '${metadata.type}'`
  );
  console.assert(
    metadata.category === "technology",
    `Expected category 'technology', got '${metadata.category}'`
  );
  console.assert(
    Array.isArray(metadata.keywords),
    "Keywords should be an array"
  );

  console.log("✅ Metadata generation working correctly");
}

function demonstrateTemplates() {
  console.log("\n🎨 Template Examples:\n");

  const config: PostTemplateConfig = {
    title: "Example Post",
    type: "BLOG",
    category: "example",
    tags: ["demo", "template"],
    date: "2025-01-20",
    status: "DRAFT",
    published: false,
  };

  console.log("=== MINIMAL TEMPLATE ===");
  console.log(createTemplateVariation(config, "minimal"));

  console.log("\n=== DETAILED TEMPLATE ===");
  const detailedTemplate = createTemplateVariation(config, "detailed");
  console.log(`${detailedTemplate.substring(0, 300)}...[truncated]`);

  console.log("\n=== AVAILABLE VARIATIONS ===");
  getTemplateVariations().forEach((variation) => {
    console.log(`- ${variation.name}: ${variation.description}`);
  });
}

function showPostTypeInfo() {
  console.log("\n📂 Available Post Types:\n");

  POST_TYPE_CHOICES.forEach((choice) => {
    console.log(`${choice.label}:`);
    console.log(`  Description: ${choice.description}`);
    console.log(`  Directory: ${getPostDirectory(choice.value)}`);
    console.log("");
  });
}

// Run tests if this script is executed directly
if (import.meta.main) {
  runTests();
  testPostMetadata();
  demonstrateTemplates();
  showPostTypeInfo();
}
