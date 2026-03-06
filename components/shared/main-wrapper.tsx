import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MainWrapperProps = {
  children: ReactNode;
  variant?: "default" | "gradient";
  className?: string;
};

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
