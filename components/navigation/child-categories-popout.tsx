"use client";

import React, { useEffect, useRef, useState } from "react";
import { PostType } from "@/lib/generated/prisma";
import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/types/navigation";

type ChildCategoriesPopoutProps = {
  category: CategoryNode;
  onCategoryClick: (category: CategoryNode) => void;
  selectedPostTypes: PostType[];
  className?: string;
};

export function ChildCategoriesPopout({
  category,
  onCategoryClick,
  selectedPostTypes,
  className,
}: ChildCategoriesPopoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
  const popoutRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Filter children by selected post types
  const filteredChildren = React.useMemo(() => {
    if (!category.children || category.children.length === 0) {
      return [];
    }

    return category.children.filter((child) => {
      const selectedTypeCount = selectedPostTypes.reduce(
        (sum, type) => sum + (child.postTypes?.[type] || 0),
        0
      );
      return selectedTypeCount > 0;
    });
  }, [category.children, selectedPostTypes]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoutRef.current &&
        !popoutRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isOpen]);

  const toggleChildExpanded = (childPath: string) => {
    setExpandedChildren((prev) => {
      const next = new Set(prev);
      if (next.has(childPath)) {
        next.delete(childPath);
      } else {
        next.add(childPath);
      }
      return next;
    });
  };

  const renderCategoryItem = (
    node: CategoryNode,
    depth = 0
  ): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedChildren.has(node.path);

    // Calculate post count for selected types
    const selectedTypeCount = selectedPostTypes.reduce(
      (sum, type) => sum + (node.postTypes?.[type] || 0),
      0
    );

    // Get post type breakdown
    const postTypeDisplay = selectedPostTypes
      .filter((type) => node.postTypes?.[type])
      .map((type) => {
        const count = node.postTypes?.[type];
        let abbr = "S";
        if (type === PostType.CONCRETE) {
          abbr = "C";
        } else if (type === PostType.BLOG) {
          abbr = "B";
        } else if (type === PostType.FINDING) {
          abbr = "F";
        }
        return `${abbr}:${count}`;
      })
      .join(" ");

    return (
      <div className="w-full" key={node.path}>
        <div
          className={cn(
            "flex items-center justify-between px-2 py-1",
            "cursor-pointer transition-colors hover:bg-white/5",
            "font-mono text-xs"
          )}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          <div className="flex flex-1 items-center gap-2">
            {hasChildren && (
              <button
                aria-label={isExpanded ? "Collapse" : "Expand"}
                className="text-white/40 hover:text-white/60"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleChildExpanded(node.path);
                }}
                type="button"
              >
                {isExpanded ? "▼" : "▶"}
              </button>
            )}
            <button
              className="flex flex-1 items-center gap-2 text-left hover:text-white/90"
              onClick={() => {
                onCategoryClick(node);
                setIsOpen(false);
              }}
              type="button"
            >
              <span className="text-white/40">•</span>
              <span>{node.name}</span>
              {postTypeDisplay && (
                <span className="text-[10px] text-white/40">
                  [{postTypeDisplay}]
                </span>
              )}
              <span className="ml-auto text-white/40">{selectedTypeCount}</span>
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-3 border-white/10 border-l">
            {node.children?.map((child) =>
              renderCategoryItem(child, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (filteredChildren.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        aria-label="Show subcategories"
        className={cn(
          "px-2 py-1 font-mono text-xs",
          "border border-white/20 hover:border-white/40",
          "bg-black hover:bg-white/5",
          "transition-all duration-200",
          "flex items-center gap-1",
          isOpen && "border-white/40 bg-white/5"
        )}
        onClick={() => setIsOpen(!isOpen)}
        ref={buttonRef}
        type="button"
      >
        <span className="text-white/60">▸</span>
        <span>Subcategories</span>
        <span className="text-white/40">({filteredChildren.length})</span>
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1 min-w-[240px] max-w-[360px]",
            "border border-white/20 bg-black",
            "shadow-black/50 shadow-lg",
            "fade-in-0 zoom-in-95 animate-in duration-200",
            "custom-scrollbar max-h-[400px] overflow-y-auto"
          )}
          ref={popoutRef}
        >
          <div className="border-white/10 border-b p-2">
            <div className="font-mono text-white/40 text-xs">
              <span className="terminal-prompt">❯</span>
              <span className="ml-1">./subcategories</span>
            </div>
          </div>

          <div className="py-1">
            {filteredChildren.map((child) => renderCategoryItem(child))}
          </div>

          <div className="border-white/10 border-t p-2 font-mono text-[10px] text-white/30">
            <div className="flex justify-between">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
