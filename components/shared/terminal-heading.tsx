import type React from "react";
import { cn } from "@/lib/utils";

interface TerminalHeadingProps {
  children: React.ReactNode;
  className?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: "sm" | "md" | "lg";
}

export function TerminalHeading({
  children,
  className,
  level = 3,
  size = "md",
}: TerminalHeadingProps) {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const headingProps = {
    className: cn(
      "flex items-center gap-2 font-medium font-mono text-foreground/80 tracking-wide",
      sizeClasses[size],
      className
    ),
    role: "heading" as const,
    "aria-level": level,
  };

  const content = (
    <>
      <span aria-hidden="true" className="select-none text-muted-foreground/60">
        █▓▒▒░░░░
      </span>
      <span className="flex-1 text-center uppercase tracking-wider">
        {children}
      </span>
      <span aria-hidden="true" className="select-none text-muted-foreground/60">
        ░░░░▒▒▓█
      </span>
    </>
  );

  switch (level) {
    case 1:
      return <h1 {...headingProps}>{content}</h1>;
    case 2:
      return <h2 {...headingProps}>{content}</h2>;
    case 3:
      return <h3 {...headingProps}>{content}</h3>;
    case 4:
      return <h4 {...headingProps}>{content}</h4>;
    case 5:
      return <h5 {...headingProps}>{content}</h5>;
    case 6:
      return <h6 {...headingProps}>{content}</h6>;
    default:
      return <h3 {...headingProps}>{content}</h3>;
  }
}
