import type { CodemodDefinition } from "./types";

export const renameMdToMdx: CodemodDefinition = {
  name: "rename-md-to-mdx",
  description:
    "Renames .md files to .mdx (excludes files already with .mdx extension)",
  transform: (context) => {
    // Only process .md files, not .mdx files
    if (context.extension === ".md") {
      const newFilePath = context.filePath.replace(/\.md$/, ".mdx");
      return {
        newFilePath,
        modified: true,
        message: "Renamed .md to .mdx",
      };
    }

    return {
      modified: false,
      message: "File is not .md or already .mdx",
    };
  },
};
