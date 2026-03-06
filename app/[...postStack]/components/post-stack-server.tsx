import { notFound } from "next/navigation";
import { PostStackDataFetcher } from "@/components/post-stack/post-stack-data-fetcher";
import type { PostStackParams } from "@/lib/post-stack-utils-client";

type PostStackServerProps = {
  params: Promise<{ postStack?: string[] }>;
  searchParams?: Promise<{
    stack?: string; // e.g., "post-alpha,post-bravo" (canonical IDs)
  }>;
};

export async function PostStackServer({
  params,
  searchParams,
}: PostStackServerProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  // Prepare parameters for shared utilities
  const stackParams: PostStackParams = {
    searchParams: resolvedSearchParams,
    pathParams: resolvedParams.postStack?.length
      ? resolvedParams.postStack
      : undefined,
  };

  // Use the shared data fetcher with catch-all specific settings
  // allowNotFound=false will trigger notFound() for invalid posts in catch-all routes
  try {
    return (
      <PostStackDataFetcher
        allowNotFound={false}
        isRootPage={false}
        params={stackParams}
      />
    );
  } catch {
    // If no valid posts found, return 404
    return notFound();
  }
}
