import { EnhancedSuspense } from "@/components/shared/enhanced-suspense";
import { MainWrapper } from "@/components/shared/main-wrapper";
import { PostStackServer } from "./components/post-stack-server";

interface PostStackPageProps {
  params: Promise<{ postStack?: string[] }>;
  searchParams?: Promise<{
    stack?: string; // e.g., "post-alpha,post-bravo" (canonical IDs)
  }>;
}

export default function PostStackPage(props: PostStackPageProps) {
  return (
    <MainWrapper variant="gradient">
      <EnhancedSuspense>
        <PostStackServer
          params={props.params}
          searchParams={props.searchParams}
        />
      </EnhancedSuspense>
    </MainWrapper>
  );
}
