"use client";

import { ArrowLeftIcon, CalendarIcon, Loader2Icon } from "lucide-react";
import type React from "react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { formatDateSmart } from "@/lib/date-utils";
import { PostType } from "@/lib/generated/prisma";
import { cn } from "@/lib/utils";

// Generic drilldown item for categories, tags, etc.
interface DrilldownListItemProps {
  ariaLabel?: string;
  count: number;
  icon: React.ReactNode;
  name: string;
  onClick: () => void;
}

export const DrilldownListItem: React.FC<DrilldownListItemProps> = ({
  icon,
  name,
  count,
  onClick,
  ariaLabel,
}) => (
  <Button
    aria-label={ariaLabel || `View ${count} items for ${name}`}
    className={cn(
      "h-auto w-full min-w-0 justify-between overflow-hidden p-3 text-left font-mono transition-all duration-200",
      "hover:bg-accent/50 focus:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/30",
      "border border-transparent hover:border-border/50"
    )}
    onClick={onClick}
    variant="ghost"
  >
    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
      {icon}
      <span className="truncate font-medium text-sm">{name}</span>
    </div>
    <span className="flex-shrink-0 rounded-full bg-muted px-2 py-1 font-mono text-muted-foreground text-xs">
      {count}
    </span>
  </Button>
);

// Generic post item for displaying in lists
interface PostForNavigation {
  categories?: Array<{ name: string }>;
  id: string;
  lastEdited: Date;
  slug: string;
  tags?: Array<{ name: string }>;
  title: string;
  type: PostType;
}

interface PostListItemProps {
  onClick: (post: PostForNavigation) => void;
  post: PostForNavigation;
}

export const PostListItem: React.FC<PostListItemProps> = ({
  post,
  onClick,
}) => {
  const formatDate = useCallback((date: Date) => formatDateSmart(date), []);

  return (
    <Button
      aria-label={`Open post: ${post.title}`}
      className={cn(
        "h-auto w-full p-3 text-left font-mono transition-all duration-200",
        "hover:bg-accent/50 focus:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/30",
        "border border-transparent hover:border-border/50"
      )}
      onClick={() => onClick(post)}
      title={post.title}
      variant="ghost"
    >
      <div className="w-full space-y-2">
        <div className="w-full">
          <span className="block whitespace-normal break-words font-medium text-sm leading-relaxed">
            {post.title}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "flex-shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 font-medium font-mono text-xs",
                (() => {
                  if (post.type === PostType.CONCRETE) {
                    return "post-type-concrete";
                  }
                  if (post.type === PostType.FINDING) {
                    return "post-type-finding";
                  }
                  return "post-type-blog";
                })()
              )}
            >
              {post.type}
            </span>
            {post.categories && post.categories.length > 0 && (
              <span className="flex-shrink-0 whitespace-nowrap rounded bg-muted/50 px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
                {post.categories[0].name}
                {post.categories.length > 1 &&
                  ` +${post.categories.length - 1}`}
              </span>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-1 whitespace-nowrap font-mono text-muted-foreground text-xs">
            <CalendarIcon className="h-3 w-3" />
            <span>{formatDate(post.lastEdited)}</span>
          </div>
        </div>
      </div>
    </Button>
  );
};

// Generic back button
interface BackButtonProps {
  ariaLabel?: string;
  onClick: () => void;
  text: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  text,
  ariaLabel,
}) => (
  <Button
    aria-label={ariaLabel || `Return to ${text}`}
    className={cn(
      "h-8 w-full justify-start gap-2 font-mono text-muted-foreground transition-all duration-200 hover:text-foreground",
      "focus:outline-none focus:ring-2 focus:ring-primary/30"
    )}
    onClick={onClick}
    variant="ghost"
  >
    <ArrowLeftIcon className="h-3 w-3" />
    <span className="text-sm">{text}</span>
  </Button>
);

// Generic loading state component
interface LoadingStateProps {
  message: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message }) => (
  <div className="flex items-center justify-center py-8">
    <div className="flex items-center gap-2 font-mono text-muted-foreground">
      <Loader2Icon className="h-4 w-4 animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  </div>
);

// Generic error state component
interface ErrorStateProps {
  message: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message }) => (
  <div className="flex items-center justify-center py-8">
    <div className="text-center font-mono">
      <div className="mb-2 text-destructive">{"{ ERROR }"}</div>
      <p className="text-destructive text-sm">{message}</p>
    </div>
  </div>
);

// Generic empty state component
interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, message }) => (
  <div className="flex items-center justify-center py-8">
    <div className="text-center font-mono">
      {icon && <div className="mb-2 text-muted-foreground/50">{icon}</div>}
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  </div>
);

// Generic search empty state component
interface SearchEmptyStateProps {
  searchTerm: string;
}

export const SearchEmptyState: React.FC<SearchEmptyStateProps> = ({
  searchTerm,
}) => (
  <div className="flex items-center justify-center py-8">
    <div className="text-center font-mono">
      <div className="mb-2 text-muted-foreground">{"{ 0 }"}</div>
      <p className="text-muted-foreground text-sm">
        No results match &ldquo;{searchTerm}&rdquo;
      </p>
    </div>
  </div>
);

// Generic two-panel layout with sliding animation
interface TwoPanelLayoutProps {
  ariaLabel?: string;
  firstPanel: React.ReactNode;
  isSecondPanelActive: boolean;
  secondPanel: React.ReactNode;
}

export const TwoPanelLayout: React.FC<TwoPanelLayoutProps> = ({
  isSecondPanelActive,
  firstPanel,
  secondPanel,
  ariaLabel,
}) => (
  <div className="h-full overflow-hidden">
    <section
      aria-label={ariaLabel || "Navigation with sliding panels"}
      className="flex h-full transition-transform duration-300 ease-out"
      style={{
        transform: isSecondPanelActive ? "translateX(-50%)" : "translateX(0)",
        width: "200%",
      }}
    >
      <div className="w-1/2" role="tabpanel">
        {firstPanel}
      </div>
      <div className="w-1/2" role="tabpanel">
        {secondPanel}
      </div>
    </section>
  </div>
);

// Generic navigation panel wrapper
interface NavigationPanelProps {
  children: React.ReactNode;
  className?: string;
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  children,
  className,
}) => <div className={cn("space-y-4 p-4", className)}>{children}</div>;

// Generic item count display
interface ItemCountDisplayProps {
  count: number;
  filteredCount?: number;
  icon: React.ReactNode;
  itemType: string;
  searchTerm?: string;
}

export const ItemCountDisplay: React.FC<ItemCountDisplayProps> = ({
  icon,
  count,
  filteredCount,
  itemType,
  searchTerm,
}) => {
  const displayText =
    searchTerm && filteredCount !== undefined
      ? `${filteredCount} of ${count} ${itemType}${count === 1 ? "" : "s"}`
      : `${count} ${itemType}${count === 1 ? "" : "s"}`;

  return (
    <div className="flex items-center gap-2 font-mono text-muted-foreground text-xs">
      {icon}
      <span>{displayText}</span>
    </div>
  );
};

// Export type for external use
export type { PostForNavigation };
