import NextLink from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LinkProps = {
  href: string;
  children: ReactNode;
  variant?: "default" | "primary" | "muted";
  className?: string;
  external?: boolean;
};

export function Link({
  href,
  children,
  variant = "default",
  className,
  external = false,
}: LinkProps) {
  const baseClasses = cn(
    "transition-colors duration-200",
    variant === "default" && "text-primary hover:text-primary/80",
    variant === "primary" && "text-foreground hover:text-muted-foreground",
    variant === "muted" && "text-muted-foreground hover:text-foreground",
    className
  );

  if (external) {
    return (
      <a
        className={baseClasses}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {children}
      </a>
    );
  }

  return (
    <NextLink className={baseClasses} href={href}>
      {children}
    </NextLink>
  );
}
