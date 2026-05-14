// Main entry point using URL query parameters for the stack
import type { Metadata } from "next";
import { EnhancedSuspense } from "@/components/shared/enhanced-suspense";
import { MainWrapper } from "@/components/shared/main-wrapper";
import { siteConfig } from "@/lib/site-config";
import { HomeServer } from "./components/home-server";

export const metadata: Metadata = {
  title: { absolute: siteConfig.title },
  alternates: { canonical: "/" },
};

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
