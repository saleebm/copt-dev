import { getAllPublishedPosts } from "@/lib/posts";

interface PostManifestEntry {
  id: string;
  slug: string;
  title: string;
  type: string;
  tags: string[];
  categories: string[];
}

export async function GET() {
  const posts = await getAllPublishedPosts();

  const manifest: PostManifestEntry[] = posts.map((post) => ({
    id: post.slug,
    slug: post.slug,
    title: post.title,
    type: post.type,
    tags: post.tags.map((t: { name: string }) => t.name),
    categories: post.categories.map((c: { name: string }) => c.name),
  }));

  return Response.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    },
  });
}
