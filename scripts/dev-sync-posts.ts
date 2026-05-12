import { watchAndRun } from "./lib/watch-runner";
import { syncPosts } from "./sync-posts";

watchAndRun({
  paths: ["posts", "records/posts"],
  extensions: [".md", ".mdx", ".json"],
  ignore: /(^|\/)\.[^/]+$/,
  label: "sync-posts",
  run: async () => {
    await syncPosts();
  },
});
