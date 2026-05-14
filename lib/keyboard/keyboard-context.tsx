"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ShortcutDescriptor } from "@/lib/keyboard/shortcuts-registry";

const SEQUENCE_TIMEOUT_MS = 1000;
const INPUT_SELECTOR =
  'input, textarea, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]';

export type OverlayId = "help" | "palette" | null;

interface KeyboardContextValue {
  register: (descriptor: ShortcutDescriptor) => () => void;
  getAll: () => ShortcutDescriptor[];
  openOverlay: OverlayId;
  setOverlay: (overlay: OverlayId) => void;
  announce: (message: string) => void;
  announcement: string;
}

const KeyboardContext = createContext<KeyboardContextValue | null>(null);

export function useKeyboardContext(): KeyboardContextValue {
  const ctx = useContext(KeyboardContext);
  if (!ctx) {
    throw new Error(
      "useKeyboardContext must be used within a KeyboardProvider"
    );
  }
  return ctx;
}

function isModifier(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey || event.altKey;
}

function isInInput(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return target.closest(INPUT_SELECTOR) !== null;
}

function normalizeKey(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.metaKey || event.ctrlKey) {
    parts.push("Mod");
  }
  if (event.shiftKey && event.key.length === 1 && event.key === event.key.toUpperCase() && event.key !== event.key.toLowerCase()) {
    parts.push("Shift");
  } else if (event.shiftKey && event.key.length > 1) {
    parts.push("Shift");
  }
  if (event.altKey) {
    parts.push("Alt");
  }

  let key = event.key;
  if (key === " ") {
    key = "Space";
  }
  parts.push(key);
  return parts.join("+");
}

function shortcutMatches(combo: string, event: KeyboardEvent): boolean {
  const norm = normalizeKey(event);
  if (norm === combo) {
    return true;
  }

  const lower = combo.toLowerCase();
  const normLower = norm.toLowerCase();
  if (normLower === lower) {
    return true;
  }

  if (combo.startsWith("Mod+") || combo.startsWith("Cmd+") || combo.startsWith("Ctrl+")) {
    const rest = combo.replace(/^(Mod|Cmd|Ctrl)\+/, "").toLowerCase();
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === rest) {
      return true;
    }
  }

  return false;
}

interface KeyboardProviderProps {
  children: React.ReactNode;
}

export function KeyboardContextProvider({ children }: KeyboardProviderProps) {
  const registryRef = useRef<Map<string, ShortcutDescriptor>>(new Map());
  const [overlay, setOverlayState] = useState<OverlayId>(null);
  const [announcement, setAnnouncement] = useState<string>("");
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const pendingPrefixRef = useRef<{ key: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  const clearPrefix = useCallback(() => {
    if (pendingPrefixRef.current) {
      clearTimeout(pendingPrefixRef.current.timer);
      pendingPrefixRef.current = null;
    }
  }, []);

  const setOverlay = useCallback(
    (next: OverlayId) => {
      setOverlayState((prev) => {
        if (next !== null && next !== prev) {
          lastFocusedRef.current = document.activeElement as HTMLElement | null;
        }
        if (next === null && lastFocusedRef.current && document.body.contains(lastFocusedRef.current)) {
          queueMicrotask(() => lastFocusedRef.current?.focus());
        }
        return next;
      });
    },
    []
  );

  const register = useCallback((descriptor: ShortcutDescriptor) => {
    registryRef.current.set(descriptor.id, descriptor);
    return () => {
      registryRef.current.delete(descriptor.id);
    };
  }, []);

  const getAll = useCallback(() => Array.from(registryRef.current.values()), []);

  const announce = useCallback((message: string) => {
    if (announceTimerRef.current) {
      clearTimeout(announceTimerRef.current);
    }
    announceTimerRef.current = setTimeout(() => {
      setAnnouncement("");
      requestAnimationFrame(() => setAnnouncement(message));
    }, 200);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) {
        return;
      }

      const inInput = isInInput(event.target);
      const descriptors = Array.from(registryRef.current.values());

      const isSequenceStart = !isModifier(event) && event.key === "g";

      if (pendingPrefixRef.current) {
        const prefix = pendingPrefixRef.current.key;
        const sequenceCombo = `${prefix} ${event.key}`.toLowerCase();
        clearPrefix();

        for (const d of descriptors) {
          if (d.when && !d.when()) {
            continue;
          }
          if (inInput && !d.allowInInput && event.key !== "Escape" && !isModifier(event)) {
            continue;
          }
          for (const combo of d.keys) {
            if (combo.toLowerCase() === sequenceCombo) {
              if (d.preventDefault !== false) {
                event.preventDefault();
              }
              d.handler(event);
              return;
            }
          }
        }
      }

      if (event.repeat && !isModifier(event)) {
        return;
      }

      for (const d of descriptors) {
        if (d.when && !d.when()) {
          continue;
        }
        if (inInput && !d.allowInInput && event.key !== "Escape" && !isModifier(event)) {
          continue;
        }
        for (const combo of d.keys) {
          if (combo.includes(" ")) {
            continue;
          }
          if (shortcutMatches(combo, event)) {
            if (d.preventDefault !== false) {
              event.preventDefault();
            }
            d.handler(event);
            return;
          }
        }
      }

      if (isSequenceStart) {
        const hasSequenceStartingWithG = descriptors.some((d) =>
          d.keys.some((k) => k.toLowerCase().startsWith("g "))
        );
        if (hasSequenceStartingWithG && (!inInput || event.key === "Escape")) {
          if (pendingPrefixRef.current) {
            clearTimeout(pendingPrefixRef.current.timer);
          }
          const timer = setTimeout(() => {
            pendingPrefixRef.current = null;
          }, SEQUENCE_TIMEOUT_MS);
          pendingPrefixRef.current = { key: "g", timer };
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearPrefix();
    };
  }, [clearPrefix]);

  useEffect(() => {
    return () => {
      if (announceTimerRef.current) {
        clearTimeout(announceTimerRef.current);
      }
    };
  }, []);

  const value = useMemo<KeyboardContextValue>(
    () => ({
      register,
      getAll,
      openOverlay: overlay,
      setOverlay,
      announce,
      announcement,
    }),
    [register, getAll, overlay, setOverlay, announce, announcement]
  );

  return (
    <KeyboardContext.Provider value={value}>
      {children}
    </KeyboardContext.Provider>
  );
}
