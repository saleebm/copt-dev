import { PostLink } from "@/components/mdx/post-link";
import { BracketedPostName } from "@/components/shared/bracketed-post-name";

export type Sight = {
  slug: string;
  title: string;
  content: string;
  categories?: string[];
  tags?: string[];
};

type SightsListProps = {
  sights: Sight[];
  className?: string;
};

export function SightsList({ sights, className = "" }: SightsListProps) {
  return (
    <div className={`font-mono ${className}`}>
      {sights.map((sight, index) => (
        <div
          className="mb-3 border-foreground/20 border-b pb-3 last:border-b-0"
          key={sight.slug}
        >
          <div className="flex items-start gap-2">
            <span className="mt-1 shrink-0 text-foreground/60 text-sm">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1">
                <PostLink postId={sight.slug}>
                  <BracketedPostName isActive={false} postId={sight.title} />
                </PostLink>
              </div>

              <div className="flex flex-wrap gap-2 text-foreground/70 text-sm">
                {sight.categories && sight.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sight.categories.map((category, idx, arr) => (
                      <span
                        className="text-foreground/60"
                        key={`${sight.slug}-${category}-${idx}`}
                      >
                        {category}
                        {idx < arr.length - 1 && "/"}
                      </span>
                    ))}
                  </div>
                )}

                {sight.tags && sight.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sight.tags.map((tag) => (
                      <span className="text-foreground/50" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
