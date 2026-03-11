"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/types/navigation";

interface CategoryBreadcrumbsProps {
  category: CategoryNode;
  className?: string;
  onNavigate: (category: CategoryNode | null) => void;
}

export function CategoryBreadcrumbs({
  category,
  onNavigate,
  className,
}: CategoryBreadcrumbsProps) {
  // Build the breadcrumb trail from the category path
  const pathSegments = category.path.split("/").filter(Boolean);

  // Create clickable breadcrumb items
  const breadcrumbs = pathSegments.map((segment, index) => {
    const isLast = index === pathSegments.length - 1;
    const currentPath = pathSegments.slice(0, index + 1).join("/");

    return (
      <React.Fragment key={currentPath}>
        {index > 0 && <span className="mx-1 text-white/30">/</span>}
        {isLast ? (
          <span className="text-white/90">{segment}</span>
        ) : (
          <button
            aria-label={`Navigate to ${segment}`}
            className="terminal-interactive transition-colors hover:text-white/90"
            onClick={() => {
              // For now, we can't navigate to parent categories directly
              // This would require passing the full category tree
              // So we'll just go back to the root for now
              if (index === 0) {
                onNavigate(null);
              }
            }}
            type="button"
          >
            {segment}
          </button>
        )}
      </React.Fragment>
    );
  });

  return (
    <div
      className={cn(
        "flex items-center font-mono text-white/60 text-xs",
        className
      )}
    >
      <button
        aria-label="Navigate to root"
        className="terminal-interactive mr-1 transition-colors hover:text-white/90"
        onClick={() => onNavigate(null)}
        type="button"
      >
        ~/topics
      </button>
      {pathSegments.length > 0 && (
        <>
          <span className="mx-1 text-white/30">/</span>
          {breadcrumbs}
        </>
      )}
    </div>
  );
}
