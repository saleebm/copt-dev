import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

const Breadcrumb = ({
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"nav"> & {
  separator?: React.ReactNode;
} & { ref?: React.RefObject<HTMLElement | null> }) => (
  <nav aria-label="breadcrumb" ref={ref} {...props} />
);
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"ol"> & {
  ref?: React.RefObject<HTMLOListElement | null>;
}) => (
  <ol
    className={cn(
      "flex flex-wrap items-center gap-1.5 break-words text-muted-foreground text-sm sm:gap-2.5",
      className
    )}
    ref={ref}
    {...props}
  />
);
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & {
  ref?: React.RefObject<HTMLLIElement | null>;
}) => (
  <li
    className={cn("inline-flex items-center gap-1.5", className)}
    ref={ref}
    {...props}
  />
);
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = ({
  asChild,
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"a"> & {
  asChild?: boolean;
} & { ref?: React.RefObject<HTMLAnchorElement | null> }) => {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      className={cn("transition-colors hover:text-foreground", className)}
      ref={ref}
      {...props}
    />
  );
};
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"span"> & {
  ref?: React.RefObject<HTMLSpanElement | null>;
}) => (
  <span
    aria-current="page"
    aria-disabled="true"
    className={cn("font-normal text-foreground", className)}
    ref={ref}
    role="link"
    tabIndex={-1}
    {...props}
  />
);
BreadcrumbPage.displayName = "BreadcrumbPage";

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) => (
  <li
    aria-hidden="true"
    className={cn("[&>svg]:h-3.5 [&>svg]:w-3.5", className)}
    role="presentation"
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    role="presentation"
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
);
BreadcrumbEllipsis.displayName = "BreadcrumbElipssis";

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
