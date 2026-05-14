"use client";

import dynamic from "next/dynamic";
import { StackShortcuts } from "@/components/keyboard/stack-shortcuts";

const CommandPalette = dynamic(
  () =>
    import("@/components/keyboard/command-palette").then((m) => ({
      default: m.CommandPalette,
    })),
  { ssr: false }
);

export function PostStackKeyboard() {
  return (
    <>
      <StackShortcuts />
      <CommandPalette />
    </>
  );
}
