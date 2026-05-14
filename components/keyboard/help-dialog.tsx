"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { useKeyboardContext } from "@/lib/keyboard/keyboard-context";
import {
  GROUP_ORDER,
  type ShortcutDescriptor,
  type ShortcutGroupId,
} from "@/lib/keyboard/shortcuts-registry";

function groupShortcuts(
  shortcuts: ShortcutDescriptor[]
): Map<ShortcutGroupId, ShortcutDescriptor[]> {
  const groups = new Map<ShortcutGroupId, ShortcutDescriptor[]>();
  for (const s of shortcuts) {
    const existing = groups.get(s.group) ?? [];
    existing.push(s);
    groups.set(s.group, existing);
  }
  return groups;
}

export function HelpDialog() {
  const { openOverlay, setOverlay, getAll } = useKeyboardContext();
  const isOpen = openOverlay === "help";

  const grouped = useMemo(() => {
    if (!isOpen) {
      return new Map<ShortcutGroupId, ShortcutDescriptor[]>();
    }
    const all = getAll();
    const visible = all.filter(
      (s) => s.description && !s.id.startsWith("close-overlay")
    );
    return groupShortcuts(visible);
  }, [isOpen, getAll]);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setOverlay(null);
        }
      }}
      open={isOpen}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono">Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Move through the site without lifting your hands.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {GROUP_ORDER.map((groupId) => {
            const shortcuts = grouped.get(groupId);
            if (!shortcuts || shortcuts.length === 0) {
              return null;
            }
            return (
              <section className="mb-6 last:mb-0" key={groupId}>
                <h3 className="mb-2 font-mono text-muted-foreground text-xs uppercase tracking-wider">
                  {groupId}
                </h3>
                <ul className="space-y-1.5">
                  {shortcuts.map((s) => (
                    <li
                      className="flex items-center justify-between gap-4 rounded px-2 py-1 hover:bg-muted/40"
                      key={s.id}
                    >
                      <span className="text-sm">{s.description}</span>
                      <span className="flex items-center gap-1">
                        {s.keys.map((k) => (
                          <Kbd combo={k} key={`${s.id}-${k}`} />
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
