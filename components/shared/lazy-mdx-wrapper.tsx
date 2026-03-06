"use client";

import { FileText, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import React, { Suspense, useMemo } from "react";
import { ErrorBoundary } from "./error-boundary";

type LazyMDXWrapperProps = {
  children: React.ReactNode;
  loadingComponent?: React.ComponentType;
  errorFallback?: React.ReactNode;
  enableLazyLoading?: boolean;
  postSlug?: string;
  isFindingsPost?: boolean;
};

// Default loading component
const DefaultLoadingComponent = () => (
  <div className="flex min-h-[200px] items-center justify-center p-8">
    <div className="space-y-4 text-center">
      <div className="relative">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <div className="absolute inset-0 mx-auto h-8 w-8 animate-pulse rounded-full border-2 border-primary/20" />
      </div>
      <p className="text-muted-foreground text-sm">Loading content...</p>
    </div>
  </div>
);

// Enhanced loading component with skeleton
const EnhancedLoadingComponent = () => (
  <div className="animate-pulse space-y-6 p-6">
    {/* Header skeleton */}
    <div className="space-y-2">
      <div className="h-8 w-3/4 rounded-md bg-muted" />
      <div className="h-4 w-1/2 rounded-md bg-muted" />
    </div>

    {/* Content skeleton */}
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-4 w-full rounded-md bg-muted" />
        <div className="h-4 w-full rounded-md bg-muted" />
        <div className="h-4 w-2/3 rounded-md bg-muted" />
      </div>

      <div className="space-y-2">
        <div className="h-4 w-full rounded-md bg-muted" />
        <div className="h-4 w-4/5 rounded-md bg-muted" />
      </div>

      <div className="h-32 w-full rounded-md bg-muted" />

      <div className="space-y-2">
        <div className="h-4 w-full rounded-md bg-muted" />
        <div className="h-4 w-3/4 rounded-md bg-muted" />
      </div>
    </div>
  </div>
);

// Lazy loading wrapper for heavy components
const LazyComponent = dynamic(
  () =>
    Promise.resolve(({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    )),
  {
    loading: () => <DefaultLoadingComponent />,
    ssr: false,
  }
);

// Performance optimized wrapper with memoization
const MemoizedContent = React.memo(
  ({ children }: { children: React.ReactNode }) => <>{children}</>
);

MemoizedContent.displayName = "MemoizedContent";

// Stable content wrapper component for findings posts
const StableContentWrapper = ({
  children: wrapperChildren,
  loadingFallback,
}: {
  children: React.ReactNode;
  loadingFallback: React.ReactNode;
}) => {
  const [isStable, setIsStable] = React.useState(false);

  React.useEffect(() => {
    // For findings posts, wait a bit longer to ensure content is stable
    const timeout = setTimeout(() => setIsStable(true), 200);
    return () => clearTimeout(timeout);
  }, []);

  if (!isStable) {
    return <>{loadingFallback}</>;
  }

  return <>{wrapperChildren}</>;
};

export function LazyMDXWrapper({
  children,
  loadingComponent: LoadingComponent = EnhancedLoadingComponent,
  errorFallback,
  enableLazyLoading = false,
  postSlug,
  isFindingsPost = false,
}: LazyMDXWrapperProps) {
  // Memoize the error fallback
  const memoizedErrorFallback = useMemo(() => {
    if (errorFallback) {
      return errorFallback;
    }

    return (
      <div className="flex min-h-[300px] items-center justify-center p-8">
        <div className="max-w-md space-y-4 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <div className="space-y-2">
            <h3 className="font-medium text-foreground text-lg">
              Content unavailable
            </h3>
            <p className="text-muted-foreground text-sm">
              {postSlug
                ? `Unable to load content for "${postSlug}". Please try refreshing the page.`
                : "Unable to load this content. Please try refreshing the page."}
            </p>
          </div>
        </div>
      </div>
    );
  }, [errorFallback, postSlug]);

  // Memoize the loading component
  const memoizedLoadingComponent = useMemo(
    () => <LoadingComponent />,
    [LoadingComponent]
  );

  // Wrap content for findings posts with additional hydration stability
  const wrapContent = (content: React.ReactNode) => {
    if (isFindingsPost) {
      return (
        <StableContentWrapper loadingFallback={memoizedLoadingComponent}>
          {content}
        </StableContentWrapper>
      );
    }
    return content;
  };

  // If lazy loading is disabled, just wrap with error boundary and suspense
  if (!enableLazyLoading) {
    return (
      <ErrorBoundary
        fallback={memoizedErrorFallback}
        resetKeys={postSlug ? [postSlug] : undefined}
      >
        <Suspense fallback={memoizedLoadingComponent}>
          {wrapContent(<MemoizedContent>{children}</MemoizedContent>)}
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Full lazy loading with dynamic import
  return (
    <ErrorBoundary
      fallback={memoizedErrorFallback}
      resetKeys={postSlug ? [postSlug] : undefined}
    >
      <Suspense fallback={memoizedLoadingComponent}>
        <LazyComponent>
          {wrapContent(<MemoizedContent>{children}</MemoizedContent>)}
        </LazyComponent>
      </Suspense>
    </ErrorBoundary>
  );
}

// Hook for preloading content (useful for link hover)
export function usePreloadContent() {
  const preloadContent = React.useCallback(
    (componentImport: () => Promise<React.ComponentType<unknown>>) => {
      // Preload the component when user hovers over a link
      // Silently ignore preload errors - they're not critical
      componentImport().catch(() => {
        // Preload failed, but this is not critical to user experience
      });
    },
    []
  );

  return { preloadContent };
}

// Higher-order component for automatic lazy wrapping
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    loadingComponent?: React.ComponentType;
    errorFallback?: React.ReactNode;
    enableLazyLoading?: boolean;
  }
) {
  const WrappedComponent = (props: P) => (
    <LazyMDXWrapper {...options}>
      <Component {...props} />
    </LazyMDXWrapper>
  );

  WrappedComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Intersection Observer hook for lazy loading on scroll
export function useLazyLoad(options?: IntersectionObserverInit) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const elementRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element || hasLoaded) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasLoaded, options]);

  return { elementRef, isIntersecting, hasLoaded };
}
