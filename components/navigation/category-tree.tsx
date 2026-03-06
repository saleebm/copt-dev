"use client";

import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import navStyles from "@/styles/navigation.module.css";
import type { CategoryNode } from "@/types/navigation";

type CategoryTreeProps = {
  categories: CategoryNode[];
  onCategoryClick?: (category: CategoryNode) => void;
  onNavigate?: () => void;
  className?: string;
};

type CategoryNodeItemProps = {
  node: CategoryNode;
  depth: number;
  expandedNodes: Set<string>;
  onToggleExpand: (path: string) => void;
  onNodeClick: (node: CategoryNode) => void;
  onNavigate?: () => void;
  isLast?: boolean;
  parentPrefix?: string;
};

// Recursive component for rendering a single category node and its children
function CategoryNodeItem({
  node,
  depth,
  expandedNodes,
  onToggleExpand,
  onNodeClick,
  onNavigate,
  isLast = false,
  parentPrefix = "",
}: CategoryNodeItemProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.path);

  // Post type indicators
  const getPostTypeIndicator = () => {
    if (!node.postTypes) {
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
    // Always trigger navigation - hierarchical matching may find posts
    // even if the direct category shows 0 posts
    onNodeClick(node);
    onNavigate?.();
  }, [node, onNodeClick, onNavigate]);

  return (
    <>
      <div
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-label={`${node.name} category with ${node.totalPostCount} posts`}
        className={cn(
          navStyles.nodeRow,
          "group cursor-pointer select-none font-mono text-xs",
          node.isActive && "terminal-active-item"
        )}
        onClick={handleNodeClick}
      >
        <div className="flex w-full items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center">
            {/* Render tree structure with proper lines */}
            {depth > 0 && (
              <span className="select-none whitespace-pre font-mono text-muted-foreground">
                {parentPrefix}
                {isLast ? "└── " : "├── "}
              </span>
            )}

            {/* Expandable chevron - separate click target */}
            {hasChildren && (
              <button
                aria-label={isExpanded ? "Collapse" : "Expand"}
                className="mr-1 inline-flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-primary/90 focus:outline-none"
                onClick={handleExpandClick}
                type="button"
              >
                <span className="text-xs">{isExpanded ? "▼" : "▶"}</span>
              </button>
            )}

            {/* Bullet for leaf nodes */}
            {!hasChildren && (
              <span className="mr-1 inline-flex h-4 w-4 items-center justify-center text-muted-foreground">
                •
              </span>
            )}
            <span className="truncate">{node.displayName || node.name}</span>
            {getPostTypeIndicator()}
          </div>
          <div className="ml-2 flex flex-shrink-0 items-center gap-2">
            {node.totalPostCount > node.postCount && (
              <span className="text-muted-foreground text-xs">
                ({node.postCount}+{node.totalPostCount - node.postCount})
              </span>
            )}
            {node.totalPostCount === node.postCount && node.postCount > 0 && (
              <span className="terminal-prompt-muted bg-primary/10 px-1.5 py-0.5 text-xs">
                {node.postCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Render children if expanded */}
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
              />
            );
          })}
        </div>
      )}
    </>
  );
}

export function CategoryTree({
  categories,
  onCategoryClick,
  onNavigate,
  className,
}: CategoryTreeProps) {
  // Start with all nodes collapsed by default
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Helper function to check if a category or its children have posts
  const hasPostsInTree = useCallback((node: CategoryNode): boolean => {
    // Check if this node has posts
    if (node.postCount > 0) {
      return true;
    }

    // Check if any child has posts (recursively)
    return node.children.some((child) => hasPostsInTree(child));
  }, []);

  const handleToggleExpand = useCallback(
    (path: string) => {
      setExpandedNodes((prev) => {
        const next = new Set(prev);

        // Find the node being toggled
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
          // Collapsing - just remove this path
          next.delete(path);
        } else {
          // Expanding - add this path and auto-expand empty folders
          next.add(path);

          // Auto-expand children that don't have posts (empty folders)
          if (targetNode) {
            const autoExpandChildren = (node: CategoryNode) => {
              node.children.forEach((child) => {
                // Auto-expand if this folder has no direct posts and only has subfolders
                if (child.postCount === 0 && child.children.length > 0) {
                  next.add(child.path);
                  // Recursively auto-expand empty subfolders
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
    [categories]
  );

  const handleNodeClick = useCallback(
    (node: CategoryNode) => {
      setSelectedNode(node.path);

      // Always trigger navigation - hierarchical matching may find posts
      // in subcategories even if the direct category has 0 posts
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
    setExpandedNodes(allPaths);
  }, [categories]);

  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // Calculate tree statistics
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
      {/* Terminal header */}
      <div className="border-white/10 border-b p-3">
        <div className="mb-2 flex items-center gap-2 text-white/40 text-xs">
          <span className="terminal-prompt">❯</span>
          <span>./topics --tree</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/60">
            {stats.totalCategories} categories • {stats.totalPosts} posts
          </span>
          <div className="flex gap-2">
            <button
              aria-label="Expand all categories"
              className="terminal-interactive"
              onClick={handleExpandAll}
              type="button"
            >
              [expand]
            </button>
            <button
              aria-label="Collapse all categories"
              className="text-white/40 transition-colors hover:text-white/60"
              onClick={handleCollapseAll}
              type="button"
            >
              [collapse]
            </button>
          </div>
        </div>
      </div>

      {/* Category tree */}
      <div className={cn("flex-1 overflow-y-auto", navStyles.categoryTree)}>
        {categories.length === 0 ? (
          <div className="p-4 text-center text-white/40 text-xs">
            <span className="mb-2 block">∅</span>
            <span>No categories found</span>
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
