"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, Terminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const [isVisible, setIsVisible] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;

      // Track if user has scrolled down the page
      if (currentScrollY > 100) {
        setHasScrolled(true);
      } else {
        setHasScrolled(false);
      }

      // Hide on scroll down, show on scroll up
      if (scrollDelta > 10 && currentScrollY > 100) {
        setIsVisible(false);
      } else if (scrollDelta < -10) {
        setIsVisible(true);
      }

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Show button after scroll stops
      scrollTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 1500);

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          animate={{
            opacity: hasScrolled ? 0.85 : 1,
            scale: 1,
            y: 0,
          }}
          aria-expanded={isOpen}
          aria-label={
            isOpen ? "Close terminal navigation" : "Open terminal navigation"
          }
          className={cn(
            "fixed right-6 bottom-6 z-[100]",
            "flex items-center justify-center",
            "h-14 w-14 rounded-full",
            "border-2 border-green-500 bg-black",
            "text-green-500",
            "shadow-green-500/20 shadow-lg",
            "hover:shadow-green-500/30 hover:shadow-xl",
            "transition-shadow duration-300",
            // Accessibility: Focus states
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
            // High contrast mode support
            "contrast-more:border-4 contrast-more:font-bold",
            className
          )}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          onClick={onClick}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
          }}
          whileHover={{
            opacity: 1,
            scale: 1.05,
            transition: { duration: 0.2 },
          }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            className="relative"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Primary icon */}
            {isOpen ? (
              <ChevronUp
                aria-hidden="true"
                className="h-6 w-6"
                strokeWidth={2.5}
              />
            ) : (
              <Terminal
                aria-hidden="true"
                className="h-6 w-6"
                strokeWidth={2.5}
              />
            )}

            {/* Pulsing indicator when closed */}
            {!isOpen && (
              <motion.div
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.7, 0, 0.7],
                }}
                aria-hidden="true"
                className="absolute inset-0 rounded-full border-2 border-green-500"
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
            )}
          </motion.div>

          {/* Screen reader text */}
          <span className="sr-only">
            {isOpen ? "Close" : "Open"} mobile navigation menu
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
