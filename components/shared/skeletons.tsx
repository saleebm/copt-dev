import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function PostContentSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

export function PostStackSkeleton() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <div className="flex min-h-screen">
        {/* Post content area matching actual layout */}
        <div className="flex-1 lg:mr-72">
          <div className="flex max-w-none flex-col gap-4 px-4 py-6 md:gap-8 md:px-6 md:py-8">
            {Array.from({ length: 3 }, (_, i) => i).map((i) => (
              <article
                className="relative z-10 min-h-0 w-full flex-shrink-0"
                key={`skeleton-article-${i}`}
              >
                <div className="group relative mx-auto flex min-h-[60vh] w-full flex-col rounded-lg border border-border bg-card shadow-2xl md:max-w-4xl">
                  {/* Header skeleton */}
                  <div className="flex items-start justify-between rounded-t-lg border-border border-b bg-card/40 p-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <Skeleton className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" />
                        <div className="min-w-0 flex-1">
                          <Skeleton className="mb-2 h-7 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-1">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </div>

                  {/* Content skeleton */}
                  <div className="flex-1 p-6">
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="space-y-2 pt-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  </div>

                  {/* Footer skeleton (conditional) */}
                  {i === 0 && (
                    <div className="border-border border-t bg-card p-4">
                      <div className="flex flex-wrap justify-center gap-3">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-28" />
                      </div>
                    </div>
                  )}

                  {/* Left border accent */}
                  <div className="absolute top-0 bottom-0 left-0 w-1 rounded-l-lg bg-gradient-to-b from-primary/60 via-primary/40 to-transparent opacity-80" />
                </div>
              </article>
            ))}

            {/* Extra bottom spacing */}
            <div className="h-16 flex-shrink-0 md:h-20" />
          </div>
        </div>

        {/* Navigation panel skeleton */}
        <div className="fixed top-0 right-0 bottom-0 hidden w-72 border-border border-l bg-card/95 backdrop-blur lg:block">
          <div className="p-6">
            <Skeleton className="mb-4 h-6 w-32" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
