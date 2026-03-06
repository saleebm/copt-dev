import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

const NavigationMenu = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root> & {
  ref?: React.RefObject<React.ElementRef<
    typeof NavigationMenuPrimitive.Root
  > | null>;
}) => (
  <NavigationMenuPrimitive.Root
    className={cn(
      "relative z-10 flex max-w-max flex-1 items-center justify-center",
      className
    )}
    ref={ref}
    {...props}
  >
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
);
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName;

const NavigationMenuList = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List> & {
  ref?: React.RefObject<React.ElementRef<
    typeof NavigationMenuPrimitive.List
  > | null>;
}) => (
  <NavigationMenuPrimitive.List
    className={cn(
      "group flex flex-1 list-none items-center justify-center space-x-1",
      className
    )}
    ref={ref}
    {...props}
  />
);
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;

const NavigationMenuItem = NavigationMenuPrimitive.Item;

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent/50 data-active:bg-accent/50"
);

const NavigationMenuTrigger = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger> & {
  ref?: React.RefObject<React.ElementRef<
    typeof NavigationMenuPrimitive.Trigger
  > | null>;
}) => (
  <NavigationMenuPrimitive.Trigger
    className={cn(navigationMenuTriggerStyle(), "group", className)}
    ref={ref}
    {...props}
  >
    {children}{" "}
    <ChevronDown
      aria-hidden="true"
      className="relative top-px ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180"
    />
  </NavigationMenuPrimitive.Trigger>
);
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName;

const NavigationMenuContent = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content> & {
  ref?: React.RefObject<React.ElementRef<
    typeof NavigationMenuPrimitive.Content
  > | null>;
}) => (
  <NavigationMenuPrimitive.Content
    className={cn(
      "data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 top-0 left-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out md:absolute md:w-auto",
      className
    )}
    ref={ref}
    {...props}
  />
);
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName;

const NavigationMenuLink = NavigationMenuPrimitive.Link;

const NavigationMenuViewport = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport> & {
  ref?: React.RefObject<React.ElementRef<
    typeof NavigationMenuPrimitive.Viewport
  > | null>;
}) => (
  <div className={cn("absolute top-full left-0 flex justify-center")}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 relative mt-1.5 h-(--radix-navigation-menu-viewport-height) w-full origin-top-center overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in md:w-(--radix-navigation-menu-viewport-width)",
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
);
NavigationMenuViewport.displayName =
  NavigationMenuPrimitive.Viewport.displayName;

const NavigationMenuIndicator = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator> & {
  ref?: React.RefObject<React.ElementRef<
    typeof NavigationMenuPrimitive.Indicator
  > | null>;
}) => (
  <NavigationMenuPrimitive.Indicator
    className={cn(
      "data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full z-1 flex h-1.5 items-end justify-center overflow-hidden data-[state=hidden]:animate-out data-[state=visible]:animate-in",
      className
    )}
    ref={ref}
    {...props}
  >
    <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
  </NavigationMenuPrimitive.Indicator>
);
NavigationMenuIndicator.displayName =
  NavigationMenuPrimitive.Indicator.displayName;

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
};
