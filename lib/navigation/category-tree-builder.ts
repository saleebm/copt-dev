import type { CategoryEmbedding } from "@/lib/generated/prisma";
import type { CategoryNode, PostTypeDistribution } from "@/types/navigation";

interface CategoryData {
  displayName: string; // human-readable name for display
  name: string; // kebab-case name matching CategoryEmbedding
  postCount: number;
  postTypes: Record<string, number>;
}

/**
 * Builds a hierarchical tree structure from flat CategoryEmbedding records
 * Handles orphaned categories and calculates aggregated post counts
 */
export class CategoryTreeBuilder {
  private readonly embeddings: Map<string, CategoryEmbedding>;
  private readonly categoryData: Map<string, CategoryData>;
  private readonly nodeCache: Map<string, CategoryNode>;

  constructor(embeddings: CategoryEmbedding[], categoryData: CategoryData[]) {
    this.embeddings = new Map(embeddings.map((e) => [e.path, e]));
    this.categoryData = new Map(categoryData.map((c) => [c.name, c]));
    this.nodeCache = new Map();
  }

  /**
   * Builds the complete category tree
   */
  buildTree(): CategoryNode[] {
    const roots: CategoryNode[] = [];
    const orphans: CategoryNode[] = [];

    // First pass: Create all nodes
    for (const [path, embedding] of this.embeddings) {
      this.createNode(path, embedding);
    }

    // Second pass: Build hierarchy
    for (const [path, node] of this.nodeCache) {
      const embedding = this.embeddings.get(path)!;

      if (embedding.parentPath) {
        // Find parent
        const parent = this.nodeCache.get(embedding.parentPath);

        if (parent) {
          parent.children.push(node);
        } else {
          // Parent doesn't exist - treat as orphan
          orphans.push(node);
        }
      } else {
        // Root node
        roots.push(node);
      }
    }

    // Third pass: Calculate aggregated counts
    for (const root of roots) {
      this.calculateTotalCounts(root);
    }
    for (const orphan of orphans) {
      this.calculateTotalCounts(orphan);
    }

    // Sort roots and orphans alphabetically
    const sortedRoots = this.sortNodes(roots);
    const sortedOrphans = this.sortNodes(orphans);

    // Return roots first, then orphans
    return [...sortedRoots, ...sortedOrphans];
  }

  /**
   * Creates a single CategoryNode from CategoryEmbedding
   */
  private createNode(path: string, embedding: CategoryEmbedding): CategoryNode {
    if (this.nodeCache.has(path)) {
      return this.nodeCache.get(path)!;
    }

    // Match using the kebab-case name (embedding.name matches category.name)
    const categoryInfo = this.categoryData.get(embedding.name);
    const postCount = categoryInfo?.postCount || 0;
    const postTypes = this.convertToPostTypeDistribution(
      categoryInfo?.postTypes || {}
    );

    const node: CategoryNode = {
      id: embedding.id,
      name: embedding.name, // Keep kebab-case for internal use
      displayName: categoryInfo?.displayName || embedding.name, // Use displayName for UI
      slug: embedding.name, // Using kebab-case name as slug
      path: embedding.path,
      parentPath: embedding.parentPath,
      depth: embedding.depth,
      postCount,
      totalPostCount: postCount, // Will be updated in calculateTotalCounts
      children: [],
      embedding,
      postTypes,
      isExpanded: false,
      isActive: false,
    };

    this.nodeCache.set(path, node);
    return node;
  }

  /**
   * Converts post type counts to PostTypeDistribution
   */
  private convertToPostTypeDistribution(
    postTypes: Record<string, number>
  ): PostTypeDistribution {
    return {
      CONCRETE: postTypes.CONCRETE || 0,
      BLOG: postTypes.BLOG || 0,
      FINDING: postTypes.FINDING || 0,
      SIGHT: postTypes.SIGHT || 0,
    };
  }

  /**
   * Recursively calculates total post counts including children
   */
  private calculateTotalCounts(node: CategoryNode): number {
    let total = node.postCount;

    // Add counts from all children
    node.children.forEach((child) => {
      total += this.calculateTotalCounts(child);
    });

    // Update the node's total count
    node.totalPostCount = total;

    // Also update post type distribution to include children
    if (node.children.length > 0) {
      const childDistribution: PostTypeDistribution = {
        CONCRETE: 0,
        BLOG: 0,
        FINDING: 0,
        SIGHT: 0,
      };

      node.children.forEach((child) => {
        if (child.postTypes) {
          childDistribution.CONCRETE += child.postTypes.CONCRETE;
          childDistribution.BLOG += child.postTypes.BLOG;
          childDistribution.FINDING += child.postTypes.FINDING;
          childDistribution.SIGHT += child.postTypes.SIGHT;
        }
      });

      // Add child counts to current node's distribution
      if (node.postTypes) {
        node.postTypes.CONCRETE += childDistribution.CONCRETE;
        node.postTypes.BLOG += childDistribution.BLOG;
        node.postTypes.FINDING += childDistribution.FINDING;
        node.postTypes.SIGHT += childDistribution.SIGHT;
      }
    }

    return total;
  }

