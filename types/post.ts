import type React from "react";
import type { PostType } from "@/lib/generated/prisma";

export type PostId = string;

/**
 * Raw data structure of a post as returned by getRawPostDataById or getPostDetailsAction.
 */
export interface PostData {
  createdAt?: Date;
  id: PostId;
  isMdx: boolean;
  lastEdited?: Date;
  rawContent: string;
  tags?: string[];
  title: string;
  type?: PostType;
}

/**
 * A post that has been processed and is ready for rendering in the UI.
 */
export interface RenderedPost {
  categories?: string[];
  createdAt?: Date;
  id: PostId;
  isContentReady: boolean;
  isDismissed: boolean;
  lastEdited?: Date;
  originalId: PostId;
  renderedContent: React.ReactNode | null;
  tags?: string[];
  title: string;
  type?: PostType;
}
