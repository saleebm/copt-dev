"use client";

import { OTPInput, OTPInputContext } from "input-otp";
import { Dot } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const InputOTP = ({
  className,
  containerClassName,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof OTPInput> & {
  ref?: React.RefObject<React.ElementRef<typeof OTPInput> | null>;
}) => (
  <OTPInput
    className={cn("disabled:cursor-not-allowed", className)}
    containerClassName={cn(
      "flex items-center gap-2 has-disabled:opacity-50",
      containerClassName
    )}
    ref={ref}
    {...props}
  />
);
InputOTP.displayName = "InputOTP";

const InputOTPGroup = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  ref?: React.RefObject<React.ElementRef<"div"> | null>;
}) => (
  <div className={cn("flex items-center", className)} ref={ref} {...props} />
);
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = ({
  index,
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { index: number } & {
  ref?: React.RefObject<React.ElementRef<"div"> | null>;
}) => {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index];

  return (
    <div
      className={cn(
        "relative flex h-10 w-10 items-center justify-center border-input border-y border-r text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-2 ring-ring ring-offset-background",
        className
      )}
      ref={ref}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
};
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = ({
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  ref?: React.RefObject<React.ElementRef<"div"> | null>;
}) => (
  <div ref={ref} role="presentation" {...props}>
    <Dot />
  </div>
);
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
