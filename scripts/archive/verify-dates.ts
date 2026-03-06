import { prisma } from "@/lib/prisma";

async function verifyDates() {
  console.log("📊 Verifying post dates in database...\n");

  // Get distinct dates
  const distinctDates = await prisma.post.findMany({
    select: {
      originalDate: true,
    },
    distinct: ["originalDate"],
    orderBy: {
      originalDate: "desc",
    },
    take: 20,
  });

  console.log(`Found ${distinctDates.length} distinct dates`);
  console.log("\nSample dates:");
  distinctDates.forEach((post) => {
    if (post.originalDate) {
      console.log(`  - ${post.originalDate.toISOString().split("T")[0]}`);
    }
  });

  // Get date distribution
  const allPosts = await prisma.post.count();
  const postsWithDates = await prisma.post.count({
    where: {
      originalDate: {
        not: null,
      },
    },
  });
  const postsFromFrontmatter = await prisma.post.findMany({
    where: {
      slug: {
        in: [
          "anthropic-frontier-red-team-ai-and-national-security-research",
          "oliver-burkemans-meditations-for-mortals-embracing-imperfection-for-a-more-meaningful-life",
          "agentic-ai-summit-afternoon-workshops",
        ],
      },
    },
    select: {
      title: true,
      slug: true,
      originalDate: true,
    },
  });

  console.log("\n📈 Statistics:");
  console.log(`  Total posts: ${allPosts}`);
  console.log(
    `  Posts with dates: ${postsWithDates} (${((postsWithDates / allPosts) * 100).toFixed(1)}%)`
  );
  console.log(`  Posts without dates: ${allPosts - postsWithDates}`);

  console.log("\n🔍 Sample posts with frontmatter dates:");
  postsFromFrontmatter.forEach((post) => {
    const dateStr = post.originalDate
      ? post.originalDate.toISOString().split("T")[0]
      : "null";
    console.log(`  - ${post.title}`);
    console.log(`    Date: ${dateStr}`);
  });

  // Check for the "all same date" issue
  const dateGroups = await prisma.post.groupBy({
    by: ["originalDate"],
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: 5,
  });

  console.log("\n📅 Top date clusters:");
  dateGroups.forEach((group) => {
    if (group.originalDate) {
      const dateStr = group.originalDate.toISOString().split("T")[0];
      console.log(`  - ${dateStr}: ${group._count.id} posts`);
    }
  });

  // Check for recent sync date issue
  const today = new Date().toISOString().split("T")[0];
  const todayPosts = await prisma.post.count({
    where: {
      originalDate: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`),
      },
    },
  });

  if (todayPosts > 10) {
    console.log(
      `\n⚠️  WARNING: ${todayPosts} posts have today's date (${today})`
    );
    console.log(
      "    This might indicate the date parsing issue is not fully resolved."
    );
  } else {
    console.log(
      `\n✅ SUCCESS: Only ${todayPosts} posts have today's date (expected for recent posts)`
    );
  }

  await prisma.$disconnect();
}

verifyDates().catch(console.error);
