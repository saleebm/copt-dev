/**
 * Interactive Service - Handles CLI user interactions
 * Follows Single Responsibility Principle
 */

import type { PostType } from "@/lib/generated/prisma";
import { POST_TYPE_CHOICES } from "../scaffold-types";
import type { DatabaseService } from "./database-service";

export type InteractiveInputs = {
  type: PostType;
  title: string;
  category?: string;
  tags: string[];
  template: string;
  generateOutline: boolean;
};

export type InteractiveService = {
  collectInputs(): Promise<InteractiveInputs>;
};

/**
 * Bun Console Interactive Service Implementation
 */
export class BunInteractiveService implements InteractiveService {
  constructor(private readonly databaseService: DatabaseService) {}

  async collectInputs(): Promise<InteractiveInputs> {
    console.log("📝 Let's create your post...\n");

    const type = await this.selectPostType();
    const title = await this.getValidatedTitle();
    const category = await this.selectCategory(type);
    const tags = await this.selectTags();
    const template = await this.selectTemplate();
    const generateOutline = await this.confirmAIOutline();

    return {
      type,
      title,
      category,
      tags,
      template,
      generateOutline,
    };
  }

  private async selectPostType(): Promise<PostType> {
    console.log("📂 Select post type:");
    POST_TYPE_CHOICES.forEach((choice, index) => {
      console.log(`   ${index + 1}. ${choice.label} - ${choice.description}`);
    });

    while (true) {
      process.stdout.write("\nChoice (1-3): ");
      const choice = await this.readLine();
      const choiceNum = Number.parseInt(choice.trim(), 10);

      if (choiceNum >= 1 && choiceNum <= POST_TYPE_CHOICES.length) {
        return POST_TYPE_CHOICES[choiceNum - 1].value;
      }

      console.log("❌ Invalid choice. Please select 1, 2, or 3.");
    }
  }

  private async getValidatedTitle(): Promise<string> {
    while (true) {
      process.stdout.write("📋 Post title: ");
      const titleLine = await this.readLine();
      const title = titleLine.trim();

      if (this.validateTitle(title)) {
        return title;
      }

      console.log("❌ Title must be 1-200 characters long. Please try again.");
    }
  }

  private async selectCategory(
    postType: PostType
  ): Promise<string | undefined> {
    if (postType === "CONCRETE") {
      return; // CONCRETE posts don't typically use categories
    }

    console.log("\n🏷️  Category (optional):");

    const categories = await this.databaseService.getCategories();

    if (categories.length > 0) {
      console.log("\nExisting categories:");
      categories.forEach((cat, index) => {
        console.log(`   ${index + 1}. ${cat.name} (${cat.count} posts)`);
      });
      console.log(`   ${categories.length + 1}. Create new category`);
      console.log(`   ${categories.length + 2}. Skip category`);
    }

    process.stdout.write("\nCategory choice or name: ");
    const input = await this.readLine();
    const trimmed = input.trim();

    if (!trimmed) {
      return;
    }

    // Check if it's a number (existing category selection)
    const choiceNum = Number.parseInt(trimmed, 10);
    if (!Number.isNaN(choiceNum)) {
      if (choiceNum <= categories.length) {
        return categories[choiceNum - 1].name;
      }
      if (choiceNum === categories.length + 2) {
        return; // Skip category
      }
      // If it's the "create new" option, fall through to create new category
    }

    // Treat as new category name
    return this.validateCategory(trimmed) ? trimmed : undefined;
  }

  private async selectTags(): Promise<string[]> {
    console.log("\n🏷️  Tags (comma-separated, optional):");

    const tags = await this.databaseService.getTags();

    if (tags.length > 0) {
      console.log("\nExisting tags:");
      const tagDisplay = tags
        .slice(0, 10) // Show only first 10
        .map((t) => `${t.name} (${t.count})`)
        .join(", ");
      console.log(`   ${tagDisplay}${tags.length > 10 ? "..." : ""}`);
    }

    while (true) {
      process.stdout.write("\nTags: ");
      const tagsInput = await this.readLine();

      const tagList = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      if (this.validateTags(tagList)) {
        return tagList;
      }

      console.log(
        "❌ Invalid tags. Each tag must be 1-50 characters and contain no commas or semicolons."
      );
    }
  }

  private async selectTemplate(): Promise<string> {
    console.log("\n📄 Select template variation:");
    const templates = [
      {
        key: "minimal",
        name: "Minimal",
        description: "Basic structure for quick starts",
      },
      {
        key: "detailed",
        name: "Detailed",
        description: "Comprehensive sections and structure",
      },
      {
        key: "academic",
        name: "Academic",
        description: "Research-focused with methodology",
      },
      {
        key: "tutorial",
        name: "Tutorial",
        description: "Step-by-step instructional format",
      },
    ];

    templates.forEach((template, index) => {
      console.log(
        `   ${index + 1}. ${template.name} - ${template.description}`
      );
    });

    while (true) {
      process.stdout.write(
        `\nChoice (1-${templates.length}) or press Enter for default: `
      );
      const choice = await this.readLine();
      const trimmed = choice.trim();

      if (!trimmed) {
        return "minimal"; // Default
      }

      const choiceNum = Number.parseInt(trimmed, 10);
      if (choiceNum >= 1 && choiceNum <= templates.length) {
        return templates[choiceNum - 1].key;
      }

      console.log(
        `❌ Invalid choice. Please select 1-${templates.length} or press Enter for default.`
      );
    }
  }

  private async confirmAIOutline(): Promise<boolean> {
    console.log("\n🤖 Generate AI outline with Gemini 2.5 Flash?");
    process.stdout.write("Generate outline (y/N): ");
    const response = await this.readLine();
    return ["y", "yes", "Y", "YES"].includes(response.trim());
  }

  private async readLine(): Promise<string> {
    for await (const line of console) {
      return line;
    }
    return "";
  }

  private validateTitle(title: string): boolean {
    return title.length >= 1 && title.length <= 200;
  }

  private validateCategory(category: string): boolean {
    return !category || (category.length >= 1 && category.length <= 100);
  }

  private validateTags(tags: string[]): boolean {
    return tags.every(
      (tag) => tag.length >= 1 && tag.length <= 50 && !/[,;]/.test(tag) // No commas or semicolons
    );
  }
}

/**
 * Mock Interactive Service for testing
 */
export class MockInteractiveService implements InteractiveService {
  constructor(private readonly mockInputs: Partial<InteractiveInputs> = {}) {}

  async collectInputs(): Promise<InteractiveInputs> {
    return {
      type: this.mockInputs.type || "BLOG",
      title: this.mockInputs.title || "Test Post",
      category: this.mockInputs.category,
      tags: this.mockInputs.tags || [],
      template: this.mockInputs.template || "minimal",
      generateOutline: this.mockInputs.generateOutline ?? false,
    };
  }
}

/**
 * Factory for creating interactive service instances
 */
export class InteractiveServiceFactory {
  static create(
    databaseService: DatabaseService,
    useMock = false,
    mockInputs?: Partial<InteractiveInputs>
  ): InteractiveService {
    return useMock
      ? new MockInteractiveService(mockInputs)
      : new BunInteractiveService(databaseService);
  }
}
