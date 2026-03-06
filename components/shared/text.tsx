import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TextProps = {
  children?: ReactNode;
  variant?: "default" | "error" | "warning" | "muted";
  className?: string;
  preserveWhitespace?: boolean;
};

export function Text({
  children,
  variant = "default",
  className,
  preserveWhitespace = false,
}: TextProps) {
  return (
    <p
      className={cn(
        "leading-relaxed",
        variant === "default" && "text-foreground",
        variant === "error" && "text-destructive",
        variant === "warning" && "text-accent-foreground",
        variant === "muted" && "text-muted-foreground",
        preserveWhitespace && "whitespace-pre-line",
        className
      )}
    >
      {children}
    </p>
  );
}
