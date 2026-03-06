import type { CodemodDefinition } from "./types";

export const removeBlankFirstLine: CodemodDefinition = {
  name: "remove-blank-first-line",
  description: "Removes blank first line from files",
  transform: (context) => {
    const lines = context.content.split("\n");

    // Check if first line is blank (empty or only whitespace)
    if (lines.length > 0 && lines[0].trim() === "") {
      const newContent = lines.slice(1).join("\n");
      return {
        content: newContent,
        modified: true,
        message: "Removed blank first line",
      };
    }

    return {
      modified: false,
      message: "No blank first line found",
    };
  },
};
