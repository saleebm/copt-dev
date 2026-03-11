import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MainWrapperProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "gradient";
}

export function MainWrapper({
  children,
  variant = "default",
  className,
}: MainWrapperProps) {
  return (
    <main
      className={cn(
        "min-h-screen w-full text-foreground",
        variant === "default" && "bg-background",
        variant === "gradient" &&
          "bg-gradient-to-br from-background via-muted to-secondary text-foreground",
        className
      )}
    >
      {children}
    </main>
  );
}
