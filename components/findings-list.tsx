import { PostLink } from "@/components/mdx/post-link";
import { BracketedPostName } from "@/components/shared/bracketed-post-name";

export type Finding = {
  slug: string;
  title: string;
  content: string;
  original_url?: string;
  categories?: string[];
  tags?: string[];
};

type FindingsListProps = {
  findings: Finding[];
  className?: string;
};

export function FindingsList({ findings, className = "" }: FindingsListProps) {
  return (
    <div className={`font-mono ${className}`}>
      {findings.map((finding, index) => (
        <div
          className="mb-3 border-foreground/20 border-b pb-3 last:border-b-0"
          key={finding.slug}
        >
          <div className="flex items-start gap-2">
            <span className="mt-1 shrink-0 text-foreground/60 text-sm">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1">
                <PostLink postId={finding.slug}>
                  <BracketedPostName isActive={false} postId={finding.title} />
                </PostLink>
              </div>

              <div className="flex flex-wrap gap-2 text-foreground/70 text-sm">
                {finding.categories && finding.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {finding.categories.map((category, idx, arr) => (
                      <span
                        className="text-foreground/60"
                        key={`${finding.slug}-${category}-${idx}`}
                      >
                        {category}
                        {idx < arr.length - 1 && "/"}
                      </span>
                    ))}
                  </div>
                )}

                {finding.tags && finding.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {finding.tags.map((tag) => (
                      <span className="text-foreground/50" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {finding.original_url && (
                <div className="mt-1 text-foreground/40 text-xs">
                  <a
                    className="hover:text-foreground/60"
                    href={finding.original_url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {finding.original_url}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
