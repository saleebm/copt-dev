export const ShortcutGroup = {
  Global: "Global",
  Stack: "Post stack",
  Search: "Search",
} as const;

export type ShortcutGroupId = (typeof ShortcutGroup)[keyof typeof ShortcutGroup];

export const GROUP_ORDER: ShortcutGroupId[] = [
  ShortcutGroup.Global,
  ShortcutGroup.Stack,
  ShortcutGroup.Search,
];

export const SHORTCUT_IDS = {
  showHelp: "show-help",
  showHelpAlias: "show-help-alias",
  openPalette: "open-palette",
  closeOverlay: "close-overlay",
  toggleSidebar: "toggle-sidebar",
  stackNext: "stack-next",
  stackPrev: "stack-prev",
  stackTop: "stack-top",
  stackBottom: "stack-bottom",
  stackDismiss: "stack-dismiss",
  stackHome: "stack-home",
  stackJump: (n: number) => `stack-jump-${n}` as const,
} as const;

export type ShortcutKey = string;

export interface ShortcutDescriptor {
  id: string;
  keys: ShortcutKey[];
  group: ShortcutGroupId;
  description: string;
  label?: string;
  handler: (event: KeyboardEvent) => void;
  when?: () => boolean;
  allowInInput?: boolean;
  preventDefault?: boolean;
}
