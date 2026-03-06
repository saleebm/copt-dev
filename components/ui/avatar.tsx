"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import type * as React from "react";

import { cn } from "@/lib/utils";

const Avatar = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
  ref?: React.RefObject<React.ElementRef<typeof AvatarPrimitive.Root> | null>;
}) => (
  <AvatarPrimitive.Root
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    ref={ref}
    {...props}
  />
);
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> & {
  ref?: React.RefObject<React.ElementRef<typeof AvatarPrimitive.Image> | null>;
}) => (
  <AvatarPrimitive.Image
    className={cn("aspect-square h-full w-full", className)}
    ref={ref}
    {...props}
  />
);
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
  ref?: React.RefObject<React.ElementRef<
    typeof AvatarPrimitive.Fallback
  > | null>;
}) => (
  <AvatarPrimitive.Fallback
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    ref={ref}
    {...props}
  />
);
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
