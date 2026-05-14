import type { MetadataRoute } from "next";
import { PostStatus } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await prisma.post.findMany({
    where: { status: PostStatus.PUBLISHED },
    select: { slug: true, lastEdited: true },
    orderBy: { lastEdited: "desc" },
  });

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/${p.slug}`,
    lastModified: p.lastEdited,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: posts[0]?.lastEdited ?? new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...postEntries,
  ];
}
