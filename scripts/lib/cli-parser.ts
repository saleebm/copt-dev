/**
 * Command-line argument parser for post scaffolding
 */

import { parseArgs } from "node:util";
import type { PostType } from "@/lib/generated/prisma";

export type CLIArguments = {
  interactive: boolean;
  type?: PostType;
  title?: string;
  category?: string;
  tags?: string[];
  template?: string;
  outline?: boolean;
  output?: string;
  verbose?: boolean;
  dryRun?: boolean;
  help?: boolean;
};

/**
 * Parse command-line arguments
 */
export function parseCliArguments(): CLIArguments {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2), // Remove 'bun' and script name
    options: {
      interactive: {
        type: "boolean",
        short: "i",
        default: false,
      },
      type: {
        type: "string",
        short: "t",
      },
      title: {
        type: "string",
        short: "T",
      },
      category: {
        type: "string",
        short: "c",
      },
      tags: {
        type: "string",
        multiple: true,
      },
      template: {
        type: "string",
        default: "minimal",
      },
      outline: {
        type: "boolean",
        short: "o",
        default: false,
      },
      output: {
        type: "string",
        short: "O",
      },
      verbose: {
        type: "boolean",
        short: "v",
        default: false,
      },
      "dry-run": {
        type: "boolean",
        short: "d",
        default: false,
      },
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
    },
    allowPositionals: true,
  });

  // If title not provided as flag, use first positional argument
  const title = values.title || positionals[0];

  return {
    interactive: values.interactive || !(title || values.help), // Default to interactive if no title provided
    type: values.type as PostType,
    title,
    category: values.category,
    tags: values.tags,
    template: values.template,
    outline: values.outline,
    output: values.output,
    verbose: values.verbose,
    dryRun: values["dry-run"],
    help: values.help,
  };
}

/**
 * Display help information
 */
export function displayHelp(): void {
  console.log(`
🚀 Post Scaffolding CLI

USAGE:
  bun run scaffold [OPTIONS] [TITLE]
  bun run scaffold --interactive
  bun run scaffold --help

EXAMPLES:
  bun run scaffold "My New Post"
  bun run scaffold -t BLOG -c technology "AI and the Future"
  bun run scaffold --type CONCRETE --template detailed "Core Principles"
  bun run scaffold --interactive

OPTIONS:
  -i, --interactive     Run in interactive mode (default if no title provided)
  -t, --type TYPE       Post type: CONCRETE, BLOG, FINDING, SIGHT
  -T, --title TITLE     Post title
  -c, --category CAT    Post category
  --tags TAG1,TAG2      Comma-separated tags
  --template TEMPLATE   Template variation: minimal, detailed, academic, tutorial
  -o, --outline         Generate AI outline (default: false)
  -O, --output PATH     Custom output file path
  -v, --verbose         Verbose logging
  -d, --dry-run         Show what would be created without creating files
  -h, --help            Show this help message

POST TYPES:
  CONCRETE              Foundational, principle-based content
  BLOG                  Personal, chronological posts
  FINDING               Research discoveries and external content
  SIGHT                 Visual/image posts

TEMPLATE VARIATIONS:
  minimal               Basic structure for quick starts
  detailed              Comprehensive sections and structure
  academic              Research-focused with methodology
  tutorial              Step-by-step instructional format

ENVIRONMENT:
  GEMINI_API_KEY        Required for AI outline generation (or GOOGLE_API_KEY)
  AI_MODEL              Model name (default from .env)
  AI_TEMPERATURE        Generation temperature (default: 0.7)
`);
}

/**
 * Validate CLI arguments
 */
export function validateCliArguments(args: CLIArguments): string[] {
  const errors: string[] = [];

  // Validate post type
  if (args.type && !["CONCRETE", "BLOG", "FINDING", "SIGHT"].includes(args.type)) {
    errors.push(
      `Invalid post type: ${args.type}. Must be CONCRETE, BLOG, FINDING, or SIGHT.`
    );
  }

  // Validate template
  if (
    args.template &&
    !["minimal", "detailed", "academic", "tutorial"].includes(args.template)
  ) {
    errors.push(
      `Invalid template: ${args.template}. Must be minimal, detailed, academic, or tutorial.`
    );
  }

  // Validate title if provided
  if (args.title && (args.title.length < 1 || args.title.length > 200)) {
    errors.push("Title must be between 1 and 200 characters.");
  }

  // Validate category if provided
  if (args.category && args.category.length > 100) {
    errors.push("Category must be 100 characters or less.");
  }

  // Validate tags if provided
  if (args.tags) {
    for (const tag of args.tags) {
      if (tag.length > 50) {
        errors.push(`Tag "${tag}" is too long. Maximum 50 characters.`);
      }
      if (/[,;]/.test(tag)) {
        errors.push(
          `Tag "${tag}" contains invalid characters (commas or semicolons).`
        );
      }
    }
  }

  return errors;
}
