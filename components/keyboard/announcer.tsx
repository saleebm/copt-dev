"use client";

import { useKeyboardContext } from "@/lib/keyboard/keyboard-context";

export function Announcer() {
  const { announcement } = useKeyboardContext();

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="sr-only"
      role="status"
    >
      {announcement}
    </div>
  );
}
