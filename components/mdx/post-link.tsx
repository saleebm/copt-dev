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
      className={`group/mdx-btn inline-flex max-w-full items-center gap-1.5 truncate rounded-sm border border-primary/25 bg-primary/[0.04] px-2 py-0.5 align-middle font-mono text-[0.85em] text-primary/80 leading-none no-underline shadow-[inset_0_0_0_1px_transparent] transition-[color,border-color,background-color,box-shadow] duration-200 ease-out hover:border-primary/70 hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_10px_-2px_hsl(var(--primary)/0.35)] focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 ${className || ""}`}
      postId={postId}
    >
      <span
        aria-hidden="true"
        className="text-primary/50 transition-colors duration-200 group-hover/mdx-btn:text-primary"
      >
        ❯
      </span>
      <span>{children}</span>
    </PostLinkClient>
  );
}
