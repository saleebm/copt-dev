/**
 * Global type declarations for runtime globals
 */

import type { postStackMachine } from "@/lib/post-stack-machine";

// Type for the post stack actor instance
export type PostStackActor = ReturnType<
  typeof import("xstate").createActor<typeof postStackMachine>
>;

declare global {
  // eslint-disable-next-line no-var
  var __postStackActor: PostStackActor | undefined;

  interface Window {
    __lastStateChangeTime?: number;
  }
}
