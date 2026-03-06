import { prisma } from "../lib/prisma";

async function checkPosts() {
  // Get posts in the categories with counts
  const categories = await prisma.category.findMany({
    where: {
      name: { in: ["ᛝlightᛝ", "daily", "you", "dummy"] },
    },
    include: {
      posts: {
        select: {
          slug: true,
          title: true,
          type: true,
          published: true,
        },
      },
    },
  });

  console.log("Categories and their posts:");
  categories.forEach((cat) => {
    console.log(`\n${cat.name} (${cat.displayName}):`);
    cat.posts.forEach((post) => {
      console.log(
        `  - ${post.slug} | ${post.type} | published: ${post.published}`
      );
    });
  });

  // Check category embeddings for 'artificial-intelligence'
  const aiEmbedding = await prisma.categoryEmbedding.findUnique({
    where: { path: "artificial-intelligence" },
  });

  console.log("\n\nArtificial Intelligence CategoryEmbedding:");
  console.log(aiEmbedding);

  // Check if there are any posts with categories
  const postsWithCategories = await prisma.post.findMany({
    where: {
      published: true,
      type: { in: ["BLOG", "CONCRETE"] },
    },
    include: {
      categories: {
        select: {
          name: true,
          displayName: true,
        },
      },
    },
    take: 10,
  });

  console.log("\n\nBLOG/CONCRETE posts with their categories:");
  postsWithCategories.forEach((post) => {
    console.log(`\n${post.slug} (${post.type}):`);
    post.categories.forEach((cat) => {
      console.log(`  - ${cat.name} (${cat.displayName})`);
    });
  });

  await prisma.$disconnect();
}

checkPosts();
