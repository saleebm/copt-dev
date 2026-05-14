"use client";

import { useMemo } from "react";
import { useKeyboardContext } from "@/lib/keyboard/keyboard-context";
import { useKeyboardShortcut } from "@/lib/keyboard/use-keyboard-shortcut";
import {
  SHORTCUT_IDS,
  ShortcutGroup,
} from "@/lib/keyboard/shortcuts-registry";

export function GlobalShortcuts() {
  const { setOverlay, openOverlay } = useKeyboardContext();

  const showHelp = useMemo(
    () => ({
      id: SHORTCUT_IDS.showHelp,
      keys: ["?"],
      group: ShortcutGroup.Global,
      description: "Show keyboard shortcuts",
      handler: () => setOverlay("help"),
    }),
    [setOverlay]
  );

  const showHelpAlias = useMemo(
    () => ({
      id: SHORTCUT_IDS.showHelpAlias,
      keys: ["Mod+/"],
      group: ShortcutGroup.Global,
      description: "Show keyboard shortcuts (alt)",
      handler: () => setOverlay("help"),
    }),
    [setOverlay]
  );

  const openPalette = useMemo(
    () => ({
      id: SHORTCUT_IDS.openPalette,
      keys: ["Mod+k"],
      group: ShortcutGroup.Search,
      description: "Open command palette",
      handler: () => setOverlay("palette"),
    }),
    [setOverlay]
  );

  const closeOverlay = useMemo(
    () => ({
      id: SHORTCUT_IDS.closeOverlay,
      keys: ["Escape"],
      group: ShortcutGroup.Global,
      description: "Close open dialog",
      when: () => openOverlay !== null,
      handler: () => setOverlay(null),
      preventDefault: false,
    }),
    [openOverlay, setOverlay]
  );

  useKeyboardShortcut(showHelp);
  useKeyboardShortcut(showHelpAlias);
  useKeyboardShortcut(openPalette);
  useKeyboardShortcut(closeOverlay);

  return null;
}
