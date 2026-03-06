import { prisma } from "../lib/prisma";

async function checkAIPosts() {
  // Get posts in the AI categories without filtering
  const aiPosts = await prisma.post.findMany({
    where: {
      categories: {
        some: {
          name: {
            in: [
              "artificial-intelligence",
              "prompt-engineering",
              "natural-language-processing",
            ],
          },
        },
      },
    },
    select: {
      slug: true,
      title: true,
      type: true,
      published: true,
      categories: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log("Posts in AI categories (all types, published and unpublished):");
  console.log(`Total: ${aiPosts.length} posts\n`);

  aiPosts.forEach((post) => {
    const cats = post.categories.map((c) => c.name).join(", ");
    console.log(`${post.slug}`);
    console.log(`  Type: ${post.type} | Published: ${post.published}`);
    console.log(`  Categories: [${cats}]`);
    console.log("");
  });

  // Group by status
  const published = aiPosts.filter((p) => p.published);
  const unpublished = aiPosts.filter((p) => !p.published);
  const blogConcrete = aiPosts.filter(
    (p) => ["BLOG", "CONCRETE"].includes(p.type) && p.published
  );
  const findingSight = aiPosts.filter(
    (p) => ["FINDING", "SIGHT"].includes(p.type) && p.published
  );

  console.log("\nSummary:");
  console.log(`  Published: ${published.length}`);
  console.log(`  Unpublished: ${unpublished.length}`);
  console.log(`  Published BLOG/CONCRETE: ${blogConcrete.length}`);
  console.log(`  Published FINDING/SIGHT: ${findingSight.length}`);

  await prisma.$disconnect();
}

checkAIPosts();
