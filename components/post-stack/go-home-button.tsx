"use client";

import { motion } from "motion/react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/lib/animations";

interface GoHomeButtonProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void; // Allow override of the default behavior
  size?: "default" | "sm" | "lg" | "icon";
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}

export function GoHomeButton({
  children = "Go Home",
  className,
  variant = "default",
  size = "default",
  onClick,
}: GoHomeButtonProps) {
  const handleGoHome = () => {
    if (onClick) {
      onClick();
      return;
    }

    // Do a hard refresh to completely clear all state and return to root
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <Button
      asChild
      className={className}
      onClick={handleGoHome}
      size={size}
      variant={variant}
    >
      <motion.button
        initial="idle"
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
      >
        {children}
      </motion.button>
    </Button>
  );
}
