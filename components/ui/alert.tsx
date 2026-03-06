import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:top-4 [&>svg]:left-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = ({
  className,
  variant,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    ref?: React.RefObject<HTMLDivElement | null>;
  }) => (
  <div
    className={cn(alertVariants({ variant }), className)}
    ref={ref}
    role="alert"
    {...props}
  />
);
Alert.displayName = "Alert";

const AlertTitle = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & {
  ref?: React.RefObject<HTMLParagraphElement | null>;
}) => (
  <h5
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    ref={ref}
    {...props}
  />
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.RefObject<HTMLParagraphElement | null>;
}) => (
  <div
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    ref={ref}
    {...props}
  />
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
