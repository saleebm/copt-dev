"use client";

import { Home, RotateCcw, Sidebar, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  usePostStackActions,
  usePostStackState,
} from "@/components/post-stack/post-stack-provider-xstate";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { useNavClick } from "@/hooks/use-nav-click";
import { useKeyboardContext } from "@/lib/keyboard/keyboard-context";
import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/types/navigation";

type PaletteMode = "search" | "browse" | "tags" | "history";

type DrillTarget =
  | { type: "category"; name: string; path: string; displayName: string }
  | { type: "tag"; name: string; slug: string }
  | null;

interface PostManifestEntry {
  categories: string[];
  id: string;
  slug: string;
  tags: string[];
  title: string;
  type: string;
}

let manifestCache: PostManifestEntry[] | null = null;
let manifestPromise: Promise<PostManifestEntry[]> | null = null;

function fetchManifest(): Promise<PostManifestEntry[]> {
  if (manifestCache) {
    return Promise.resolve(manifestCache);
  }
  if (manifestPromise) {
    return manifestPromise;
  }
  manifestPromise = fetch("/api/posts-manifest", { cache: "force-cache" })
    .then((r) => r.json() as Promise<PostManifestEntry[]>)
    .then((data) => {
      manifestCache = data;
      manifestPromise = null;
      return data;
    })
    .catch((e: unknown) => {
      manifestPromise = null;
      throw e;
    });
  return manifestPromise;
}

const MODE_CONFIG = [
  { id: "search" as PaletteMode, label: "search", prefix: "" },
  { id: "browse" as PaletteMode, label: "@browse", prefix: "@" },
  { id: "tags" as PaletteMode, label: "#tags", prefix: "#" },
  { id: "history" as PaletteMode, label: ">history", prefix: ">" },
] as const;

function detectMode(value: string): PaletteMode {
  if (value.startsWith("@")) {
    return "browse";
  }
  if (value.startsWith("#")) {
    return "tags";
  }
  if (value.startsWith(">")) {
    return "history";
  }
  return "search";
}

