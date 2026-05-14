"use client";

import { useEffect } from "react";
import { useKeyboardContext } from "@/lib/keyboard/keyboard-context";
import type { ShortcutDescriptor } from "@/lib/keyboard/shortcuts-registry";

export function useKeyboardShortcut(descriptor: ShortcutDescriptor) {
  const { register } = useKeyboardContext();

  useEffect(() => register(descriptor), [register, descriptor]);
}
