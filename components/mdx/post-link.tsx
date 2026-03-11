import { PostLinkClient } from "../client-wrappers/post-link-client";

interface PostLinkProps {
  children: React.ReactNode;
  className?: string;
  postId: string;
}

export function PostLink({ postId, children, className }: PostLinkProps) {
  return (
    <PostLinkClient className={className} postId={postId}>
      {children}
    </PostLinkClient>
  );
}

export function RelatedPostLink({
  postId,
  children,
  className,
}: PostLinkProps) {
  return (
    <PostLinkClient
      className={`group inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 font-medium text-foreground text-sm transition-all duration-200 ease-in-out hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background ${className || ""}`}
      postId={postId}
    >
      <span
        aria-hidden="true"
        className="text-primary transition-colors duration-200 group-hover:text-accent-foreground"
      >
        🔗
      </span>
      <span className="underline decoration-primary/50 underline-offset-2 group-hover:decoration-accent-foreground/70">
        {children}
      </span>
    </PostLinkClient>
  );
}

export function ButtonPostLink({ postId, children, className }: PostLinkProps) {
  return (
    <PostLinkClient
      className={`inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90 ${className || ""}`}
      postId={postId}
    >
      {children}
    </PostLinkClient>
  );
}
