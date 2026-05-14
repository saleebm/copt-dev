import type React from "react";
import { cn } from "@/lib/utils";

const SYMBOL_MAP: Record<string, string> = {
  Mod: "⌘",
  Cmd: "⌘",
  Meta: "⌘",
  Ctrl: "Ctrl",
  Alt: "Alt",
  Shift: "⇧",
  Enter: "↵",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Escape: "Esc",
  Space: "Space",
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
            key={`seg-${segmentIndex}-${segment}`}
          >
            {parts.map((part, partIndex) => (
              <kbd
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] text-muted-foreground",
                  className
                )}
                key={`${segment}-${part}-${partIndex}`}
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