  /**
   * Sorts nodes alphabetically and recursively sorts their children
   */
  private sortNodes(nodes: CategoryNode[]): CategoryNode[] {
    return nodes
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((node) => ({
        ...node,
        children: this.sortNodes(node.children),
      }));
  }

  /**
   * Finds a node by its path
   */
  findNodeByPath(path: string): CategoryNode | undefined {
    return this.nodeCache.get(path);
  }

  /**
   * Finds all nodes matching a search query
   */
  searchNodes(query: string): CategoryNode[] {
    const results: CategoryNode[] = [];
    const lowerQuery = query.toLowerCase();

    for (const node of this.nodeCache.values()) {
      if (
        node.name.toLowerCase().includes(lowerQuery) ||
        node.path.toLowerCase().includes(lowerQuery)
      ) {
        results.push(node);
      }
    }

    return results;
  }

  /**
   * Gets all ancestor paths for a given path
   */
  getAncestorPaths(path: string): string[] {
    const ancestors: string[] = [];
    let current = this.nodeCache.get(path);

    while (current?.parentPath) {
      ancestors.push(current.parentPath);
      current = this.nodeCache.get(current.parentPath);
    }

    return ancestors.reverse(); // Return from root to immediate parent
  }

  /**
   * Gets all descendant nodes for a given path
   */
  getDescendants(path: string): CategoryNode[] {
    const node = this.nodeCache.get(path);
    if (!node) {
      return [];
    }

    const descendants: CategoryNode[] = [];
    const queue = [...node.children];

    while (queue.length > 0) {
      const current = queue.shift()!;
      descendants.push(current);
      queue.push(...current.children);
    }

    return descendants;
  }

  /**
   * Prunes empty categories from the tree
   */
  pruneEmpty(): CategoryNode[] {
    const roots = this.buildTree();
    return this.pruneEmptyNodes(roots);
  }

  private pruneEmptyNodes(nodes: CategoryNode[]): CategoryNode[] {
    return nodes
      .map((node) => ({
        ...node,
        children: this.pruneEmptyNodes(node.children),
      }))
      .filter((node) => node.totalPostCount > 0 || node.children.length > 0);
  }

  /**
   * Expands nodes up to a certain depth
   */
  expandToDepth(maxDepth: number): Set<string> {
    const expanded = new Set<string>();

    for (const node of this.nodeCache.values()) {
      if (node.depth < maxDepth) {
        expanded.add(node.path);
      }
    }

    return expanded;
  }

  /**
   * Gets statistics about the tree
   */
  getTreeStats(): {
    totalCategories: number;
    maxDepth: number;
    totalPosts: number;
    averagePostsPerCategory: number;
    emptyCategories: number;
  } {
    let maxDepth = 0;
    let totalPosts = 0;
    let emptyCategories = 0;

    for (const node of this.nodeCache.values()) {
      maxDepth = Math.max(maxDepth, node.depth);
      totalPosts += node.postCount;
      if (node.postCount === 0) {
        emptyCategories++;
      }
    }

    return {
      totalCategories: this.nodeCache.size,
      maxDepth,
      totalPosts,
      averagePostsPerCategory:
        this.nodeCache.size > 0 ? totalPosts / this.nodeCache.size : 0,
      emptyCategories,
    };
  }
}

/**
 * Helper function to flatten a tree back to a list
 */
export function flattenCategoryTree(nodes: CategoryNode[]): CategoryNode[] {
  const flat: CategoryNode[] = [];
  const queue = [...nodes];

  while (queue.length > 0) {
    const current = queue.shift()!;
    flat.push(current);
    queue.push(...current.children);
  }

  return flat;
}

/**
 * Helper function to find the path to a specific node
 */
export function findPathToNode(
  nodes: CategoryNode[],
  targetPath: string
): string[] | null {
  for (const node of nodes) {
    if (node.path === targetPath) {
      return [node.path];
    }

    const childPath = findPathToNode(node.children, targetPath);
    if (childPath) {
      return [node.path, ...childPath];
    }
  }

  return null;
}
