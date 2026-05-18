"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import navStyles from "@/styles/navigation.module.css";
import type { CategoryNode } from "@/types/navigation";

interface CategoryTreeProps {
  categories: CategoryNode[];
  className?: string;
  /** Auto-expand top-level nodes up to this depth (0-indexed). 0 = top-level expanded. */
  defaultExpandDepth?: number;
  /** External control of expanded paths. When provided, replaces internal state. */
  expandedPaths?: ReadonlySet<string> | string[];
  onCategoryClick?: (category: CategoryNode) => void;
  onNavigate?: () => void;
  /** Called when a node is toggled. When provided, used together with `expandedPaths`. */
  onToggleExpand?: (path: string) => void;
  /** Show post-type breakdown indicators ([F:3 B:2]). Hidden by default. */
  showPostTypeBreakdown?: boolean;
}

interface CategoryNodeItemProps {
  depth: number;
  expandedNodes: ReadonlySet<string>;
  isLast?: boolean;
  node: CategoryNode;
  onNavigate?: () => void;
  onNodeClick: (node: CategoryNode) => void;
  onToggleExpand: (path: string) => void;
  parentPrefix?: string;
  showPostTypeBreakdown: boolean;
}

function CategoryNodeItem({
  node,
  depth,
  expandedNodes,
  onToggleExpand,
  onNodeClick,
  onNavigate,
  isLast = false,
  parentPrefix = "",
  showPostTypeBreakdown,
}: CategoryNodeItemProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.path);

  const getPostTypeIndicator = () => {
    if (!(showPostTypeBreakdown && node.postTypes)) {
      return null;
    }
    const types: string[] = [];
    if (node.postTypes.FINDING > 0) {
      types.push(`F:${node.postTypes.FINDING}`);
    }
    if (node.postTypes.SIGHT > 0) {
      types.push(`S:${node.postTypes.SIGHT}`);
    }
    if (node.postTypes.BLOG > 0) {
      types.push(`B:${node.postTypes.BLOG}`);
    }
    if (node.postTypes.CONCRETE > 0) {
      types.push(`C:${node.postTypes.CONCRETE}`);
    }
    if (types.length === 0) {
      return null;
    }
    return (
      <span className="ml-2 font-mono text-white/30 text-xs">
        [{types.join(" ")}]
      </span>
    );
  };

  const handleExpandClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        onToggleExpand(node.path);
      }
    },
    [hasChildren, node.path, onToggleExpand]
  );

  const handleNodeClick = useCallback(() => {
    onNodeClick(node);
    onNavigate?.();
  }, [node, onNodeClick, onNavigate]);

  const handleNodeKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onNodeClick(node);
        onNavigate?.();
      }
    },
    [node, onNodeClick, onNavigate]
  );

  return (
    <>
      <div
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-label={`${node.displayName || node.name} category with ${node.totalPostCount} posts`}
        className={cn(
          navStyles.nodeRow,
          "group min-h-[44px] cursor-pointer select-none font-mono text-xs",
          node.isActive && "terminal-active-item"
        )}
        onClick={handleNodeClick}
        onKeyDown={handleNodeKeyDown}
        role="treeitem"
        tabIndex={0}
      >
        <div className="flex w-full items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center">
            {depth > 0 && (
              <span className="select-none whitespace-pre font-mono text-muted-foreground">
                {parentPrefix}
                {isLast ? "└── " : "├── "}
              </span>
            )}

            {hasChildren && (
              <button
                aria-label={isExpanded ? "Collapse" : "Expand"}
                className="mr-1 inline-flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-primary/90 focus:outline-none"
                onClick={handleExpandClick}
                type="button"
              >
                <span className="text-xs">{isExpanded ? "▼" : "▶"}</span>
              </button>
            )}

            {!hasChildren && (
              <span className="mr-1 inline-flex h-4 w-4 items-center justify-center text-muted-foreground">
                •
              </span>
            )}
            <span className="truncate">{node.displayName || node.name}</span>
            {getPostTypeIndicator()}
          </div>
          <div className="ml-2 flex flex-shrink-0 items-center gap-2">
            {node.totalPostCount > 0 && (
              <span className="text-muted-foreground text-xs">
                {node.totalPostCount}{" "}
                {node.totalPostCount === 1 ? "post" : "posts"}
              </span>
            )}
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className={cn(navStyles.children)}>
          {node.children.map((child, index) => {
            const isChildLast = index === node.children.length - 1;
            const childPrefix =
              depth > 0 ? parentPrefix + (isLast ? "    " : "│   ") : "";

            return (
              <CategoryNodeItem
                depth={depth + 1}
                expandedNodes={expandedNodes}
                isLast={isChildLast}
                key={child.path}
                node={child}
                onNavigate={onNavigate}
                onNodeClick={onNodeClick}
                onToggleExpand={onToggleExpand}
                parentPrefix={childPrefix}
                showPostTypeBreakdown={showPostTypeBreakdown}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

function collectInitialExpansion(
  categories: CategoryNode[],
  defaultDepth: number
): Set<string> {
  const out = new Set<string>();
  const walk = (nodes: CategoryNode[], depth: number) => {
    for (const node of nodes) {
      if (depth <= defaultDepth && node.children.length > 0) {
        out.add(node.path);
      }
      if (depth < defaultDepth) {
        walk(node.children, depth + 1);
      }
    }
  };
  walk(categories, 0);
  return out;
}

export function CategoryTree({
  categories,
  onCategoryClick,
  onNavigate,
  className,
  defaultExpandDepth = 0,
  expandedPaths,
  onToggleExpand,
  showPostTypeBreakdown = false,
}: CategoryTreeProps) {
  const isControlled =
    expandedPaths !== undefined && onToggleExpand !== undefined;

  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(() =>
    collectInitialExpansion(categories, defaultExpandDepth)
  );
  const [hasSeededControlled, setHasSeededControlled] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(showPostTypeBreakdown);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Seed controlled persisted state with depth-1 expansion when empty.
  useEffect(() => {
    if (!isControlled || hasSeededControlled || defaultExpandDepth < 0) {
      return;
    }
    const incoming = Array.isArray(expandedPaths)
      ? expandedPaths
      : Array.from(expandedPaths ?? []);
    if (incoming.length === 0 && categories.length > 0 && onToggleExpand) {
      const seed = collectInitialExpansion(categories, defaultExpandDepth);
      for (const path of seed) {
        onToggleExpand(path);
      }
    }
    setHasSeededControlled(true);
  }, [
    isControlled,
    hasSeededControlled,
    expandedPaths,
    categories,
    defaultExpandDepth,
    onToggleExpand,
  ]);

  const expandedNodes = useMemo<ReadonlySet<string>>(() => {
    if (isControlled) {
      return expandedPaths instanceof Set
        ? (expandedPaths as ReadonlySet<string>)
        : new Set(expandedPaths);
    }
    return internalExpanded;
  }, [isControlled, expandedPaths, internalExpanded]);

  const handleToggleExpand = useCallback(
    (path: string) => {
      if (isControlled) {
        onToggleExpand?.(path);
        return;
      }
      setInternalExpanded((prev) => {
        const next = new Set(prev);
        const findNode = (
          nodes: CategoryNode[],
          targetPath: string
        ): CategoryNode | null => {
          for (const node of nodes) {
            if (node.path === targetPath) {
              return node;
            }
            const found = findNode(node.children, targetPath);
            if (found) {
              return found;
            }
          }
          return null;
        };
        const targetNode = findNode(categories, path);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
          if (targetNode) {
            const autoExpandChildren = (node: CategoryNode) => {
              node.children.forEach((child) => {
                if (child.postCount === 0 && child.children.length > 0) {
                  next.add(child.path);
                  autoExpandChildren(child);
                }
              });
            };
            autoExpandChildren(targetNode);
          }
        }
        return next;
      });
    },
    [isControlled, onToggleExpand, categories]
  );

  const handleNodeClick = useCallback(
    (node: CategoryNode) => {
      setSelectedNode(node.path);
      onCategoryClick?.(node);
    },
    [onCategoryClick]
  );

  const handleExpandAll = useCallback(() => {
    const allPaths = new Set<string>();
    const collectPaths = (nodes: CategoryNode[]) => {
      nodes.forEach((node) => {
        if (node.children.length > 0) {
          allPaths.add(node.path);
          collectPaths(node.children);
        }
      });
    };
    collectPaths(categories);
    if (isControlled && onToggleExpand) {
      const current =
        expandedPaths instanceof Set
          ? expandedPaths
          : new Set(expandedPaths ?? []);
      allPaths.forEach((path) => {
        if (!current.has(path)) {
          onToggleExpand(path);
        }
      });
    } else {
      setInternalExpanded(allPaths);
    }
  }, [categories, isControlled, onToggleExpand, expandedPaths]);

  const handleCollapseAll = useCallback(() => {
    if (isControlled && onToggleExpand) {
      const current =
        expandedPaths instanceof Set
          ? expandedPaths
          : new Set(expandedPaths ?? []);
      for (const path of current) {
        onToggleExpand(path);
      }
    } else {
      setInternalExpanded(new Set());
    }
  }, [isControlled, onToggleExpand, expandedPaths]);

  const stats = useMemo(() => {
    let totalCategories = 0;
    let totalPosts = 0;
    let maxDepth = 0;
    const calculateStats = (nodes: CategoryNode[], depth = 0) => {
      nodes.forEach((node) => {
        totalCategories++;
        totalPosts += node.postCount;
        maxDepth = Math.max(maxDepth, depth);
        if (node.children.length > 0) {
          calculateStats(node.children, depth + 1);
        }
      });
    };
    calculateStats(categories);
    return { totalCategories, totalPosts, maxDepth };
  }, [categories]);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="border-white/10 border-b p-3">
        <div className="text-white/60 text-xs">
          {stats.totalCategories} topics • {stats.totalPosts} posts
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <button
            aria-label="Expand all topics"
            className="min-h-[44px] text-white/60 transition-colors hover:text-white/90"
            onClick={handleExpandAll}
            type="button"
          >
            [expand]
          </button>
          <button
            aria-label="Collapse all topics"
            className="min-h-[44px] text-white/40 transition-colors hover:text-white/60"
            onClick={handleCollapseAll}
            type="button"
          >
            [collapse]
          </button>
          <button
            aria-label={
              showBreakdown
                ? "Hide post type breakdown"
                : "Show post type breakdown"
            }
            aria-pressed={showBreakdown}
            className="min-h-[44px] text-white/40 transition-colors hover:text-white/70"
            onClick={() => setShowBreakdown((prev) => !prev)}
            type="button"
          >
            {showBreakdown ? "[hide types]" : "[types]"}
          </button>
        </div>
      </div>

      {/* Category tree */}
      <div className={cn("flex-1 overflow-y-auto", navStyles.categoryTree)}>
        {categories.length === 0 ? (
          <div className="p-4 text-center text-white/40 text-xs">
            <span className="mb-2 block">∅</span>
            <span>No topics found</span>
          </div>
        ) : (
          <div className="py-0">
            {categories.map((node, index) => (
              <CategoryNodeItem
                depth={0}
                expandedNodes={expandedNodes}
                isLast={index === categories.length - 1}
                key={node.path}
                node={node}
                onNavigate={onNavigate}
                onNodeClick={handleNodeClick}
                onToggleExpand={handleToggleExpand}
                parentPrefix=""
                showPostTypeBreakdown={showBreakdown}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0 border-white/10 border-t p-3">
        <div className="flex items-center justify-between text-white/40 text-xs">
          <span>{selectedNode ? `selected: ${selectedNode}` : "ready"}</span>
          <span className="terminal-prompt">depth: {stats.maxDepth}</span>
        </div>
      </div>
    </div>
  );
}
