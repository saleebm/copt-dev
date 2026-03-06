import { prisma } from "../lib/prisma";

async function checkAICategories() {
  // Get all category embeddings that start with 'artificial-intelligence'
  const aiEmbeddings = await prisma.categoryEmbedding.findMany({
    where: {
      path: {
        startsWith: "artificial-intelligence",
      },
    },
    orderBy: {
      path: "asc",
    },
    take: 20,
  });

  console.log("AI Category Embeddings:");
  aiEmbeddings.forEach((emb) => {
    console.log(`  ${emb.path} (name: ${emb.name}, files: ${emb.fileCount})`);
  });

  // Extract category names from embeddings
  const categoryNames = aiEmbeddings.map((emb) => emb.name);

  // Check if there are any categories in the Category table with these names
  const categories = await prisma.category.findMany({
    where: {
      name: {
        in: categoryNames,
      },
    },
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });

  console.log("\n\nCategories in Category table:");
  categories.forEach((cat) => {
    console.log(
      `  ${cat.name} (${cat.displayName}): ${cat._count.posts} posts`
    );
  });

  // Check all posts and their categories
  const allPosts = await prisma.post.findMany({
    where: {
      published: true,
      type: {
        in: ["BLOG", "CONCRETE"],
      },
    },
    include: {
      categories: {
        select: {
          name: true,
          displayName: true,
        },
      },
    },
  });

  console.log("\n\nAll published BLOG/CONCRETE posts and their categories:");
  allPosts.forEach((post) => {
    const catNames = post.categories.map((c) => c.name).join(", ");
    console.log(`  ${post.slug} (${post.type}): [${catNames}]`);
  });

  await prisma.$disconnect();
}

checkAICategories();
