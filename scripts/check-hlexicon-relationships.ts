import { prisma } from "@/lib/prisma";

async function checkHlexicon() {
  const post = await prisma.post.findUnique({
    where: { slug: "hlexicon-working-test" },
    include: {
      hlexiconEntries: true,
    },
  });

  console.log("\n📊 Post:", post?.title);
  console.log("📝 Hlexicon Entries Count:", post?.hlexiconEntries.length);
  console.log("\n🏷️  Terms in this post:");
  post?.hlexiconEntries.forEach((entry) => {
    const shortDef =
      entry.definition.length > 50
        ? `${entry.definition.substring(0, 50)}...`
        : entry.definition;
    console.log(`  - ${entry.term}: ${shortDef}`);
  });

  if (post && post.hlexiconEntries.length > 0) {
    const firstTerm = post.hlexiconEntries[0];
    const relatedPosts = await prisma.hlexiconEntry.findUnique({
      where: { id: firstTerm.id },
      include: {
        posts: {
          select: { slug: true, title: true },
        },
      },
    });

    console.log(`\n🔗 All posts using the term "${firstTerm.term}":`);
    relatedPosts?.posts.forEach((p) => {
      console.log(`  - ${p.title} (${p.slug})`);
    });
  }

  await prisma.$disconnect();
}

checkHlexicon().catch(console.error);
