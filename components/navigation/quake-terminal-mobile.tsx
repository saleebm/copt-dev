"use client";

import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { useMobileNavigationState } from "@/hooks/use-mobile-navigation-state";
import { cn } from "@/lib/utils";
import { NavigationTabs } from "./navigation-tabs";
import "@/styles/quake-terminal-animations.css";

export function QuakeTerminalMobile() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollYRef = useRef(0);
  const originalOverflowRef = useRef<string>("");

  // Use mobile navigation state persistence
  const navState = useMobileNavigationState();

  // Handle scroll to hide/show header with proper cleanup
  useEffect(() => {
    let mounted = true;

    const handleScroll = () => {
      if (!mounted) {
        return;
      }

      const currentScrollY = window.scrollY;

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Hide header when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollYRef.current && currentScrollY > 50) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);

        // Auto-hide after 3 seconds if not at top
        if (currentScrollY > 50 && !isOpen) {
          timeoutRef.current = setTimeout(() => {
            if (mounted) {
              setIsHeaderVisible(false);
            }
          }, 3000);
        }
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      mounted = false;
      window.removeEventListener("scroll", handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isOpen]);

  // Handle body scroll locking without direct DOM manipulation
  // Using useLayoutEffect to ensure this happens before paint
  useLayoutEffect(() => {
    if (!document?.body) {
      return;
    }

    if (isOpen) {
      // Store original overflow value
      originalOverflowRef.current = document.body.style.overflow || "";

      // Create a style element to control body overflow
      const styleEl = document.createElement("style");
      styleEl.id = "quake-terminal-scroll-lock";
      styleEl.textContent = "body { overflow: hidden !important; }";
      document.head.appendChild(styleEl);

      setIsHeaderVisible(true); // Keep header visible when open

      return () => {
        // Clean up the style element
        const existingStyle = document.getElementById(
          "quake-terminal-scroll-lock"
        );
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, [isOpen]);

  const openTerminal = useCallback(() => {
    if (isClosing) {
      return; // Prevent opening while closing animation is in progress
    }
    setIsOpen(true);
    setIsClosing(false);
    navState.onMenuOpen(); // Clear scroll restoration flags
  }, [isClosing, navState]);

  const closeTerminal = useCallback(() => {
    if (!isOpen || isClosing) {
      return;
    }

    // Start closing animation
    setIsClosing(true);
    navState.recordClose();

    // Clear any existing timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    // Complete the close after animation
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300); // Match --quake-close-duration
  }, [isOpen, isClosing, navState]);

  const toggleTerminal = useCallback(() => {
    if (isOpen) {
      closeTerminal();
    } else {
      openTerminal();
    }
  }, [isOpen, openTerminal, closeTerminal]);

  // Auto-close handler for navigation
  const handleNavigate = useCallback(() => {
    // Add small delay to ensure navigation action is processed
    setTimeout(() => {
      closeTerminal();
    }, 50);
  }, [closeTerminal]);

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    },
    []
  );

  return (
    <div className="lg:hidden">
      {/* Fixed Header with Toggle Button */}
      <div
        className={cn(
          "quake-header fixed top-0 right-0 left-0 z-[60]",
          isHeaderVisible ? "quake-header-slide-in" : "quake-header-slide-out",
          "border-green-500/30 border-b bg-black/95 backdrop-blur-sm"
        )}
        ref={headerRef}
      >
        <button
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close terminal" : "Open terminal"}
          className="flex w-full items-center justify-center gap-2 py-2 font-mono text-green-500 text-xs uppercase tracking-wider"
          onClick={toggleTerminal}
          type="button"
        >
          <span className="terminal-prompt">❯</span>
          <span>terminal</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-300",
              isOpen ? "rotate-180" : ""
            )}
          />
          <ChevronDown
            className={cn(
              "-ml-2 h-4 w-4 transition-transform duration-300",
              isOpen ? "rotate-180" : ""
            )}
          />
        </button>
      </div>

      {/* Backdrop */}
      {(isOpen || isClosing) && (
        <div
          aria-hidden="true"
          className={cn(
            "quake-backdrop fixed inset-0 z-[55] bg-black/50",
            isClosing && "opacity-0 transition-opacity duration-200"
          )}
          onClick={toggleTerminal}
        />
      )}

      {/* Quake Terminal Dropdown */}
      <div
        className={cn(
          "quake-terminal fixed top-0 right-0 left-0 z-[58]",
          "max-h-[85vh]",
          isOpen && !isClosing && "quake-terminal-opening pointer-events-auto",
          isClosing && "quake-terminal-closing pointer-events-none",
          !(isOpen || isClosing) &&
            "pointer-events-none -translate-y-full transform opacity-0"
        )}
      >
        {/* Terminal Container */}
        <div className="relative border-green-500/50 border-b-2 bg-black shadow-[0_0_40px_rgba(0,255,0,0.15)]">
          {/* CRT Effects */}
          <div className="terminal-crt-glow" />
          <div className="terminal-scanline" />

          {/* Terminal Header Bar */}
          <div
            className={cn(
              "flex items-center justify-between border-green-500/30 border-b bg-black px-4 py-2",
              isOpen && !isClosing && "terminal-flicker"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-green-500 text-xs">
                QUAKE://TERMINAL
              </span>
              <span className="terminal-cursor font-mono text-green-500/50 text-xs">
                ▊
              </span>
            </div>
            <button
              aria-label="Close terminal"
              className="font-mono text-green-500 text-xs transition-colors hover:text-green-400"
              onClick={toggleTerminal}
              type="button"
            >
              [ESC]
            </button>
          </div>

          {/* Navigation Content */}
          <div className="h-[calc(85vh-3rem)] overflow-hidden">
            <NavigationTabs navState={navState} onNavigate={handleNavigate} />
          </div>
        </div>

        {/* Terminal Shadow Effect */}
        <div className="pointer-events-none absolute inset-x-0 -bottom-8 h-8 bg-gradient-to-b from-black/20 to-transparent" />
      </div>

      {/* Floating Action Button - only shows when regular nav is hidden */}
      {!isHeaderVisible && (
        <FloatingActionButton isOpen={isOpen} onClick={toggleTerminal} />
      )}
    </div>
  );
}
