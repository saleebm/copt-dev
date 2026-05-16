import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

/**
 * Shared MDX plugin set used by both server-side rendering
 * (`lib/post-rendering.ts`) and the client-side first-click serialize path
 * (`hooks/use-post-management.ts`).
 *
 * Note: we intentionally do NOT use `remark-comment`. Its micromark tokenizer
 * triggers a `expected last token to be open` assertion under
 * `micromark/dev` — which Webpack/Turbopack resolve via the `development`
 * conditional export in browser bundles. Node SSR doesn't resolve that
 * condition, so the bug only surfaced on first-click client renders. We
 * strip HTML comments from the source ourselves (`stripMdxHtmlComments`)
 * before handing it to MDX, which keeps both render paths identical.
 */
export const mdxRemarkPlugins = [remarkGfm];

/** rehype-slug adds stable id attributes to headings, used as scroll anchors. */
export const mdxRehypePlugins = [rehypeSlug];

/**
 * Strip HTML comments (`<!-- ... -->`) from an MDX source string.
 *
 * MDX 3 does not allow HTML comments in source. Posts created by the roll
 * pipeline (and historical content) embed `<!-- rolled ... -->` trace
 * markers; removing them keeps the trace in the file on disk and DB record
 * but prevents the MDX parser from seeing them at render time.
 */
export function stripMdxHtmlComments(source: string): string {
  return source.replace(/<!--[\s\S]*?-->/g, "");
}
