"use client";

import { useCallback, useMemo, useState } from "react";
import { usePostStackState } from "@/components/post-stack/post-stack-provider-xstate";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useNavClick } from "@/hooks/use-nav-click";
import { formatDateWithoutTimezone } from "@/lib/date-utils";
import type { PostType } from "@/lib/generated/prisma";
import { cn } from "@/lib/utils";
import navStyles from "@/styles/navigation.module.css";
import type { PostForNavigation } from "./navigation-shared-components";
import { PostListItem } from "./navigation-shared-components";

type Grouping = "day" | "week" | "month";

type ChroniclePost = {
  id: string;
  slug: string;
  title: string;
  type: PostType;
  originalDate: Date;
  tags: Array<{ name: string }>;
  categories: Array<{ name: string }>;
};

// Compute a grouping key given a date
function getGroupKey(date: Date, mode: Grouping): string {
  const yr = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  if (mode === "day") {
    return `${yr}-${mo}-${dd}`;
  }
  if (mode === "month") {
    return `${yr}-${mo}`;
  }
  // ISO week approx: week starting Monday; simple calc using UTC
  const d = new Date(Date.UTC(yr, date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // 0..6, Monday=0
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86_400_000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7
    );
  return `${yr}-W${String(weekNum).padStart(2, "0")}`;
}

function getGroupLabel(date: Date, mode: Grouping): string {
  if (mode === "day") {
    return formatDateWithoutTimezone(date, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  if (mode === "month") {
    return formatDateWithoutTimezone(date, { year: "numeric", month: "long" });
  }
  // week label: week of MMM DD, YYYY
  return `Week of ${formatDateWithoutTimezone(date, { year: "numeric", month: "short", day: "numeric" })}`;
}

type ChronicleTabProps = {
  onNavigate?: () => void;
};

export function ChronicleTab({ onNavigate }: ChronicleTabProps = {}) {
  const [grouping, setGrouping] = useState<Grouping>("day");
  const { chronicleData } = usePostStackState();
  const { handleClickId } = useNavClick(onNavigate);

  // Transform server data to ChroniclePost format
  const posts = useMemo(
    () =>
      chronicleData.map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        type: post.type as PostType,
        originalDate: post.originalDate,
        tags: post.tags,
        categories: post.categories,
      })),
    [chronicleData]
  );

  const grouped = useMemo(() => {
    if (!posts) {
      return [] as Array<{ key: string; date: Date; items: ChroniclePost[] }>;
    }
    const map = new Map<string, { date: Date; items: ChroniclePost[] }>();
    for (const p of posts) {
      const d = new Date(p.originalDate);
      const key = getGroupKey(d, grouping);
      if (!map.has(key)) {
        map.set(key, { date: d, items: [] });
      }
      map.get(key)?.items.push(p);
    }
    const arr = Array.from(map.entries()).map(([key, v]) => ({
      key,
      date: v.date,
      items: v.items,
    }));
    // Sort by date desc
    arr.sort((a, b) => b.date.getTime() - a.date.getTime());
    return arr;
  }, [posts, grouping]);

  const onPostClick = useCallback(
    (post: PostForNavigation) => {
      handleClickId(post.id).catch(() => {
        // Silently handle navigation errors
      });
    },
    [handleClickId]
  );

  // No loading states needed - data is provided from server
  if (!posts || posts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="p-4 text-center text-white/40 text-xs">
          <span className="mb-2 block">∅</span>
          <span>No chronicle entries</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-black">
      {/* Controls */}
      <div className="border-white/10 border-b p-3">
        <div className="mb-2 flex items-center gap-2 text-white/40 text-xs">
          <span className="terminal-prompt">❯</span>
          <span>./chronicle</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/60">group:</span>
          {(["day", "week", "month"] as Grouping[]).map((g) => (
            <button
              aria-label={`Group by ${g}`}
              className={cn(
                "border px-2 py-1 font-mono text-xs transition-colors",
                grouping === g
                  ? "terminal-active-item"
                  : "border-white/20 text-white/60 hover:border-white/40 hover:text-white/90"
              )}
              key={g}
              onClick={() => setGrouping(g)}
              type="button"
            >
              [{g}]
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="p-4 text-center text-white/40 text-xs">
            <span className="mb-2 block">∅</span>
            <span>No chronicle groups</span>
          </div>
        ) : (
          <div className="p-2">
            <Accordion className="w-full" type="multiple">
              {grouped.map((group) => (
                <AccordionItem
                  className="border-white/10"
                  key={group.key}
                  value={group.key}
                >
                  {/* Header row: Trigger (button) + separate summary button as sibling */}
                  <div className={navStyles.chronicleGroupHeader}>
                    <AccordionTrigger className="flex-1 px-2 text-left">
                      <span className="text-sm text-white/80">
                        {getGroupLabel(group.date, grouping)}
                      </span>
                    </AccordionTrigger>
                    {/* Summary button outside of Trigger to avoid button-in-button */}
                    <button
                      aria-label="Open daily summary"
                      className={navStyles.chronicleSummaryButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        const summary = group.items.find(
                          (p) =>
                            p.slug.startsWith("findings-") ||
                            p.slug.startsWith("sights-")
                        );
                        if (summary) {
                          onPostClick({
                            id: summary.slug,
                            slug: summary.slug,
                            title: summary.title,
                            type: summary.type,
                            lastEdited: summary.originalDate,
                            tags: summary.tags,
                            categories: summary.categories,
                          });
                        }
                      }}
                      type="button"
                    >
                      [summary]
                    </button>
                  </div>
                  <AccordionContent>
                    <div style={{ paddingTop: 4, paddingBottom: 8 }}>
                      {group.items.map((p) => (
                        <PostListItem
                          key={p.slug}
                          onClick={onPostClick}
                          post={{
                            id: p.slug,
                            slug: p.slug,
                            title: p.title,
                            type: p.type,
                            lastEdited: p.originalDate,
                            tags: p.tags,
                            categories: p.categories,
                          }}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
}
