/**
 * Centralized Animation Library
 * Provides consistent Motion variants and utilities for smooth animations
 */

import type { Variants } from "motion/react";

// Common easing functions
export const EASINGS = {
  smooth: [0.25, 0.46, 0.45, 0.94],
  snappy: [0.25, 0.1, 0.25, 1],
  bouncy: [0.68, -0.55, 0.265, 1.55],
  gentle: [0.16, 1, 0.3, 1],
} as const;

// Common durations
export const DURATIONS = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
} as const;

// Base transition configs
export const TRANSITIONS = {
  fast: {
    duration: DURATIONS.fast,
    ease: EASINGS.snappy,
  },
  smooth: {
    duration: DURATIONS.normal,
    ease: EASINGS.smooth,
  },
  snappy: {
    duration: DURATIONS.fast,
    ease: EASINGS.snappy,
  },
  bouncy: {
    duration: DURATIONS.slow,
    ease: EASINGS.bouncy,
  },
  layout: {
    duration: DURATIONS.normal,
    ease: EASINGS.gentle,
  },
} as const;

// Fade animations
export const fadeVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: TRANSITIONS.smooth,
  },
  exit: {
    opacity: 0,
    transition: TRANSITIONS.fast,
  },
};

// Slide animations
export const slideUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: TRANSITIONS.smooth,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: TRANSITIONS.fast,
  },
};

export const slideDownVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: TRANSITIONS.smooth,
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: TRANSITIONS.fast,
  },
};

export const slideLeftVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: TRANSITIONS.smooth,
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: TRANSITIONS.fast,
  },
};

export const slideRightVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: TRANSITIONS.smooth,
  },
  exit: {
    opacity: 0,
    x: 10,
    transition: TRANSITIONS.fast,
  },
};

// Scale animations
export const scaleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: TRANSITIONS.smooth,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: TRANSITIONS.fast,
  },
};

export const scaleBounceVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: TRANSITIONS.bouncy,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: TRANSITIONS.fast,
  },
};

// Stagger animations for containers
export const staggerContainerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      ...TRANSITIONS.smooth,
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      ...TRANSITIONS.fast,
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: TRANSITIONS.smooth,
  },
  exit: {
    opacity: 0,
    y: -5,
    transition: TRANSITIONS.fast,
  },
};

// Post-specific animations - Optimized for performance and smooth rendering
export const postCardVariants: Variants = {
  hidden: {
    opacity: 0,
    transform: "translateY(20px) scale(0.98)",
  },
  visible: {
    opacity: 1,
    transform: "translateY(0px) scale(1)",
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
      opacity: { duration: 0.3 },
      transform: { duration: 0.4 },
    },
  },
  exit: {
    opacity: 0,
    transform: "translateY(-10px) scale(0.95)",
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const postHeaderVariants: Variants = {
  hidden: {
    opacity: 0,
    transform: "translateY(-10px)",
  },
  visible: {
    opacity: 1,
    transform: "translateY(0px)",
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
      delay: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transform: "translateY(-5px)",
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const postContentVariants: Variants = {
  hidden: {
    opacity: 0,
    transform: "translateY(15px)",
  },
  visible: {
    opacity: 1,
    transform: "translateY(0px)",
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
      delay: 0.15,
    },
  },
  exit: {
    opacity: 0,
    transform: "translateY(10px)",
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const postFooterVariants: Variants = {
  hidden: {
    opacity: 0,
    transform: "translateY(10px)",
  },
  visible: {
    opacity: 1,
    transform: "translateY(0px)",
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
      delay: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transform: "translateY(5px)",
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

// Enhanced staggered content animations for smooth MDX content reveal
export const postContentStaggerContainer: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
      delay: 0.2,
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1],
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const postContentStaggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

// New optimized variants for client-side post entrance
export const clientPostEntrance: Variants = {
  hidden: {
    opacity: 0,
    transform: "translateY(30px) scale(0.96)",
  },
  visible: {
    opacity: 1,
    transform: "translateY(0px) scale(1)",
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1], // Gentle easing for smooth entrance
      opacity: { duration: 0.3 },
      transform: { duration: 0.5 },
    },
  },
};

// Accent bar animation for visual polish
export const accentBarVariants: Variants = {
  hidden: {
    transform: "scaleY(0)",
    opacity: 0.6,
  },
  visible: {
    transform: "scaleY(1)",
    opacity: 0.8,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
      delay: 0.4,
    },
  },
  hover: {
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

// Button animations
export const buttonVariants: Variants = {
  idle: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: TRANSITIONS.fast,
  },
  tap: {
    scale: 0.98,
    transition: TRANSITIONS.fast,
  },
};

export const iconButtonVariants: Variants = {
  idle: {
    scale: 1,
    rotate: 0,
  },
  hover: {
    scale: 1.1,
    transition: TRANSITIONS.fast,
  },
  tap: {
    scale: 0.9,
    transition: TRANSITIONS.fast,
  },
};

// Utility functions
export function createDelayedVariant(
  baseVariant: Variants,
  delay: number
): Variants {
  return {
    ...baseVariant,
    visible: {
      ...baseVariant.visible,
      transition: {
        ...(typeof baseVariant.visible === "object" &&
        baseVariant.visible !== null &&
        "transition" in baseVariant.visible
          ? baseVariant.visible.transition
          : {}),
        delay,
      },
    },
  };
}

export function createStaggerVariant(
  staggerDelay = 0.1,
  childDelay = 0
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: childDelay,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: staggerDelay / 2,
        staggerDirection: -1,
      },
    },
  };
}

// Presets for common UI elements
export const UI_ANIMATIONS = {
  card: postCardVariants,
  header: postHeaderVariants,
  content: postContentVariants,
  footer: postFooterVariants,
  button: buttonVariants,
  iconButton: iconButtonVariants,
  fadeIn: fadeVariants,
  slideUp: slideUpVariants,
  slideDown: slideDownVariants,
  slideLeft: slideLeftVariants,
  slideRight: slideRightVariants,
  scale: scaleVariants,
  scaleBounce: scaleBounceVariants,
  staggerContainer: staggerContainerVariants,
  staggerItem: staggerItemVariants,
  clientPostEntrance,
  accentBar: accentBarVariants,
  postContentStaggerContainer,
  postContentStaggerItem,
} as const;

export type AnimationPreset = keyof typeof UI_ANIMATIONS;
