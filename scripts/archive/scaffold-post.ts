#!/usr/bin/env bun

/**
 * Interactive Post Scaffolding CLI
 * Creates new posts with AI-generated outlines using Gemini
 */

import { existsSync, mkdirSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { type PostType, PrismaClient } from "@/lib/generated/prisma";
import {
  createPostOutline,
  generateFileName,
  getPostDirectory,
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

const prisma = new PrismaClient();

// Initialize Gemini AI
const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
});

type PostScaffoldData = {
  type: PostType;
  title: string;
  category?: string;
  tags: string[];
  outline?: string;
  generateOutline: boolean;
  templateVariation: string;
  filePath: string;
};

async function main() {
  console.log("🚀 Post Scaffolding CLI\n");
  console.log("✨ Create new posts with AI-powered outlines using Gemini\n");

  // Check for required environment variables
  if (!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
    console.error(
      "❌ Missing API key. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable."
    );
    process.exit(1);
  }

  try {
    const postData = await collectPostData();
    const content = await generatePostContent(postData);
    await createPostFile(postData, content);

    console.log("\n✅ Post scaffolded successfully!");
    console.log(`📁 File created: ${postData.filePath}`);
    console.log("\n💡 Next steps:");
    console.log("   1. Edit the generated content");
    console.log("   2. Run: bun run db:sync-posts");
    console.log("   3. Start writing!");
  } catch (error) {
    console.error(
      "\n❌ Unexpected error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function collectPostData(): Promise<PostScaffoldData> {
  console.log("📝 Let's create your post...\n");

  // Get post type
  const type = await selectPostType();

  // Get title with validation
  const title = await getValidatedTitle();

  // Get category with autocomplete
  const category = await selectCategory(type);

  // Get tags with validation
  const tags = await selectTags();

  // Select template variation
  const templateVariation = await selectTemplateVariation();

  // Ask about outline generation
  const generateOutline = await confirmAIOutline();

  const fileName = generateFileName(title, type);
  const filePath = `${getPostDirectory(type, category)}/${fileName}`;

  return {
    type,
    title,
    category,
    tags,
    generateOutline,
    templateVariation,
    filePath,
  };
}

async function getValidatedTitle(): Promise<string> {
  while (true) {
    process.stdout.write("📋 Post title: ");
    const titleLine = await readLine();
    const title = titleLine.trim();

    if (!validateTitle(title)) {
      console.log("❌ Title must be 1-200 characters long. Please try again.");
      continue;
    }

    return title;
  }
}

async function selectPostType(): Promise<PostType> {
  console.log("📂 Select post type:");
  POST_TYPE_CHOICES.forEach((choice, index) => {
    console.log(`   ${index + 1}. ${choice.label} - ${choice.description}`);
  });

  while (true) {
    process.stdout.write("\nChoice (1-3): ");
    const choice = await readLine();
    const choiceNum = Number.parseInt(choice.trim(), 10);

    if (choiceNum >= 1 && choiceNum <= POST_TYPE_CHOICES.length) {
      return POST_TYPE_CHOICES[choiceNum - 1].value;
    }

    console.log("❌ Invalid choice. Please select 1, 2, or 3.");
  }
}

async function selectCategory(postType: PostType): Promise<string | undefined> {
  if (postType === "CONCRETE") {
    return; // CONCRETE posts don't use categories typically
  }

  console.log("\n🏷️  Category (optional):");

  // Get existing categories from database
  const existingCategories = await prisma.category.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });

  if (existingCategories.length > 0) {
    console.log("\nExisting categories:");
    existingCategories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.name}`);
    });
    console.log(`   ${existingCategories.length + 1}. Create new category`);
    console.log(`   ${existingCategories.length + 2}. Skip category`);
  }

  process.stdout.write("\nCategory choice or name: ");
  const input = await readLine();
  const trimmed = input.trim();

  if (!trimmed) {
    return;
  }

  // Check if it's a number (existing category selection)
  const choiceNum = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(choiceNum)) {
    if (choiceNum <= existingCategories.length) {
      return existingCategories[choiceNum - 1].name;
    }
    if (choiceNum === existingCategories.length + 2) {
      return; // Skip category
    }
    // If it's the "create new" option, fall through to create new category
  }

  // Treat as new category name
  return trimmed;
}

async function selectTags(): Promise<string[]> {
  console.log("\n🏷️  Tags (comma-separated, optional):");

  // Get existing tags for suggestions
  const existingTags = await prisma.tag.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });

  if (existingTags.length > 0) {
    console.log("\nExisting tags:");
    const tagNames = existingTags.map((t) => t.name).join(", ");
    console.log(`   ${tagNames}`);
  }

  while (true) {
    process.stdout.write("\nTags: ");
    const tagsInput = await readLine();

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    if (validateTags(tags)) {
      return tags;
    }

    console.log(
      "❌ Invalid tags. Each tag must be 1-50 characters and contain no commas or semicolons."
    );
  }
}

async function selectTemplateVariation(): Promise<string> {
  console.log("\n📄 Select template variation:");
  const variations = getTemplateVariations();

  variations.forEach((variation, index) => {
    console.log(
      `   ${index + 1}. ${variation.name} - ${variation.description}`
    );
  });

  while (true) {
    process.stdout.write(
      `\nChoice (1-${variations.length}) or press Enter for default: `
    );
    const choice = await readLine();
    const trimmed = choice.trim();

    if (!trimmed) {
      return "minimal"; // Default
    }

    const choiceNum = Number.parseInt(trimmed, 10);
    if (choiceNum >= 1 && choiceNum <= variations.length) {
      return variations[choiceNum - 1].key;
    }

    console.log(
      `❌ Invalid choice. Please select 1-${variations.length} or press Enter for default.`
    );
  }
}

async function confirmAIOutline(): Promise<boolean> {
  console.log("\n🤖 Generate AI outline with Gemini?");
  process.stdout.write("Generate outline (y/N): ");
  const response = await readLine();
  return ["y", "yes", "Y", "YES"].includes(response.trim());
}

async function generatePostContent(data: PostScaffoldData): Promise<string> {
  console.log("\n🏗️  Generating post content...");

  const templateConfig: PostTemplateConfig = {
    title: data.title,
    type: data.type,
    category: data.category,
    tags: data.tags,
    date: new Date().toISOString().split("T")[0],
    status: "DRAFT" as const,
    published: false,
  };

  // Use the selected template variation
  let content =
    data.templateVariation === "minimal"
      ? createPostTemplate(templateConfig)
      : createTemplateVariation(templateConfig, data.templateVariation as any);

  // Generate AI outline if requested
  if (data.generateOutline) {
    try {
      console.log("🤔 Generating outline with Gemini...");
      const outline = await createPostOutline(
        genai,
        data.title,
        data.type,
        data.category
      );

      // Insert outline into content
      content = content.replace(
        "<!-- AI-generated outline will be inserted here -->",
        outline
      );

      console.log("✨ AI outline generated successfully!");
    } catch (error) {
      console.warn(
        "⚠️  Failed to generate AI outline:",
        error instanceof Error ? error.message : String(error)
      );
      console.log("📝 Proceeding with basic template...");
    }
  } else {
    // Remove the placeholder if no outline is generated
    content = content.replace(
      "<!-- AI-generated outline will be inserted here -->",
      "*Add your outline here or start writing directly.*"
    );
  }

  return content;
}

async function createPostFile(
  data: PostScaffoldData,
  content: string
): Promise<void> {
  const directory = data.filePath.substring(0, data.filePath.lastIndexOf("/"));

  // Ensure directory exists
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
    console.log(`📁 Created directory: ${directory}`);
  }

  // Check if file already exists
  if (existsSync(data.filePath)) {
    process.stdout.write("⚠️  File already exists. Overwrite? (y/N): ");
    const response = await readLine();
    if (!["y", "yes", "Y", "YES"].includes(response.trim())) {
      throw new Error("File creation cancelled");
    }
  }

  // Write file
  await Bun.write(data.filePath, content);
  console.log(`✅ Created: ${data.filePath}`);
}

// Utility function to read lines from stdin
async function readLine(): Promise<string> {
  for await (const line of console) {
    return line;
  }
  return "";
}

// Run the main function
if (import.meta.main) {
  main().catch(console.error);
}
