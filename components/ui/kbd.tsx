import type React from "react";
import { cn } from "@/lib/utils";

const SYMBOL_MAP: Record<string, string> = {
  Mod: "⌘",
  Cmd: "⌘",
  Meta: "⌘",
  Ctrl: "⌃",
  Alt: "⌥",
  Option: "⌥",
  Shift: "⇧",
  Enter: "↵",
  Return: "↵",
  Tab: "⇥",
  Backspace: "⌫",
  Delete: "⌦",
  Escape: "Esc",
  Esc: "Esc",
  Space: "␣",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Home: "↖",
  End: "↘",
  PageUp: "⇞",
  PageDown: "⇟",
  CapsLock: "⇪",
};

function renderToken(token: string): string {
  return SYMBOL_MAP[token] ?? token;
}

interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  combo: string;
}

export function Kbd({ combo, className, ...props }: KbdProps) {
  const isSequence = combo.includes(" ");
  const segments = isSequence ? combo.split(" ") : [combo];

  return (
    <span className="inline-flex items-center gap-1" {...props}>
      {segments.map((segment, segmentIndex) => {
        const parts = segment.split("+");
        return (
          <span
            className="inline-flex items-center gap-0.5"
            // biome-ignore lint/suspicious/noArrayIndexKey: segments come from a fixed combo string; position is the stable identity and disambiguates repeated segments (e.g. "g g")
            key={`${segmentIndex}-${segment}`}
          >
            {parts.map((part, partIndex) => (
              <kbd
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] text-muted-foreground",
                  className
                )}
                // biome-ignore lint/suspicious/noArrayIndexKey: parts come from a fixed combo string; position is the stable identity
                key={`${segmentIndex}-${partIndex}-${part}`}
              >
                {renderToken(part)}
              </kbd>
            ))}
          </span>
        );
      })}
    </span>
  );
}
