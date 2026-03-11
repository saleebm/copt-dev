import { PostStackDataFetcher } from "@/components/post-stack/post-stack-data-fetcher";
import type { PostStackParams } from "@/lib/post-stack-utils-client";

interface HomeServerProps {
  searchParams?: Promise<{
    stack?: string; // e.g., "post-alpha,post-bravo" (canonical IDs)
  }>;
}

export async function HomeServer({ searchParams }: HomeServerProps) {
  const resolvedSearchParams = await searchParams;

  // Prepare parameters for shared utilities
  const params: PostStackParams = {
    searchParams: resolvedSearchParams,
    // No path params for home route
    pathParams: undefined,
  };

  return (
    <PostStackDataFetcher
      allowNotFound={true}
      isRootPage={true}
      params={params}
    />
  );
}
