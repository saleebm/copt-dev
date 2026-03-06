"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import type React from "react";
import { useEffect, useState } from "react";
import { usePostStackActions } from "@/components/post-stack/post-stack-provider-xstate";
import logoImage from "@/public/post-pics/golden_red_light_eye.svg";

type LogoProps = {
  className?: string;
  imageSize?: number;
  textSize?: "xs" | "sm" | "base" | "lg";
  layout?: "horizontal" | "vertical" | "auto";
  onClick?: () => void;
};

export function Logo({
  className = "",
  imageSize = 32,
  textSize = "base",
  layout = "auto",
  onClick,
}: LogoProps) {
  const { addPost } = usePostStackActions();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Prevent FOUC by only showing after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    addPost("root");
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  };

  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
  };

  const letters = "COPT.DEV".split("");

  // Generate random hue offsets for each letter
  const letterHues = letters.map(
    (_, index) => (index * 51 + Math.random() * 30) % 360
  );

  // Container variants for staggered animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.1,
        delayChildren: shouldReduceMotion ? 0 : 0.2,
      },
    },
  };

  // Letter variants for drop animation
  const letterVariants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -20,
      scale: shouldReduceMotion ? 1 : 0.8,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: shouldReduceMotion ? ("tween" as const) : ("spring" as const),
        damping: 15,
        stiffness: 200,
      },
    },
  };

  // Image variants
  const imageVariants = {
    hidden: {
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 0.5,
      rotate: shouldReduceMotion ? 0 : -10,
    },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: shouldReduceMotion ? ("tween" as const) : ("spring" as const),
        damping: 12,
        stiffness: 150,
        delay: 0.1,
      },
    },
  };

  // Don't render until mounted to prevent FOUC
  if (!isMounted) {
    return (
      <div
        aria-hidden="true"
        className={`flex items-center justify-center gap-2 ${className}`}
        style={{
          width: layout === "horizontal" ? "auto" : "fit-content",
          height: imageSize + 8, // Reserve space to prevent layout shift
        }}
      />
    );
  }

  const isActive = isHovered || isFocused;
  const shouldUseVertical =
    layout === "vertical" || (layout === "auto" && imageSize < 24);

  return (
    <AnimatePresence>
      <motion.button
        animate="visible"
        aria-label="Navigate to home page (root post)"
        className={`flex items-center justify-center gap-2 rounded-md p-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${shouldUseVertical ? "flex-col" : "flex-row"}
                    ${className}
                `}
        initial="hidden"
        onBlur={() => setIsFocused(false)}
        onClick={handleClick}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={0}
        title="Navigate to home page (root post)"
        variants={containerVariants}
        whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
      >
        {/* Logo Image */}
        <motion.div className="flex-shrink-0" variants={imageVariants}>
          <Image
            alt="COPT.DEV Logo"
            className="object-contain"
            height={imageSize}
            priority
            src={logoImage}
            style={{
              width: imageSize,
              height: "auto",
              maxWidth: "100%",
            }}
            width={imageSize}
          />
        </motion.div>

        {/* Text */}
        <motion.div
          aria-hidden="true"
          className={`flex select-none items-center font-bold tracking-wider ${textSizeClasses[textSize]}
                        ${shouldUseVertical ? "mt-1" : "ml-1"}
                    `}
          variants={containerVariants} // Screen readers will use the button's aria-label instead
        >
          {letters.map((letter, index) => (
            <motion.span
              className={`rainbow-text inline-block transition-all duration-300 ease-out ${isActive && !shouldReduceMotion ? "rainbow-text-active" : ""}
                            `}
              key={`logo-letter-${index}-${letter}`}
              style={
                {
                  "--hue-offset": `${letterHues[index]}deg`,
                  "--animation-delay": `${index * 0.1}s`,
                } as React.CSSProperties
              }
              variants={letterVariants}
              whileHover={
                shouldReduceMotion
                  ? {}
                  : {
                      y: -2,
                      transition: {
                        type: "spring",
                        stiffness: 400,
                        damping: 10,
                      },
                    }
              }
            >
              {letter === "." ? "." : letter}
            </motion.span>
          ))}
        </motion.div>
      </motion.button>
    </AnimatePresence>
  );
}
