import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { loadOgAssets, OG_SIZE, OgFrame } from "@/lib/og-image-shared";
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
  const eyebrow =
    typeof (post as { type?: string }).type === "string"
      ? (POST_TYPE_LABELS[(post as { type: string }).type] ?? siteConfig.name)
      : siteConfig.name;
  const footer = post.originalDate
    ? new Date(post.originalDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : undefined;

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
