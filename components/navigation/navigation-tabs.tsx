"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { NavigationProvider } from "@/components/navigation/navigation-context";
import { BrowseSection } from "@/components/navigation/sections/browse-section";
import { SearchSection } from "@/components/navigation/sections/search-section";
// Section components
import { SessionSection } from "@/components/navigation/sections/session-section";
import { TimelineSection } from "@/components/navigation/sections/timeline-section";
import {
  usePostStackActions,
  usePostStackState,
} from "@/components/post-stack/post-stack-provider-xstate";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import type { useMobileNavigationState } from "@/hooks/use-mobile-navigation-state";

type Variant = "desktop" | "mobile";

interface NavigationTabsProps {
  navState?: ReturnType<typeof useMobileNavigationState>;
  onNavigate?: () => void;
  variant?: Variant;
}

type DesktopTabId = "session" | "browse" | "timeline";
type MobileTabId = "topics" | "search" | "reading" | "latest";
type TabId = DesktopTabId | MobileTabId;

interface TabDef {
  id: TabId;
  label: string;
  shortLabel?: string;
}

const GITHUB_REPO_URL = "https://github.com/saleebm/copt-dev";

const DESKTOP_TABS: TabDef[] = [
  { id: "session", label: "SESSION", shortLabel: "S" },
  { id: "browse", label: "BROWSE", shortLabel: "B" },
  { id: "timeline", label: "TIMELINE", shortLabel: "T" },
];

