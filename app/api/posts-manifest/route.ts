import { getAllPublishedPosts } from "@/lib/posts";

type PublishedPost = Awaited<ReturnType<typeof getAllPublishedPosts>>[number];
type PostTag = PublishedPost["tags"][number];
type PostCategory = PublishedPost["categories"][number];

interface PostManifestEntry {
  categories: string[];
  id: string;
  slug: string;
  tags: string[];
  title: string;
  type: string;
}

export async function GET() {
  const posts = await getAllPublishedPosts();

  const manifest: PostManifestEntry[] = posts.map((post: PublishedPost) => ({
    id: post.slug,
    slug: post.slug,
    title: post.title,
    type: post.type,
    tags: post.tags.map((t: PostTag) => t.name),
    categories: post.categories.map((c: PostCategory) => c.name),
  }));

  return Response.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    },
  });
}
