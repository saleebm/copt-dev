"use client";

import * as MenubarPrimitive from "@radix-ui/react-menubar";
import { Check, ChevronRight, Circle } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

const MenubarMenu = MenubarPrimitive.Menu;

const MenubarGroup = MenubarPrimitive.Group;

const MenubarPortal = MenubarPrimitive.Portal;

const MenubarSub = MenubarPrimitive.Sub;

const MenubarRadioGroup = MenubarPrimitive.RadioGroup;

const Menubar = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root> & {
  ref?: React.RefObject<React.ElementRef<typeof MenubarPrimitive.Root> | null>;
}) => (
  <MenubarPrimitive.Root
    className={cn(
      "flex h-10 items-center space-x-1 rounded-md border bg-background p-1",
      className
    )}
    ref={ref}
    {...props}
  />
);
Menubar.displayName = MenubarPrimitive.Root.displayName;

const MenubarTrigger = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger> & {
  ref?: React.RefObject<React.ElementRef<
    typeof MenubarPrimitive.Trigger
  > | null>;
}) => (
  <MenubarPrimitive.Trigger
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-3 py-1.5 font-medium text-sm outline-hidden focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      className
    )}
    ref={ref}
    {...props}
  />
);
MenubarTrigger.displayName = MenubarPrimitive.Trigger.displayName;

const MenubarSubTrigger = ({
  className,
  inset,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> & {
  inset?: boolean;
} & {
  ref?: React.RefObject<React.ElementRef<
    typeof MenubarPrimitive.SubTrigger
  > | null>;
}) => (
  <MenubarPrimitive.SubTrigger
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      inset && "pl-8",
      className
    )}
    ref={ref}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </MenubarPrimitive.SubTrigger>
);
MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName;

const MenubarSubContent = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent> & {
  ref?: React.RefObject<React.ElementRef<
    typeof MenubarPrimitive.SubContent
  > | null>;
}) => (
  <MenubarPrimitive.SubContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    ref={ref}
    {...props}
  />
);
MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName;

const MenubarContent = ({
  className,
  align = "start",
  alignOffset = -4,
  sideOffset = 8,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content> & {
  ref?: React.RefObject<React.ElementRef<
    typeof MenubarPrimitive.Content
  > | null>;
}) => (
  <MenubarPrimitive.Portal>
    <MenubarPrimitive.Content
      align={align}
      alignOffset={alignOffset}
      className={cn(
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-48 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in",
        className
      )}
      ref={ref}
      sideOffset={sideOffset}
      {...props}
    />
  </MenubarPrimitive.Portal>
);
MenubarContent.displayName = MenubarPrimitive.Content.displayName;

const MenubarItem = ({
  className,
  inset,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> & {
  inset?: boolean;
} & {
  ref?: React.RefObject<React.ElementRef<typeof MenubarPrimitive.Item> | null>;
}) => (
  <MenubarPrimitive.Item
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
      inset && "pl-8",
      className
    )}
    ref={ref}
    {...props}
  />
);
MenubarItem.displayName = MenubarPrimitive.Item.displayName;

const MenubarCheckboxItem = ({
  className,
  children,
  checked,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem> & {
  ref?: React.RefObject<React.ElementRef<
    typeof MenubarPrimitive.CheckboxItem
  > | null>;
}) => (
  <MenubarPrimitive.CheckboxItem
    checked={checked}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.CheckboxItem>
);
MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName;

const MenubarRadioItem = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem> & {
  ref?: React.RefObject<React.ElementRef<
    typeof MenubarPrimitive.RadioItem
  > | null>;
}) => (
  <MenubarPrimitive.RadioItem
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.RadioItem>
);
MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName;

const MenubarLabel = ({
  className,
  inset,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> & {
  inset?: boolean;
} & {
  ref?: React.RefObject<React.ElementRef<typeof MenubarPrimitive.Label> | null>;
}) => (
  <MenubarPrimitive.Label
    className={cn(
      "px-2 py-1.5 font-semibold text-sm",
      inset && "pl-8",
      className
    )}
    ref={ref}
    {...props}
  />
);
MenubarLabel.displayName = MenubarPrimitive.Label.displayName;

const MenubarSeparator = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator> & {
  ref?: React.RefObject<React.ElementRef<
    typeof MenubarPrimitive.Separator
  > | null>;
}) => (
  <MenubarPrimitive.Separator
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    ref={ref}
    {...props}
  />
);
MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName;

const MenubarShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "ml-auto text-muted-foreground text-xs tracking-widest",
      className
    )}
    {...props}
  />
);
MenubarShortcut.displayname = "MenubarShortcut";

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
};
