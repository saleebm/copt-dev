"use client";

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { toggleVariants } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
});

const ToggleGroup = ({
  className,
  variant,
  size,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants> & {
    ref?: React.RefObject<React.ElementRef<
      typeof ToggleGroupPrimitive.Root
    > | null>;
  }) => (
  <ToggleGroupPrimitive.Root
    className={cn("flex items-center justify-center gap-1", className)}
    ref={ref}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
);

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = ({
  className,
  children,
  variant,
  size,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants> & {
    ref?: React.RefObject<React.ElementRef<
      typeof ToggleGroupPrimitive.Item
    > | null>;
  }) => {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
};

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
