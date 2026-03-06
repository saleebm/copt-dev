import { extractDateString } from "@/lib/date-utils";
import { PostType } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";

async function main() {
  const posts = await prisma.post.findMany({
    where: {
      published: true,
      type: { in: [PostType.FINDING, PostType.SIGHT] },
    },
    select: {
      id: true,
      slug: true,
      type: true,
      originalDate: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const missing = posts.filter((p) => !p.originalDate);

  if (missing.length === 0) {
    console.log("✅ All FINDING/SIGHT posts have originalDate set.");
    process.exit(0);
  }

  console.log(`❗ Found ${missing.length} posts missing originalDate`);
  for (const p of missing) {
    const created = extractDateString(p.createdAt);
    console.log(` - ${p.slug} [${p.type}] created=${created}`);
  }

  // Suggest next command for convenience (not executed)
  console.log(
    "\n👉 Consider running backfill script: bun run scripts/backfill-post-dates.ts --dry-run"
  );
}

main()
  .catch((e) => {
    console.error("❌ Validation failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
