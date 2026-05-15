import Image from "next/image";
import { PostLink } from "@/components/mdx/post-link";
import { BracketedPostName } from "@/components/shared/bracketed-post-name";

export interface SightPreviewImage {
  alt: string;
  src: string;
}

export interface Sight {
  categories?: string[];
  content: string;
  previewImage?: SightPreviewImage;
  slug: string;
  tags?: string[];
  title: string;
}

interface SightsListProps {
  className?: string;
  sights?: Sight[];
  sightsB64?: string;
}

function decodeSights(b64: string): Sight[] {
  const json = Buffer.from(b64, "base64").toString("utf8");
  const parsed = JSON.parse(json) as unknown;
  return Array.isArray(parsed) ? (parsed as Sight[]) : [];
}

export function SightsList({
  sights,
  sightsB64,
  className = "",
}: SightsListProps) {
  const list: Sight[] = sights ?? (sightsB64 ? decodeSights(sightsB64) : []);
  return (
    <div className={`font-mono ${className}`}>
      {list.map((sight, index) => (
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

              {sight.previewImage && (
                <div className="mb-2">
                  <PostLink postId={sight.slug}>
                    <Image
                      alt={sight.previewImage.alt}
                      className="h-auto w-full max-w-xs rounded border border-foreground/20"
                      height={180}
                      src={sight.previewImage.src}
                      width={240}
                    />
                  </PostLink>
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-foreground/70 text-sm">
                {sight.categories && sight.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sight.categories.map((category, idx, arr) => (
                      <span
                        className="text-foreground/60"
                        key={`${sight.slug}-${category}`}
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
