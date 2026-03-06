import { type ReactNode, Suspense } from "react";
import { PostStackSkeleton } from "./skeletons";

type EnhancedSuspenseProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export function EnhancedSuspense({
  children,
  fallback,
}: EnhancedSuspenseProps) {
  return (
    <Suspense
      fallback={
        <div className="relative">
          {/* Cool fading overlay */}
          <div className="absolute inset-0 z-10 animate-pulse bg-gradient-to-br from-background/80 via-muted/90 to-secondary/80 backdrop-blur-sm">
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
            <div className="flex min-h-screen items-center justify-center">
              <div className="space-y-4 text-center">
                <div className="relative">
                  <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
                  <div
                    className="absolute inset-0 mx-auto h-16 w-16 animate-spin rounded-full border-4 border-transparent border-r-primary/50"
                    style={{
                      animationDirection: "reverse",
                      animationDuration: "1.5s",
                    }}
                  />
                </div>
                <p className="animate-pulse font-medium text-primary text-sm">
                  Loading your experience...
                </p>
              </div>
            </div>
          </div>
          {/* Fallback content underneath */}
          <div className="opacity-30 blur-sm">
            {fallback || <PostStackSkeleton />}
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
