import type { Metadata } from "next";
import { EnhancedSuspense } from "@/components/shared/enhanced-suspense";
import { MainWrapper } from "@/components/shared/main-wrapper";
import { getPostBySlug } from "@/lib/posts";
import { POST_TYPE_LABELS, siteConfig } from "@/lib/site-config";
import { PostStackServer } from "./components/post-stack-server";

interface PostStackPageProps {
  params: Promise<{ postStack?: string[] }>;
  searchParams?: Promise<{
    stack?: string;
    initialActivePostId?: string;
  }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PostStackPageProps): Promise<Metadata> {
  const { postStack } = await params;
  const resolvedSearch = await searchParams;

  // Mirror PostStackDataFetcher: path segments first, then ?stack= additions
  const pathSlugs = postStack ?? [];
  const stackParam = resolvedSearch?.stack?.split(",").filter(Boolean) ?? [];
  const allSlugs = [
    ...pathSlugs,
    ...stackParam.filter((s) => !pathSlugs.includes(s)),
  ];
  // Explicit initialActivePostId wins; otherwise the last slug is the active post
  const slug = resolvedSearch?.initialActivePostId ?? allSlugs.at(-1);
  if (!slug) {
    return { title: siteConfig.title };
  }
  const post = await getPostBySlug(slug);
  if (!post) {
    return {
      title: "Not found",
      robots: { index: false, follow: false },
    };
  }
  const typeLabel =
    typeof (post as { type?: string }).type === "string"
      ? (POST_TYPE_LABELS[(post as { type: string }).type] ?? "post")
      : "post";
  const date = post.originalDate ?? post.createdAt;
  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const description =
    post.excerpt ?? `A ${typeLabel} by ${siteConfig.author} · ${formattedDate}`;
  const canonical = `/${post.slug}`;
  const tagNames = post.tags.map((t: { name: string }) => t.name);
  const ogImage = {
    url: `/api/og/${post.slug}`,
    width: 1200,
    height: 630,
    alt: post.title,
  };
  return {
    title: post.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: post.title,
      description,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      publishedTime: (post.originalDate ?? post.createdAt).toISOString(),
      modifiedTime: post.lastEdited.toISOString(),
      authors: [siteConfig.author],
      tags: tagNames,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [ogImage.url],
    },
  };
}

export default function PostStackPage(props: PostStackPageProps) {
  return (
    <MainWrapper variant="gradient">
      <EnhancedSuspense>
        <PostStackServer
          params={props.params}
          searchParams={props.searchParams}
        />
      </EnhancedSuspense>
    </MainWrapper>
  );
}
