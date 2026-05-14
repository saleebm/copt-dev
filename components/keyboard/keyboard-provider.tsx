"use client";

import dynamic from "next/dynamic";
import type React from "react";
import { Announcer } from "@/components/keyboard/announcer";
import { GlobalShortcuts } from "@/components/keyboard/global-shortcuts";
import { SkipLink } from "@/components/keyboard/skip-link";
import { KeyboardContextProvider } from "@/lib/keyboard/keyboard-context";

const HelpDialog = dynamic(
  () =>
    import("@/components/keyboard/help-dialog").then((m) => ({
      default: m.HelpDialog,
    })),
  { ssr: false }
);

interface KeyboardProviderProps {
  children: React.ReactNode;
}

export function KeyboardProvider({ children }: KeyboardProviderProps) {
  return (
    <KeyboardContextProvider>
      <SkipLink />
      {children}
      <Announcer />
      <GlobalShortcuts />
      <HelpDialog />
    </KeyboardContextProvider>
  );
}
