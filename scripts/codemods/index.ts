export { consolidateCategories } from "./consolidate-categories";
export { removeBlankFirstLine } from "./remove-blank-first-line";
export { renameMdToMdx } from "./rename-md-to-mdx";
export * from "./types";

import { consolidateCategories } from "./consolidate-categories";
import { removeBlankFirstLine } from "./remove-blank-first-line";
import { renameMdToMdx } from "./rename-md-to-mdx";
import type { CodemodDefinition } from "./types";

// Default codemods for the findings directory
export const defaultCodemods: CodemodDefinition[] = [
  removeBlankFirstLine,
  renameMdToMdx,
];

// Registry of all available codemods
export const allCodemods: Record<string, CodemodDefinition> = {
  "remove-blank-first-line": removeBlankFirstLine,
  "rename-md-to-mdx": renameMdToMdx,
  "consolidate-categories": consolidateCategories,
};
