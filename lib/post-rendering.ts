import type React from "react";
import { createElement } from "react";
import rehypeSlug from "rehype-slug";
import remarkComment from "remark-comment";
import remarkGfm from "remark-gfm";
import { getMDXComponents } from "@/components/mdx-components";

/**
 * Renders MDX content to React components on the server side.
 * Centralizes MDX rendering logic to avoid duplication across server components.
 *
 * @param source - The MDX source string to render
 * @returns Promise<React.ReactNode> - The rendered MDX content
 * @throws Error if MDX rendering fails
 */
export async function renderMdxContent(
  source: string
): Promise<React.ReactNode> {
  const { MDXRemote } = await import("next-mdx-remote/rsc");
  const components = getMDXComponents({});
  return createElement(MDXRemote, {
    source,
    components,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkComment],
        // rehype-slug adds stable id attributes to headings, used as scroll-restore anchors.
        rehypePlugins: [rehypeSlug],
      },
    },
  });
}
