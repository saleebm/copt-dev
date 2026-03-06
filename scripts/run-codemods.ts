import { readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import {
  allCodemods,
  type CodemodDefinition,
  defaultCodemods,
} from "./codemods";

type ProcessOptions = {
  directory?: string;
  codemods?: string[] | CodemodDefinition[];
  dryRun?: boolean;
  verbose?: boolean;
};

async function getAllMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await getAllMarkdownFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (ext === ".md" || ext === ".mdx") {
        files.push(fullPath);
      }
    }
  }

  return files;
}

async function processFile(
  filePath: string,
  codemods: CodemodDefinition[],
  options: ProcessOptions
): Promise<void> {
  const content = await readFile(filePath, "utf-8");
  const _extension = extname(filePath);

  if (options.verbose) {
    console.log(`\nProcessing: ${filePath}`);
  }

  let currentContent = content;
  let currentFilePath = filePath;
  let hasChanges = false;

  for (const codemod of codemods) {
    const context = {
      filePath: currentFilePath,
      content: currentContent,
      extension: extname(currentFilePath),
    };

    const result = await codemod.transform(context);

    if (result.modified) {
      hasChanges = true;

      if (options.verbose) {
        console.log(`  ✓ ${codemod.name}: ${result.message}`);
      }

      // Update content if modified
      if (result.content !== undefined) {
        currentContent = result.content;
      }

      // Handle file renaming
      if (result.newFilePath) {
        if (options.dryRun) {
          console.log(
            `  [DRY RUN] Would rename: ${currentFilePath} → ${result.newFilePath}`
          );
          currentFilePath = result.newFilePath;
        } else {
          await writeFile(currentFilePath, currentContent);
          await rename(currentFilePath, result.newFilePath);
          currentFilePath = result.newFilePath;
        }
      }

      // Handle file deletion
      if (result.shouldDelete) {
        if (options.dryRun) {
          console.log(`  [DRY RUN] Would delete: ${currentFilePath}`);
        } else {
          await unlink(currentFilePath);
        }
        return; // Don't process further if file is deleted
      }
    } else if (options.verbose) {
      console.log(`  - ${codemod.name}: ${result.message}`);
    }
  }

  // Write the final content if there were changes and no renaming occurred
  if (hasChanges && currentFilePath === filePath && !options.dryRun) {
    await writeFile(currentFilePath, currentContent);
  }

  if (hasChanges && !options.verbose) {
    console.log(
      `Modified: ${filePath}${currentFilePath !== filePath ? ` → ${currentFilePath}` : ""}`
    );
  }
}

function resolveCodemods(
  codemods?: string[] | CodemodDefinition[]
): CodemodDefinition[] {
  if (!codemods) {
    return defaultCodemods;
  }

  if (typeof codemods[0] === "string") {
    return (codemods as string[]).map((name) => {
      const codemod = allCodemods[name];
      if (!codemod) {
        throw new Error(`Unknown codemod: ${name}`);
      }
      return codemod;
    });
  }

  return codemods as CodemodDefinition[];
}

export async function runCodemods(options: ProcessOptions = {}) {
  const {
    directory = "posts/findings",
    dryRun = false,
    verbose = false,
  } = options;

  console.log(`${dryRun ? "[DRY RUN] " : ""}Running codemods on: ${directory}`);

  const codemodsList = resolveCodemods(options.codemods);
  console.log(`Codemods: ${codemodsList.map((c) => c.name).join(", ")}\n`);

  try {
    const files = await getAllMarkdownFiles(directory);

    if (files.length === 0) {
      console.log("No markdown files found.");
      return;
    }

    console.log(`Found ${files.length} markdown files`);

    for (const file of files) {
      await processFile(file, codemodsList, { ...options, dryRun, verbose });
    }

    console.log(
      `\n${dryRun ? "[DRY RUN] " : ""}Completed processing ${files.length} files`
    );
  } catch (error) {
    console.error("Error processing files:", error);
    process.exit(1);
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const verbose = args.includes("--verbose") || args.includes("-v");
  const directoryIndex = args.indexOf("--dir");
  const directory =
    directoryIndex !== -1 ? args[directoryIndex + 1] : undefined;

  const codemodsIndex = args.indexOf("--codemods");
  const codemods =
    codemodsIndex !== -1
      ? args[codemodsIndex + 1]?.split(",").map((s) => s.trim())
      : undefined;

  await runCodemods({
    directory,
    codemods,
    dryRun,
    verbose,
  });
}
