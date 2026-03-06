"use client";

import { motion } from "motion/react";
import type React from "react";

type BracketedPostNameProps = {
  postId: string;
  isActive: boolean;
};

export const BracketedPostName: React.FC<BracketedPostNameProps> = ({
  postId,
  isActive,
}) => (
  <motion.div
    animate={{ opacity: 1 }}
    className="flex items-center"
    exit={{ opacity: 0 }}
    initial={{ opacity: 0 }}
    key="content"
  >
    <span className="text-muted-foreground">{"{"}</span>
    <span
      className={
        isActive
          ? "font-medium text-primary"
          : "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      }
    >
      {postId}
    </span>
    <span className="text-muted-foreground">{"}"}</span>
  </motion.div>
);
