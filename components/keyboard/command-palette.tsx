"use client";

import { Home, RotateCcw, Sidebar, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  usePostStackActions,
  usePostStackState,
} from "@/components/post-stack/post-stack-provider-xstate";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useKeyboardContext } from "@/lib/keyboard/keyboard-context";

interface PostManifestEntry {
  id: string;
  slug: string;
  title: string;
  type: string;
  tags: string[];
  categories: string[];
}

let manifestCache: PostManifestEntry[] | null = null;
let manifestPromise: Promise<PostManifestEntry[]> | null = null;

async function fetchManifest(): Promise<PostManifestEntry[]> {
  if (manifestCache) {
    return manifestCache;
  }
  if (manifestPromise) {
    return manifestPromise;
  }
  manifestPromise = fetch("/api/posts-manifest", { cache: "force-cache" })
    .then((r) => r.json())
    .then((data: PostManifestEntry[]) => {
      manifestCache = data;
      manifestPromise = null;
      return data;
    })
    .catch((e) => {
      manifestPromise = null;
      throw e;
    });
  return manifestPromise;
}

export function CommandPalette() {
  const { openOverlay, setOverlay, announce } = useKeyboardContext();
  const { posts, currentStackIds, activePostId } = usePostStackState();
  const { addPost, goHome, dismissPost, scrollToPost } = usePostStackActions();
  const [manifest, setManifest] = useState<PostManifestEntry[]>([]);
  const isOpen = openOverlay === "palette";

  useEffect(() => {
    if (!isOpen) {
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
        // Network failure is non-fatal — palette still works for actions
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const renderedIds = useMemo(() => new Set(posts.map((p) => p.originalId)), [posts]);

  const stackPosts = useMemo(
    () => posts.filter((p) => currentStackIds.includes(p.id)),
    [posts, currentStackIds]
  );

  const close = () => setOverlay(null);

  const handleAddPost = (slug: string, title: string) => {
    close();
    addPost(slug);
    announce(`Opened ${title}`);
  };

  const handleJumpToStack = (id: string, title: string) => {
    close();
    scrollToPost(id);
    announce(`Jumped to ${title}`);
  };

  const handleGoHome = () => {
    close();
    goHome();
    announce("Returned home");
  };

  const handleDismissActive = () => {
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
  };

  const handleToggleSidebar = () => {
    close();
    const evt = new KeyboardEvent("keydown", {
      key: "b",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(evt);
  };

  const handleShowHelp = () => {
    setOverlay("help");
  };

  return (
    <CommandDialog
      onOpenChange={(open) => {
        if (!open) {
          close();
        }
      }}
      open={isOpen}
    >
      <CommandInput placeholder="Search posts or run a command..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        {stackPosts.length > 0 && (
          <>
            <CommandGroup heading="In current stack">
              {stackPosts.map((post, idx) => (
                <CommandItem
                  key={`stack-${post.id}`}
                  onSelect={() => handleJumpToStack(post.id, post.title)}
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
                  onSelect={() => {
                    if (renderedIds.has(entry.slug)) {
                      const existing = posts.find((p) => p.originalId === entry.slug);
                      if (existing) {
                        handleJumpToStack(existing.id, existing.title);
                      }
                      return;
                    }
                    handleAddPost(entry.slug, entry.title);
                  }}
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
      </CommandList>
    </CommandDialog>
  );
}
