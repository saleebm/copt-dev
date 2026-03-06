"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import React, { Component, type ReactNode } from "react";

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when props change (if enabled)
    if (
      hasError &&
      resetOnPropsChange &&
      prevProps.children !== this.props.children
    ) {
      this.resetErrorBoundary();
    }

    // Reset error boundary when reset keys change
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (resetKey, idx) => prevProps.resetKeys?.[idx] !== resetKey
      );
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }, 100);
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="max-w-md space-y-6 text-center">
            <div className="relative">
              <AlertTriangle className="mx-auto h-16 w-16 text-destructive opacity-80" />
              <div className="absolute inset-0 mx-auto h-16 w-16 animate-ping rounded-full border-2 border-destructive/20" />
            </div>

            <div className="space-y-2">
              <h2 className="font-semibold text-foreground text-xl">
                Something went wrong
              </h2>
              <p className="text-muted-foreground text-sm">
                {error?.message ||
                  "An unexpected error occurred while rendering this content."}
              </p>
            </div>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                onClick={this.resetErrorBoundary}
                type="button"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>

              <Link
                className="inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2 font-medium text-secondary-foreground text-sm transition-colors hover:bg-secondary/80"
                href="/"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </div>

            {process.env.NODE_ENV === "development" && error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer font-medium text-muted-foreground text-sm hover:text-foreground">
                  Error Details (Development)
                </summary>
                <div className="mt-2 rounded-md bg-muted p-4 font-mono text-xs">
                  <div className="mb-2 font-semibold text-destructive">
                    {error.name}: {error.message}
                  </div>
                  <pre className="whitespace-pre-wrap text-muted-foreground">
                    {error.stack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
  const ComponentWithBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithBoundary;
}

// Hook for resetting error boundaries from inside components
export function useErrorBoundary() {
  const [, setState] = React.useState();

  return React.useCallback((error: Error) => {
    setState(() => {
      throw error;
    });
  }, []);
}
