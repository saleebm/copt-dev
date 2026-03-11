"use client";
import { useEffect, useState } from "react";
import { NavigationProvider } from "@/components/navigation/navigation-context";
import { BrowseSection } from "@/components/navigation/sections/browse-section";
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

interface NavigationTabsProps {
  navState?: ReturnType<typeof useMobileNavigationState>;
  onNavigate?: () => void;
}

type TabId = "session" | "browse" | "timeline";

export function NavigationTabs({
  onNavigate,
  navState,
}: NavigationTabsProps = {}) {
  const { addPost, goHome } = usePostStackActions();
  const { categories, tags, postTypeCounts } = usePostStackState();

  // Use persisted state if available (mobile), otherwise use local state (desktop)
  const [localActiveTab, setLocalActiveTab] = useState<TabId>("session");
  const activeTab = navState?.activeTab || localActiveTab;
  const setActiveTab = navState?.setActiveTab || setLocalActiveTab;

  // Restore tab from persisted state on mount
  useEffect(() => {
    if (navState?.isRestored && navState.activeTab) {
      setLocalActiveTab(navState.activeTab);
    }
  }, [navState?.isRestored, navState?.activeTab]);

  const handleHomeClick = () => {
    // Navigate to root without dismissing current posts
    addPost("root");
  };

  const handleCloseAll = () => {
    // Dismiss all posts and return to root view
    goHome();
  };

  const tabs: { id: TabId; label: string; shortLabel: string }[] = [
    { id: "session", label: "SESSION", shortLabel: "S" },
    { id: "browse", label: "BROWSE", shortLabel: "B" },
    { id: "timeline", label: "TIMELINE", shortLabel: "T" },
  ];

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
            <div className="tab-bar flex flex-shrink-0 border-white/20 border-b bg-black">
              {tabs.map((tab) => (
                <button
                  aria-label={tab.label}
                  aria-selected={activeTab === tab.id}
                  className={`flex-1 cursor-pointer border-white/20 border-t border-r border-l px-4 py-3 font-mono text-xs uppercase tracking-wider transition-none ${
                    activeTab === tab.id
                      ? "border-white border-b-black bg-white text-black"
                      : "border-white/20 bg-transparent text-white/60 hover:text-white/80"
                  }
                                    `}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  type="button"
                >
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="md:hidden">{tab.shortLabel}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="tab-content min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-black">
              {activeTab === "session" && (
                <SessionSection onNavigate={onNavigate} />
              )}
              {activeTab === "browse" && (
                <BrowseSection navState={navState} onNavigate={onNavigate} />
              )}
              {activeTab === "timeline" && (
                <TimelineSection onNavigate={onNavigate} />
              )}
            </div>
          </div>
        </NavigationProvider>
      </div>
    </div>
  );
}
