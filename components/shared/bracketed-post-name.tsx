"use client";

import { motion } from "motion/react";
import type React from "react";

interface BracketedPostNameProps {
  isActive: boolean;
  postId: string;
}

export const BracketedPostName: React.FC<BracketedPostNameProps> = ({
  postId,
  isActive,
}) => (
  <motion.div
    animate={{ opacity: 1 }}
    className="flex items-center font-mono"
    exit={{ opacity: 0 }}
    initial={{ opacity: 0 }}
    key="content"
    style={{
      fontFeatureSettings: '"liga" 1, "calt" 1, "kern" 1, "ss01" 1, "ss02" 1',
    }}
  >
    <span className="text-muted-foreground/70 transition-colors duration-200 group-hover:text-muted-foreground">
      {"{"}
    </span>
    <span
      className={
        isActive
          ? "font-medium text-primary"
          : "text-primary/70 transition-all duration-200 hover:text-primary hover:tracking-wide"
      }
    >
      {postId}
    </span>
    <span className="text-muted-foreground/70 transition-colors duration-200 group-hover:text-muted-foreground">
      {"}"}
    </span>
  </motion.div>
);
