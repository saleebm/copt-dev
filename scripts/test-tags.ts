import {
  getAllTagsAction,
  getPostsByTagNameAction,
} from "@/lib/actions/navigation-actions";

// Test the tag functionality
async function testTagActions() {
  console.log("Testing getAllTagsAction...");
  try {
    const tags = await getAllTagsAction();
    console.log("Tags found:", tags.length);

    if (tags.length === 0) {
      console.log("No tags found in database");
      return;
    }

    console.log(
      "First few tags:",
      tags.slice(0, 3).map((t) => ({ name: t.name, count: t.count }))
    );

    const firstTag = tags[0];
    console.log("\nTesting getPostsByTagNameAction for tag:", firstTag.name);

    const posts = await getPostsByTagNameAction(firstTag.name);
    console.log("Posts found for tag:", posts.length);

    if (posts.length > 0) {
      console.log("First post structure:", JSON.stringify(posts[0], null, 2));
    } else {
      console.log("No posts found for this tag");
    }
  } catch (error) {
    console.error("Error testing tag actions:", error);
  }
}

testTagActions();
