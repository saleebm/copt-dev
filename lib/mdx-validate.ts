import { compile, type CompileOptions } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { stripMdxHtmlComments } from "@/lib/mdx-options";

export const MDX_COMPILE_OPTIONS = {
  development: false,
  jsx: true,
  jsxImportSource: "react",
  remarkPlugins: [remarkGfm],
} satisfies CompileOptions;

// Splits content into alternating prose / code-region segments. Even indices
// are prose; odd indices are fenced (```) or inline (`) code that must be
// preserved verbatim. The capture group keeps delimiters with their content.
const CODE_REGION = /(```[\s\S]*?```|`[^`\n]*`)/g;

// `<` that does NOT start a valid JSX/HTML construct (letter, $, _, /, !, ?).
// This catches `<1,000`, `< 100`, `<-`, `<=`, etc. while leaving real tags
// (`<details>`, `</details>`, `<!--`) untouched.
const STRAY_LT = /<(?![A-Za-z$_/!?])/g;

// Any bare `{` outside a code region. MDX treats this as the start of a JSX
// expression and errors if it can't close. AI prose output never produces
// valid JSX expressions, so escaping every literal `{` is safe — and matches
// what the writer actually emits (no `{expr}` attributes are generated).
const BARE_LBRACE = /\{/g;

export function escapeMdxProse(content: string): string {
  const parts = content.split(CODE_REGION);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return part.replace(STRAY_LT, "&lt;").replace(BARE_LBRACE, "\\{");
    })
    .join("");
}

export async function validateMdx(
  content: string,
  label: string
): Promise<void> {
  try {
    // Mirror the runtime render path: HTML comments are stripped before
    // MDX sees them, so the validator must do the same to stay accurate.
    await compile(stripMdxHtmlComments(content), MDX_COMPILE_OPTIONS);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`MDX compile failed for ${label}: ${reason}`);
  }
}