const MOBILE_TABS: TabDef[] = [
  { id: "topics", label: "Topics" },
  { id: "search", label: "Search" },
  { id: "reading", label: "Reading" },
  { id: "latest", label: "Latest" },
];

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      height="16"
      viewBox="0 0 16 16"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>GitHub</title>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function NavigationTabs({
  onNavigate,
  navState,
  variant = "desktop",
}: NavigationTabsProps = {}) {
  const isMobile = variant === "mobile";
  const tabs = isMobile ? MOBILE_TABS : DESKTOP_TABS;
  const defaultTab: TabId = isMobile ? "topics" : "session";

  const { addPost, goHome } = usePostStackActions();
  const { categories, tags, postTypeCounts } = usePostStackState();

  const [localActiveTab, setLocalActiveTab] = useState<TabId>(defaultTab);
  const activeTab: TabId = isMobile
    ? (navState?.activeTab ?? localActiveTab)
    : localActiveTab;
  const setActiveTab = useCallback(
    (tab: TabId) => {
      if (isMobile && navState) {
        navState.setActiveTab(tab as MobileTabId);
      }
      setLocalActiveTab(tab);
    },
    [isMobile, navState]
  );

  // Restore tab from persisted state on mount (mobile only)
  useEffect(() => {
    if (isMobile && navState?.isRestored && navState.activeTab) {
      setLocalActiveTab(navState.activeTab);
    }
  }, [isMobile, navState?.isRestored, navState?.activeTab]);

  const handleHomeClick = () => {
    addPost("root");
  };

  const handleCloseAll = () => {
    goHome();
  };

  const tabButtonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const handleTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      const lastIndex = tabs.length - 1;
      let nextIndex: number | null = null;
      if (event.key === "ArrowRight") {
        nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
      } else if (event.key === "ArrowLeft") {
        nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = lastIndex;
      }
      if (nextIndex === null) {
        return;
      }
      event.preventDefault();
      const nextTab = tabs[nextIndex];
      setActiveTab(nextTab.id);
      tabButtonsRef.current[nextIndex]?.focus();
    },
    [tabs, setActiveTab]
  );

  return (
    <div className="h-full w-full overflow-hidden bg-black font-mono text-white/90">
      <div className="flex h-full min-h-0 flex-col lg:min-w-0">
        {/* Terminal Header - Hidden on mobile */}
        <div className="hidden border-white/20 border-b bg-black p-4 lg:block">
          <div className="mb-3 flex items-center gap-2">
            <span className="terminal-prompt">❯</span>
            <span className="text-sm text-white/60">~/navigation</span>
          </div>
          <div className="mb-4 flex justify-center">
            <Logo
              className="transition-all duration-200"
              imageSize={32}
              layout="auto"
              textSize="xs"
            />
          </div>

          {/* Terminal-style command buttons */}
          <div className="flex flex-col gap-3 text-xs">
            <div className="mb-1 text-white/40">* available commands:</div>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="terminal-prompt-muted select-none"
              >
                $
              </span>
              <Button
                aria-label="Navigate to root page"
                className="terminal-button h-8 px-3 font-mono"
                onClick={handleHomeClick}
                size="sm"
                variant="ghost"
              >
                <span className="whitespace-nowrap">cd ~/</span>
              </Button>
              <Button
                aria-label="Close all posts and return to home"
                className="terminal-button-destructive h-8 px-3 font-mono"
                onClick={handleCloseAll}
                size="sm"
                variant="ghost"
              >
                <span className="whitespace-nowrap">reset</span>
              </Button>
              <a
                aria-label="View source on GitHub"
                className="ml-auto flex h-8 items-center gap-1.5 px-2 font-mono text-white/60 text-xs transition-colors hover:text-white"
                href={GITHUB_REPO_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                <GitHubMark className="h-4 w-4" />
                <span className="whitespace-nowrap">source</span>
              </a>
            </div>
          </div>
        </div>

        {/* Terminal-Style Tabs Navigation */}
        <NavigationProvider
          categories={categories}
          postTypeCounts={postTypeCounts}
          tags={tags}
        >
          <div className="terminal-nav flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-black">
            {/* Tab Bar */}
            <div
              aria-label="Navigation sections"
              className="tab-bar flex flex-shrink-0 border-white/20 border-b bg-black"
              role="tablist"
            >
              {tabs.map((tab, index) => (
                <button
                  aria-controls={`tab-panel-${tab.id}`}
                  aria-label={tab.label}
                  aria-selected={activeTab === tab.id}
                  className={`flex-1 cursor-pointer border-white/20 border-t border-r border-l px-2 py-3 font-mono text-xs tracking-wider transition-none sm:px-4 ${
                    isMobile ? "min-h-[44px] normal-case" : "uppercase"
                  } ${
                    activeTab === tab.id
                      ? "border-white border-b-black bg-white text-black"
                      : "border-white/20 bg-transparent text-white/60 hover:text-white/80"
                  }`}
                  id={`tab-${tab.id}`}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  ref={(el) => {
                    tabButtonsRef.current[index] = el;
                  }}
                  role="tab"
                  tabIndex={0}
                  type="button"
                >
                  {isMobile ? (
                    <span>{tab.label}</span>
                  ) : (
                    <>
                      <span className="hidden md:inline">{tab.label}</span>
                      <span className="md:hidden">
                        {tab.shortLabel ?? tab.label}
                      </span>
                    </>
                  )}
                </button>
              ))}
              {!isMobile && (
                <a
                  aria-label="View source on GitHub"
                  className="flex cursor-pointer items-center justify-center border-white/20 border-t border-r border-l bg-transparent px-4 py-3 font-mono text-white/60 transition-colors hover:text-white/90 lg:hidden"
                  href={GITHUB_REPO_URL}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <GitHubMark className="h-4 w-4" />
                </a>
              )}
            </div>

            {/* Tab Content */}
            <div
              aria-labelledby={`tab-${activeTab}`}
              className="tab-content min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-black"
              id={`tab-panel-${activeTab}`}
              role="tabpanel"
            >
              {/* Desktop tabs */}
              {!isMobile && activeTab === "session" && (
                <SessionSection onNavigate={onNavigate} />
              )}
              {!isMobile && activeTab === "browse" && (
                <BrowseSection navState={navState} onNavigate={onNavigate} />
              )}
              {!isMobile && activeTab === "timeline" && (
                <TimelineSection onNavigate={onNavigate} />
              )}
              {/* Mobile tabs */}
              {isMobile && activeTab === "topics" && (
                <BrowseSection navState={navState} onNavigate={onNavigate} />
              )}
              {isMobile && activeTab === "search" && (
                <SearchSection navState={navState} onNavigate={onNavigate} />
              )}
              {isMobile && activeTab === "reading" && (
                <SessionSection onNavigate={onNavigate} />
              )}
              {isMobile && activeTab === "latest" && (
                <TimelineSection onNavigate={onNavigate} />
              )}
            </div>
          </div>
        </NavigationProvider>
      </div>
    </div>
  );
}
