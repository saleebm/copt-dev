import { createUTCDate } from "@/lib/date-utils";
import { PostType } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";

// Flags
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run") || args.includes("-d");

function deriveDateFromSlug(slug: string): Date | null {
  // Try to extract YYYY-MM-DD from patterns
  const m = slug.match(/(\d{4}-\d{2}-\d{2})/);
  if (m) {
    return createUTCDate(m[1]);
  }
  return null;
}

async function main() {
  const candidates = await prisma.post.findMany({
    where: {
      published: true,
      type: { in: [PostType.FINDING, PostType.SIGHT] },
      OR: [{ originalDate: null }, { originalDate: undefined }],
    },
    select: {
      id: true,
      slug: true,
      createdAt: true,
    },
  });

  if (candidates.length === 0) {
    console.log("✅ No posts require backfill.");
    return;
  }

  console.log(
    `🔧 Backfilling originalDate for ${candidates.length} posts${isDryRun ? " (dry-run)" : ""}`
  );

  let updated = 0;
  for (const post of candidates) {
    const fromSlug = deriveDateFromSlug(post.slug);
    const newDate =
      fromSlug ?? createUTCDate(post.createdAt.toISOString().slice(0, 10));

    if (isDryRun) {
      console.log(`[DRY] would set ${post.slug} -> ${newDate.toISOString()}`);
      updated++;
      continue;
    }

    await prisma.post.update({
      where: { id: post.id },
      data: { originalDate: newDate },
    });
    console.log(`✅ set ${post.slug} -> ${newDate.toISOString()}`);
    updated++;
  }

  console.log(
    `\n✅ Completed${isDryRun ? " (dry-run)" : ""}. Updated ${updated} posts.`
  );
}

main()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
