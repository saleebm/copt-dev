import { PostStackDataFetcher } from "@/components/post-stack/post-stack-data-fetcher";
import type { PostStackParams } from "@/lib/post-stack-utils-client";

interface PostStackServerProps {
  params: Promise<{ postStack?: string[] }>;
  searchParams?: Promise<{
    stack?: string; // e.g., "post-alpha,post-bravo" (canonical IDs)
  }>;
}

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

  // Use the shared data fetcher with catch-all specific settings.
  // allowNotFound=false makes the fetcher call notFound() internally when no
  // valid posts resolve from the URL. Wrapping this in try/catch here does
  // NOT work because the fetcher is an async server component — the throw
  // happens during React rendering, after this function has already returned.
  return (
    <PostStackDataFetcher
      allowNotFound={false}
      isRootPage={false}
      params={stackParams}
    />
  );
}
