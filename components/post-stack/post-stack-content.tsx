import type React from "react";
import type { RenderedPost } from "@/types/post";
import { NavigationTabs } from "../navigation/navigation-tabs";
import { QuakeTerminalMobile } from "../navigation/quake-terminal-mobile";
import { PostArticle } from "./post-article";

type PostStackContentProps = {
  posts: RenderedPost[];
};

/**
 * Server component that renders initial posts immediately for optimal UX
 * Provides structure that client components can enhance progressively
 */
const PostStackContent: React.FC<PostStackContentProps> = ({ posts }) => {
  return (
    <div className="flex min-h-screen">
      {/* Post content area - full width on mobile, with right margin on desktop */}
      <div className="z-10 flex-1 lg:ml-96">
        <div
          className="posts-container post-container flex max-w-none flex-col px-4 pt-12 md:px-6 lg:pt-0"
          id="posts-container"
        >
          {/* Render server posts immediately for optimal UX */}
          {posts?.map((post, index) => (
            <PostArticle
              index={index}
              key={`server-${post.id}`}
              keyPrefix="server"
              post={post}
            />
          ))}

          {/* Extra bottom spacing to ensure last post has room */}
          <div className="h-16 flex-shrink-0 md:h-20" />
        </div>
      </div>

      {/* Desktop Navigation - Left Sidebar */}
      <div
        className="fixed top-0 bottom-0 left-0 z-50 hidden w-96 lg:block"
        id="navigation-panel"
      >
        <div className="flex h-full w-full flex-col">
          <NavigationTabs />
        </div>
      </div>

      {/* Mobile Navigation - Quake Terminal */}
      <QuakeTerminalMobile />
    </div>
  );
};

export default PostStackContent;
