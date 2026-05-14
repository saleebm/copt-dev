"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  usePostStackActions,
  usePostStackState,
} from "@/components/post-stack/post-stack-provider-xstate";
import { useKeyboardContext } from "@/lib/keyboard/keyboard-context";
import { SHORTCUT_IDS, ShortcutGroup } from "@/lib/keyboard/shortcuts-registry";
import { useKeyboardShortcut } from "@/lib/keyboard/use-keyboard-shortcut";
import { cancelCurrentScroll } from "@/lib/scroll-utils";

const THROTTLE_MS = 120;

function useThrottledCallback<T extends (...args: never[]) => void>(
  fn: T,
  ms: number
): T {
  const last = useRef(0);
  return useCallback(
    ((...args: never[]) => {
      const now = Date.now();
      if (now - last.current < ms) {
        return;
      }
      last.current = now;
      fn(...args);
    }) as T,
    [fn, ms]
  );
}

export function StackShortcuts() {
  const { posts, currentStackIds, activePostId } = usePostStackState();
  const { scrollToPost, dismissPost, goHome } = usePostStackActions();
  const { announce, register } = useKeyboardContext();

  const postsRef = useRef(posts);
  const activeIdRef = useRef(activePostId);
  useEffect(() => {
    postsRef.current = posts;
    activeIdRef.current = activePostId;
  }, [posts, activePostId]);

  const activeIndex = useMemo(
    () => posts.findIndex((p) => p.id === activePostId),
    [posts, activePostId]
  );

  const stackHasPosts = currentStackIds.length > 0;

  const goNext = useThrottledCallback(() => {
    cancelCurrentScroll();
    const next = posts[Math.min(activeIndex + 1, posts.length - 1)];
    if (next && next.id !== activePostId) {
      scrollToPost(next.id);
      announce(`Post ${activeIndex + 2} of ${posts.length}: ${next.title}`);
    }
  }, THROTTLE_MS);

  const goPrev = useThrottledCallback(() => {
    cancelCurrentScroll();
    const prev = posts[Math.max(activeIndex - 1, 0)];
    if (prev && prev.id !== activePostId) {
      scrollToPost(prev.id);
      announce(`Post ${activeIndex} of ${posts.length}: ${prev.title}`);
    }
  }, THROTTLE_MS);

  const goTop = useCallback(() => {
    cancelCurrentScroll();
    const first = posts[0];
    if (first) {
      scrollToPost(first.id);
      announce(`Top: ${first.title}`);
    }
  }, [posts, scrollToPost, announce]);

  const goBottom = useCallback(() => {
    cancelCurrentScroll();
    const last = posts.at(-1);
    if (last) {
      scrollToPost(last.id);
      announce(`Bottom: ${last.title}`);
    }
  }, [posts, scrollToPost, announce]);

  const dismissActive = useCallback(() => {
    if (!activePostId || activeIndex === -1) {
      return;
    }
    const title = posts[activeIndex]?.title ?? "post";
    dismissPost(activePostId, activeIndex);
    announce(`Dismissed ${title}`);
  }, [activePostId, activeIndex, posts, dismissPost, announce]);

  const handleGoHome = useCallback(() => {
    goHome();
    announce("Returned home");
  }, [goHome, announce]);

  useKeyboardShortcut(
    useMemo(
      () => ({
        id: SHORTCUT_IDS.stackNext,
        keys: ["j"],
        group: ShortcutGroup.Stack,
        description: "Next post in stack",
        when: () => stackHasPosts,
        handler: goNext,
      }),
      [stackHasPosts, goNext]
    )
  );

  useKeyboardShortcut(
    useMemo(
      () => ({
        id: SHORTCUT_IDS.stackPrev,
        keys: ["k"],
        group: ShortcutGroup.Stack,
        description: "Previous post in stack",
        when: () => stackHasPosts,
        handler: goPrev,
      }),
      [stackHasPosts, goPrev]
    )
  );

  useKeyboardShortcut(
    useMemo(
      () => ({
        id: SHORTCUT_IDS.stackTop,
        keys: ["g g"],
        group: ShortcutGroup.Stack,
        description: "First post in stack",
        when: () => stackHasPosts,
        handler: goTop,
      }),
      [stackHasPosts, goTop]
    )
  );

  useKeyboardShortcut(
    useMemo(
      () => ({
        id: SHORTCUT_IDS.stackBottom,
        keys: ["Shift+G"],
        group: ShortcutGroup.Stack,
        description: "Last post in stack",
        when: () => stackHasPosts,
        handler: goBottom,
      }),
      [stackHasPosts, goBottom]
    )
  );

  useKeyboardShortcut(
    useMemo(
      () => ({
        id: SHORTCUT_IDS.stackDismiss,
        keys: ["x"],
        group: ShortcutGroup.Stack,
        description: "Dismiss active post",
        when: () => activePostId !== null,
        handler: dismissActive,
      }),
      [activePostId, dismissActive]
    )
  );

  useKeyboardShortcut(
    useMemo(
      () => ({
        id: SHORTCUT_IDS.stackHome,
        keys: ["h"],
        group: ShortcutGroup.Stack,
        description: "Clear stack and return home",
        when: () => stackHasPosts,
        handler: handleGoHome,
      }),
      [stackHasPosts, handleGoHome]
    )
  );

  useEffect(() => {
    const unregisters: Array<() => void> = [];
    for (let n = 1; n <= 9; n++) {
      const num = n;
      unregisters.push(
        register({
          id: SHORTCUT_IDS.stackJump(num),
          keys: [String(num)],
          group: ShortcutGroup.Stack,
          description: num === 1 ? "Jump to post N (1–9)" : "",
          when: () => postsRef.current.length >= num,
          handler: () => {
            const target = postsRef.current[num - 1];
            if (!target) {
              return;
            }
            cancelCurrentScroll();
            scrollToPost(target.id);
            announce(
              `Post ${num} of ${postsRef.current.length}: ${target.title}`
            );
          },
        })
      );
    }
    return () => {
      for (const u of unregisters) {
        u();
      }
    };
  }, [register, scrollToPost, announce]);

  return null;
}
