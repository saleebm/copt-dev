import rehypeSlug from "rehype-slug";
import remarkComment from "remark-comment";
import remarkGfm from "remark-gfm";

/**
 * Shared MDX plugin set used by both server-side rendering
 * (`lib/post-rendering.ts`) and the client-side first-click serialize path
 * (`hooks/use-post-management.ts`).
 *
 * Keeping these in one place prevents drift like the bug where HTML comments
 * (`<!-- ... -->`) compiled fine on first server render but broke the first
 * time a user clicked a PostLink.
 */
export const mdxRemarkPlugins = [remarkGfm, remarkComment];

/** rehype-slug adds stable id attributes to headings, used as scroll anchors. */
export const mdxRehypePlugins = [rehypeSlug];
