"use client";

import { motion } from "framer-motion";
import { ChevronUp, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  className?: string;
  isOpen: boolean;
  onClick: () => void;
}

export function FloatingActionButton({
  onClick,
  isOpen,
  className,
}: FloatingActionButtonProps) {
  return (
    <motion.button
      animate={{ opacity: 1, scale: 1, y: 0 }}
      aria-expanded={isOpen}
      aria-label={isOpen ? "Close find posts" : "Open find posts"}
      className={cn(
        "fixed right-6 bottom-6 z-[100]",
        "flex items-center justify-center gap-2",
        "min-h-[56px] min-w-[56px] rounded-full px-4",
        "border-2 border-green-500 bg-black",
        "font-mono text-green-500 text-sm uppercase tracking-wider",
        "shadow-green-500/20 shadow-lg",
        "hover:shadow-green-500/30 hover:shadow-xl",
        "transition-shadow duration-300",
        // Accessibility: Focus states
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        // High contrast mode support
        "contrast-more:border-4 contrast-more:font-bold",
        className
      )}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      onClick={onClick}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        className="relative flex items-center justify-center"
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {isOpen ? (
          <ChevronUp aria-hidden="true" className="h-5 w-5" strokeWidth={2.5} />
        ) : (
          <Search aria-hidden="true" className="h-5 w-5" strokeWidth={2.5} />
        )}
      </motion.div>
      {!isOpen && <span aria-hidden="true">Find</span>}
      {!isOpen && (
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-2 border-green-500"
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      )}

      <span className="sr-only">
        {isOpen ? "Close" : "Open"} find posts drawer
      </span>
    </motion.button>
  );
}
