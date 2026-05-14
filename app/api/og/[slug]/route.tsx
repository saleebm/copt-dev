import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { loadOgAssets, OG_SIZE, OgFrame } from "@/lib/og-image-shared";
import { getPostBySlug } from "@/lib/posts";
import { siteConfig } from "@/lib/site-config";

const TYPE_LABELS: Record<string, string> = {
  CONCRETE: "essay",
  BLOG: "blog",
  FINDING: "finding",
  SIGHT: "sight",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const [{ logoSrc, fonts }, post] = await Promise.all([
    loadOgAssets(),
    getPostBySlug(slug),
  ]);

  const title = post?.title ?? siteConfig.title;
  const eyebrow =
    post && typeof (post as { type?: string }).type === "string"
      ? (TYPE_LABELS[(post as { type: string }).type] ?? siteConfig.name)
      : siteConfig.name;
  const footer = post?.originalDate
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
