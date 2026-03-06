"use client";
import type React from "react";
import { Skeleton } from "@/components/ui/skeleton";

type PostStackLoadingProps = {
  isLoading: boolean;
  loadingPostId: string | null;
};

/**
 * Loading indicator for smooth post addition transitions
 */
export const PostStackLoading: React.FC<PostStackLoadingProps> = ({
  isLoading,
  loadingPostId,
}) => {
  if (!(isLoading && loadingPostId)) {
    return null;
  }

  return (
    <div
      className="w-full animate-fade-in transition-all duration-300 ease-out"
      data-loading-post={loadingPostId}
    >
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        {/* Header skeleton */}
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Title skeleton */}
        <Skeleton className="mb-4 h-8 w-3/4" />

        {/* Content skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Tags skeleton */}
        <div className="mt-6 flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-14" />
        </div>
      </div>
    </div>
  );
};
