import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import {
  extractFirstMarkdownImage,
  loadOgAssets,
  loadOgPublicImage,
  OG_SIZE,
  OgFrame,
  OgSightFrame,
} from "@/lib/og-image-shared";
import { getPostBySlug } from "@/lib/posts";
import { POST_TYPE_LABELS, siteConfig } from "@/lib/site-config";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return new Response("Not found", { status: 404 });
  }
  const { logoSrc, fonts } = await loadOgAssets();

  const title = post.title;
  const postType = typeof post.type === "string" ? post.type : undefined;
  const eyebrow = postType
    ? (POST_TYPE_LABELS[postType] ?? siteConfig.name)
    : siteConfig.name;
  const footer = post.originalDate
    ? new Date(post.originalDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : undefined;

  if (postType === "SIGHT") {
    const firstImage = extractFirstMarkdownImage(post.content);
    const imageSrc = firstImage
      ? await loadOgPublicImage(firstImage.src)
      : null;
    if (imageSrc) {
      return new ImageResponse(
        <OgSightFrame
          alt={firstImage?.alt || title}
          eyebrow={eyebrow}
          footer={footer}
          imageSrc={imageSrc}
          title={title}
        />,
        { ...OG_SIZE, fonts }
      );
    }
  }

  return new ImageResponse(
    <OgFrame
      eyebrow={eyebrow}
      footer={footer}
      logoSrc={logoSrc}
      title={title}
    />,
    { ...OG_SIZE, fonts }
  );
}
