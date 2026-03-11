// Main entry point using URL query parameters for the stack
import { EnhancedSuspense } from "@/components/shared/enhanced-suspense";
import { MainWrapper } from "@/components/shared/main-wrapper";
import { HomeServer } from "./components/home-server";

interface HomePageProps {
  searchParams?: Promise<{
    stack?: string; // e.g., "post-alpha,post-bravo" (canonical IDs)
  }>;
}

export default function HomePage(props: HomePageProps) {
  return (
    <MainWrapper variant="gradient">
      <EnhancedSuspense>
        <HomeServer searchParams={props.searchParams} />
      </EnhancedSuspense>
    </MainWrapper>
  );
}
