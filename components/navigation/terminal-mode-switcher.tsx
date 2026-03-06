"use client";

import { cn } from "@/lib/utils";

type TerminalModeSwitcherProps<T extends string> = {
  modes: readonly { value: T; label: string }[];
  activeMode: T;
  onModeChange: (mode: T) => void;
  className?: string;
};

/**
 * Terminal-style mode switcher with CLI aesthetic
 * - Flat rectangular buttons (no rounded corners)
 * - Monospaced font
 * - Inverted colors for active state
 * - Thin borders matching visual-styling.md
 */
export function TerminalModeSwitcher<T extends string>({
  modes,
  activeMode,
  onModeChange,
  className,
}: TerminalModeSwitcherProps<T>) {
  return (
    <div className={cn("flex gap-0 border-white/20 border-b p-0.5", className)}>
      {modes.map(({ value, label }) => (
        <button
          aria-pressed={activeMode === value}
          className={cn(
            // Base styles - terminal aesthetic
            "flex-1 px-3 py-2 font-mono text-xs uppercase tracking-wider",
            "border border-white/20 transition-none",
            // NO rounded corners - flat rectangular design
            "rounded-none",
            // Active state - inverted colors (terminal style)
            activeMode === value
              ? "border-white bg-white text-black"
              : "bg-transparent text-white/60 hover:text-white/80",
            // Sharp borders between buttons
            "first:border-r-0 last:border-l-0 [&:not(:first-child):not(:last-child)]:border-x-0"
          )}
          key={value}
          onClick={() => onModeChange(value)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