function placeholderForMode(mode: PaletteMode): string {
  switch (mode) {
    case "search":
      return "Search posts or run a command...";
    case "browse":
      return "@category...";
    case "tags":
      return "#tag...";
    case "history":
      return ">filter timeline...";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function ModeSwitcherBar({
  currentMode,
  onSwitch,
}: {
  currentMode: PaletteMode;
  onSwitch: (m: PaletteMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-border border-b px-3 py-1.5">
      <span className="mr-1 font-mono text-muted-foreground text-xs">❯</span>
      {MODE_CONFIG.map((m) => (
        <button
          className={cn(
            "border px-2 py-0.5 font-mono text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60",
            currentMode === m.id
              ? "border-primary/50 text-foreground"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          )}
          key={m.id}
          onClick={() => onSwitch(m.id)}
          type="button"
        >
          {m.label}
        </button>
      ))}
      <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
        <Kbd combo="Tab" /> cycle
      </span>
    </div>
  );
}

function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => [n, ...flattenCategories(n.children)]);
}

export function CommandPalette() {
  const { openOverlay, setOverlay, announce } = useKeyboardContext();
  const { posts, currentStackIds, activePostId, categories, tags, timeline } =
    usePostStackState();
  const { dismissPost, goHome, scrollToPost } = usePostStackActions();
  const [manifest, setManifest] = useState<PostManifestEntry[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [drillTarget, setDrillTarget] = useState<DrillTarget>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isOpen = openOverlay === "palette";

  const close = useCallback(() => setOverlay(null), [setOverlay]);
  const { handleClickId } = useNavClick(close);

  const currentMode = useMemo(() => detectMode(inputValue), [inputValue]);
  const searchQuery = useMemo(
    () => (currentMode === "search" ? inputValue : inputValue.slice(1).trim()),
    [currentMode, inputValue]
  );

  useEffect(() => {
    if (!isOpen) {
      setInputValue("");
      setDrillTarget(null);
      return;
    }
    let cancelled = false;
    fetchManifest()
      .then((data) => {
        if (!cancelled) {
          setManifest(data);
        }
      })
      .catch(() => {
        // Non-fatal — palette still works for stack/actions
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const switchMode = useCallback((newMode: PaletteMode) => {
    const prefixMap: Record<PaletteMode, string> = {
      search: "",
      browse: "@",
      tags: "#",
      history: ">",
    };
    setInputValue(prefixMap[newMode]);
    setDrillTarget(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const renderedIds = useMemo(
    () => new Set(posts.map((p) => p.originalId)),
    [posts]
  );

  const stackPosts = useMemo(
    () => posts.filter((p) => currentStackIds.includes(p.id)),
    [posts, currentStackIds]
  );

  const handleNavClick = useCallback(
    (slug: string, title: string) => {
      if (renderedIds.has(slug)) {
        const existing = posts.find((p) => p.originalId === slug);
        if (existing) {
          close();
          scrollToPost(existing.id);
          announce(`Jumped to ${title}`);
        }
        return;
      }
      handleClickId(slug);
      announce(`Opened ${title}`);
    },
    [renderedIds, posts, close, scrollToPost, handleClickId, announce]
  );

  const handleGoHome = useCallback(() => {
    close();
    goHome();
    announce("Returned home");
  }, [close, goHome, announce]);

  const handleDismissActive = useCallback(() => {
    if (!activePostId) {
      return;
    }
    const idx = posts.findIndex((p) => p.id === activePostId);
    if (idx === -1) {
      return;
    }
    const title = posts[idx].title;
    close();
    dismissPost(activePostId, idx);
    announce(`Dismissed ${title}`);
  }, [activePostId, posts, close, dismissPost, announce]);

  const handleToggleSidebar = useCallback(() => {
    close();
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "b", metaKey: true, bubbles: true })
    );
  }, [close]);

  const handleShowHelp = useCallback(() => {
    setOverlay("help");
  }, [setOverlay]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        const order: PaletteMode[] = ["search", "browse", "tags", "history"];
        const next = order[(order.indexOf(currentMode) + 1) % order.length];
        switchMode(next);
        return;
      }
      if (e.key === "Backspace" && drillTarget !== null && searchQuery === "") {
        e.preventDefault();
        setDrillTarget(null);
      }
    },
    [currentMode, drillTarget, searchQuery, switchMode]
  );

  const handleCommandKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape" && drillTarget !== null) {
        e.preventDefault();
        e.stopPropagation();
        setDrillTarget(null);
      }
    },
    [drillTarget]
  );

  // --- Filtered data for non-search modes ---

  const flatCats = useMemo(
    () => flattenCategories(categories).filter((c) => c.totalPostCount > 0),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) {
      return flatCats;
    }
    return flatCats.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.path.toLowerCase().includes(q)
    );
  }, [flatCats, searchQuery]);

  const filteredTags = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const sorted = [...tags].sort((a, b) => b.weight - a.weight);
    if (!q) {
      return sorted;
    }
    return sorted.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    );
  }, [tags, searchQuery]);

  const categoryDrillPosts = useMemo(() => {
    if (!drillTarget || drillTarget.type !== "category") {
      return [];
    }
    const targetName = drillTarget.name.toLowerCase();
    const q = searchQuery.toLowerCase();
    return manifest.filter((entry) => {
      const matches = entry.categories.some(
        (c) => c.toLowerCase() === targetName
      );
      if (!matches) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [drillTarget, manifest, searchQuery]);

  const tagDrillPosts = useMemo(() => {
    if (!drillTarget || drillTarget.type !== "tag") {
      return [];
    }
    const targetName = drillTarget.name.toLowerCase();
    const q = searchQuery.toLowerCase();
    return manifest.filter((entry) => {
      const matches = entry.tags.some((t) => t.toLowerCase() === targetName);
      if (!matches) {
        return false;
      }
      if (!q) {
        return true;
      }
      return entry.title.toLowerCase().includes(q);
    });
  }, [drillTarget, manifest, searchQuery]);

  const historyEntries = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return timeline
      .map((entry) => ({
        ...entry,
        posts: q
          ? entry.posts.filter((p) => p.title.toLowerCase().includes(q))
          : entry.posts,
      }))
      .filter((entry) => entry.posts.length > 0);
  }, [timeline, searchQuery]);

  // --- Mode content renderers ---

  function renderSearchContent() {
    return (
      <>
        <CommandEmpty>No results.</CommandEmpty>

        {stackPosts.length > 0 && (
          <>
            <CommandGroup heading="In current stack">
              {stackPosts.map((post, idx) => (
                <CommandItem
                  key={`stack-${post.id}`}
                  onSelect={() => {
                    close();
                    scrollToPost(post.id);
                    announce(`Jumped to ${post.title}`);
                  }}
                  value={`stack-${post.id}-${post.title}`}
                >
                  <span className="line-clamp-1">{post.title}</span>
                  <CommandShortcut>{idx + 1}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Actions">
          <CommandItem onSelect={handleGoHome} value="action-home">
            <Home />
            <span>Go home</span>
            <CommandShortcut>h</CommandShortcut>
          </CommandItem>
          {activePostId && (
            <CommandItem onSelect={handleDismissActive} value="action-dismiss">
              <X />
              <span>Dismiss active post</span>
              <CommandShortcut>x</CommandShortcut>
            </CommandItem>
          )}
          <CommandItem onSelect={handleToggleSidebar} value="action-sidebar">
            <Sidebar />
            <span>Toggle sidebar</span>
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={handleShowHelp} value="action-help">
            <RotateCcw />
            <span>Show keyboard shortcuts</span>
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {manifest.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Posts">
              {manifest.map((entry) => (
                <CommandItem
                  disabled={renderedIds.has(entry.slug)}
                  key={`post-${entry.id}`}
                  onSelect={() => handleNavClick(entry.slug, entry.title)}
                  value={`${entry.title} ${entry.tags.join(" ")} ${entry.categories.join(" ")} ${entry.type}`}
                >
                  <span className="line-clamp-1 flex-1">{entry.title}</span>
                  <span className="ml-2 text-muted-foreground text-xs uppercase">
                    {entry.type}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </>
    );
  }

  function renderCategoryList() {
    return (
      <CommandGroup heading="Browse categories">
        {filteredCategories.length === 0 ? (
          <CommandItem disabled key="browse-empty" value="browse-empty">
            <span className="text-muted-foreground text-xs">
              {searchQuery
                ? `No categories matching "${searchQuery}"`
                : "No categories."}
            </span>
          </CommandItem>
        ) : (
          filteredCategories.map((cat) => (
            <CommandItem
              key={`browse-cat-${cat.id}`}
              onSelect={() => {
                setDrillTarget({
                  type: "category",
                  name: cat.name,
                  path: cat.path,
                  displayName: cat.displayName,
                });
                setInputValue("@");
              }}
              value={`browse-cat-${cat.id}`}
            >
              <span className="mr-1 font-mono text-muted-foreground text-xs">
                @
              </span>
              <span className="line-clamp-1 flex-1 font-mono text-sm">
                {cat.displayName}
              </span>
              <span className="ml-2 max-w-[120px] truncate font-mono text-[10px] text-muted-foreground opacity-60">
                {cat.path}
              </span>
              <CommandShortcut className="font-mono text-xs">
                {cat.totalPostCount}
              </CommandShortcut>
            </CommandItem>
          ))
        )}
      </CommandGroup>
    );
  }

  function renderBrowseDrillBody() {
    if (manifest.length === 0) {
      return (
        <CommandItem disabled key="browse-loading" value="browse-loading">
          <span className="animate-pulse text-muted-foreground text-xs">
            Loading posts…
          </span>
        </CommandItem>
      );
    }
    if (categoryDrillPosts.length === 0) {
      return (
        <CommandItem
          disabled
          key="browse-drill-empty"
          value="browse-drill-empty"
        >
          <span className="text-muted-foreground text-xs">
            ∅ No posts in this category
          </span>
        </CommandItem>
      );
    }
    return categoryDrillPosts.map((entry) => (
      <CommandItem
        disabled={renderedIds.has(entry.slug)}
        key={`browse-post-${entry.id}`}
        onSelect={() => handleNavClick(entry.slug, entry.title)}
        value={`browse-post-${entry.id}`}
      >
        <span className="line-clamp-1 flex-1 font-mono text-sm">
          {entry.title}
        </span>
        <span className="ml-2 font-mono text-muted-foreground text-xs uppercase">
          {entry.type}
        </span>
      </CommandItem>
    ));
  }

  function renderCategoryDrill() {
    if (!drillTarget || drillTarget.type !== "category") {
      return null;
    }
    return (
      <CommandGroup heading={`@${drillTarget.displayName}`}>
        <CommandItem
          key="browse-back"
          onSelect={() => {
            setDrillTarget(null);
            setInputValue("@");
          }}
          value="browse-back"
        >
          <span className="mr-1 text-xs">←</span>
          <span className="font-mono text-muted-foreground text-xs">
            back to categories
          </span>
          <CommandShortcut className="font-mono text-[10px]">
            ⌫ Backspace
          </CommandShortcut>
        </CommandItem>
        {renderBrowseDrillBody()}
      </CommandGroup>
    );
  }

  function renderTagList() {
    return (
      <CommandGroup heading="Browse tags">
        {filteredTags.length === 0 ? (
          <CommandItem disabled key="tags-empty" value="tags-empty">
            <span className="text-muted-foreground text-xs">
              {searchQuery ? `No tags matching "${searchQuery}"` : "No tags."}
            </span>
          </CommandItem>
        ) : (
          filteredTags.map((tag) => (
            <CommandItem
              key={`tag-${tag.id}`}
              onSelect={() => {
                setDrillTarget({ type: "tag", name: tag.name, slug: tag.slug });
                setInputValue("#");
              }}
              value={`tag-${tag.id}`}
            >
              <span className="mr-1 font-mono text-muted-foreground text-xs">
                #
              </span>
              <span className="line-clamp-1 flex-1 font-mono text-sm">
                {tag.name}
              </span>
              <CommandShortcut className="font-mono text-xs">
                {tag.postCount}
              </CommandShortcut>
            </CommandItem>
          ))
        )}
      </CommandGroup>
    );
  }

  function renderTagDrillBody() {
    if (manifest.length === 0) {
      return (
        <CommandItem disabled key="tags-loading" value="tags-loading">
          <span className="animate-pulse text-muted-foreground text-xs">
            Loading posts…
          </span>
        </CommandItem>
      );
    }
    if (tagDrillPosts.length === 0) {
      return (
        <CommandItem disabled key="tags-drill-empty" value="tags-drill-empty">
          <span className="text-muted-foreground text-xs">
            ∅ No posts with this tag
          </span>
        </CommandItem>
      );
    }
    return tagDrillPosts.map((entry) => (
      <CommandItem
        disabled={renderedIds.has(entry.slug)}
        key={`tag-post-${entry.id}`}
        onSelect={() => handleNavClick(entry.slug, entry.title)}
        value={`tag-post-${entry.id}`}
      >
        <span className="line-clamp-1 flex-1 font-mono text-sm">
          {entry.title}
        </span>
        <span className="ml-2 font-mono text-muted-foreground text-xs uppercase">
          {entry.type}
        </span>
      </CommandItem>
    ));
  }

  function renderTagDrill() {
    if (!drillTarget || drillTarget.type !== "tag") {
      return null;
    }
    return (
      <CommandGroup heading={`#${drillTarget.name}`}>
        <CommandItem
          key="tags-back"
          onSelect={() => {
            setDrillTarget(null);
            setInputValue("#");
          }}
          value="tags-back"
        >
          <span className="mr-1 text-xs">←</span>
          <span className="font-mono text-muted-foreground text-xs">
            back to tags
          </span>
          <CommandShortcut className="font-mono text-[10px]">
            ⌫ Backspace
          </CommandShortcut>
        </CommandItem>
        {renderTagDrillBody()}
      </CommandGroup>
    );
  }

  function renderHistoryContent() {
    if (historyEntries.length === 0) {
      return (
        <CommandGroup heading="History">
          <CommandItem disabled key="hist-empty" value="hist-empty">
            <span className="text-muted-foreground text-xs">
              {searchQuery
                ? `No posts matching "${searchQuery}"`
                : "No timeline entries."}
            </span>
          </CommandItem>
        </CommandGroup>
      );
    }
    return (
      <>
        {historyEntries.map((entry) => (
          <CommandGroup
            heading={entry.formattedDate}
            key={`hist-${entry.monthKey}`}
          >
            {entry.posts.map((post) => (
              <CommandItem
                disabled={renderedIds.has(post.originalId)}
                key={`hist-${entry.monthKey}-${post.id}`}
                onSelect={() => handleNavClick(post.originalId, post.title)}
                value={`hist-${post.id}`}
              >
                <span className="mr-1 font-mono text-muted-foreground text-xs">
                  ▶
                </span>
                <span className="line-clamp-1 flex-1 font-mono text-sm">
                  {post.title}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </>
    );
  }

  function renderModeContent() {
    switch (currentMode) {
      case "search":
        return renderSearchContent();
      case "browse":
        return drillTarget?.type === "category"
          ? renderCategoryDrill()
          : renderCategoryList();
      case "tags":
        return drillTarget?.type === "tag" ? renderTagDrill() : renderTagList();
      case "history":
        return renderHistoryContent();
      default: {
        const _exhaustive: never = currentMode;
        return _exhaustive;
      }
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          close();
        }
      }}
      open={isOpen}
    >
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <Command
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
          onKeyDown={handleCommandKeyDown}
          shouldFilter={currentMode === "search"}
        >
          <ModeSwitcherBar currentMode={currentMode} onSwitch={switchMode} />
          <CommandInput
            onKeyDown={handleInputKeyDown}
            onValueChange={setInputValue}
            placeholder={placeholderForMode(currentMode)}
            ref={inputRef}
            value={inputValue}
          />
          <CommandList>{renderModeContent()}</CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
