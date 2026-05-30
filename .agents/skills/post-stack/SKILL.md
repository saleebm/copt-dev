---
name: post-stack
description: Post Stack navigation system — XState state machine, URL state, scroll coordination, browser history integration
user-invocable: false
---

# Post Stack System

The core UI paradigm: posts stack on top of each other as the user navigates. Clicking a PostLink pushes a new post onto the stack; browser back/forward pops or restores. Managed by an XState state machine coordinating URL state, scroll behavior, and DOM rendering.

## File Map

| File | Owns | Key exports |
|------|------|-------------|
| `lib/post-stack-machine.ts` | XState machine — states, events, transitions | `postStackMachine`, `PostStackContext`, `PostStackEvent` |
| `lib/url-state-manager.ts` | App-initiated URL writes, navigation direction detection | `UrlStateManager`, `NavigationState`, `NavigationDirection` |
| `lib/scroll-utils.ts` | Scroll execution, AbortController cancellation, visibility scoring | `scrollToElement`, `cancelCurrentScroll`, `waitForPostElement`, `waitForPostStable`, `getMostVisiblePostIndex` |
| `lib/post-stack-utils-client.ts` | Client-side URL parsing, post ID processing, scroll-anchor memory | `parseCurrentUrl`, `captureAnchorForPost`, `restoreAnchorForPost`, `readScrollMemory` |
| `lib/post-stack-utils-server.ts` | Server-side post fetching, MDX rendering | `createRenderedPost`, `fetchPostStack` |
| `components/post-stack/post-stack-provider-xstate.tsx` | React context, XState actor, programmatic-scroll bridge | `usePostStackState`, `usePostStackActions` |
| `components/post-stack/post-stack-observer.tsx` | `scrollend`-driven active-post tracking + anchor capture | `PostStackObserver` |
| `components/post-stack/post-stack-interactive.tsx` | Client-side effect coordinator, hydration guard | `PostStackInteractive` |
| `hooks/use-url-management.ts` | popstate handler, URL push/replace, deferred pushes during scroll | `useUrlManagement` |
| `hooks/use-scroll-management.ts` | Scroll-to-post orchestration, operation ID tracking | `useScrollManagement` |
| `hooks/use-user-scroll-interruption.ts` | Wheel/touch/key interruption → `USER_INTERACTION` / `ENABLE_OBSERVER` | `useUserScrollInterruption` |
| `app/[...postStack]/page.tsx` | Catch-all route entry point | `PostStackPage` |

## Architectural Invariants

These rules must not be violated. They protect against race conditions and state corruption.

1. **URL/history state is canonical at navigation boundaries; machine context drives app-initiated writes.** On direct load and browser back/forward, `history.state.stackIds` (read in `use-url-management.ts`) is the source of truth — the popstate handler hands the stack to the machine via `BROWSER_NAVIGATION`, and the machine rebuilds `posts`/`activePostId` from `postCache`. For app-initiated navigation (clicking a `PostLink`, dismiss), the machine context changes first and `UrlStateManager` then writes the `?stack=slug1,slug2` URL. Note: `UrlStateManager.syncWithUrl()` and `getPostsToLoad()` are currently unused by the live flow.

2. **Scroll locking prevents observer interference.** `isProgrammaticScroll` in machine context gates the `IntersectionObserver` in `post-stack-observer.tsx`. When `true`, observer callbacks are suppressed to prevent them from changing the active post during programmatic scrolls.

3. **Operation ID versioning discards stale completions.** `scrollOperationId` in machine context increments on each scroll operation. `SCROLL_COMPLETE` events carry an `operationId` — the machine ignores completions whose ID doesn't match current.

4. **AbortController cancellation prevents overlapping scrolls.** `cancelCurrentScroll()` in `scroll-utils.ts` aborts in-progress scroll animations via a global `AbortController`. New scrolls always cancel any existing one first.

5. **Pending navigation queue handles rapid browser nav.** `pendingNavigation` in machine context stores a navigation that arrived while a scroll was being cancelled (`cancellingScroll` state). After cancellation completes, the pending navigation replays.

6. **Manual scroll restoration.** `history.scrollRestoration = "manual"` is set in `use-url-management.ts` so the browser never fights programmatic scroll positioning. Reading position is restored from per-post anchors in `history.state.scrollByPostId` (mirrored to `sessionStorage`), not from native scroll restoration.

## Key Types

- `PostStackContext`, `PostStackEvent`, `PostStackInput` — `lib/post-stack-machine.ts`
- `NavigationState`, `NavigationDirection` — `lib/url-state-manager.ts`
- `ScrollState` — `lib/scroll-utils.ts`
- `RenderedPost` — `types/post.ts`
- `PostStackParams`, `ParsedPostIds`, `AnchorState`, `ScrollMemory` — `lib/post-stack-utils-client.ts`

## State Machine Flow

The live machine has **nine** states: `idle`, `loadingPost`, `existingPost`, `scrolling`,
`dismissing`, `processingNavigation`, `restoringScroll`, `cancellingScroll`,
and `error`. There are no `settled`, `settling`, or `settlingScroll` states — scroll
completion is event-driven (`SCROLL_COMPLETE`/`SCROLL_ERROR`) and lands directly back in
`idle`. `cancellingScroll`, `existingPost`, and `processingNavigation` are
transient (`always`) states that advance synchronously after their entry actions.

Key flows (see [`docs/post-stack-statecharts.md`](../../../docs/post-stack-statecharts.md)
for full diagrams and the event inventory):

- **New post (uncached):** `idle` → `loadingPost` → (`POST_LOADED`) → `scrolling` → (`SCROLL_COMPLETE`) → `idle`
- **Cached post (click):** `idle` → `existingPost` → `scrolling` → (`SCROLL_COMPLETE`) → `idle`
- **Dismiss:** `idle` → `dismissing` → (`ANIMATION_COMPLETE`) → `scrolling` → `idle`
- **Browser nav (all cached):** `idle` → `processingNavigation` → `restoringScroll` → (`SCROLL_COMPLETE`) → `idle`
- **Browser nav (missing post):** `idle` → `processingNavigation` → `loadingPost` → `scrolling` → `idle`
- **Browser nav during active scroll:** `scrolling`/`restoringScroll` → `cancellingScroll` → `processingNavigation` → …
- **Browser nav from error:** `error` → `processingNavigation` → `restoringScroll`/`loadingPost` → … (back/forward stays functional after a failed load)
- **Home:** `goHome()` performs a full-page reload (`window.location.href = "/"`); there is no machine state for it.
- **Load error:** `loadingPost` → `error` → (`CLEAR_ERROR`, `ADD_POST`, or `BROWSER_NAVIGATION`) → `idle`/`loadingPost`/`processingNavigation`

## Validation Checklist

Run these probes when working in post-stack code. If any fail, the doc is stale — fix it.

1. **File map:** Do all 12 files in the File Map exist? Do the listed exports still exist in each file?
2. **Context shape:** Does `PostStackContext` in `lib/post-stack-machine.ts` still contain `isProgrammaticScroll`, `scrollOperationId`, `pendingNavigation`? These are the fields the invariants depend on.
3. **Scroll lock gate:** Does `post-stack-observer.tsx` still read `isProgrammaticScroll` and skip observer updates when true?
4. **Operation ID flow:** Does `SCROLL_COMPLETE` event type still carry `operationId`? Does the machine guard against mismatched IDs?
5. **AbortController:** Does `scroll-utils.ts` still export `cancelCurrentScroll` using a module-level `AbortController`?
6. **Popstate handoff:** Does `handleBrowserNavigation` in `use-url-management.ts` read `history.state.stackIds` and dispatch `BROWSER_NAVIGATION`? (There is intentionally **no** popstate debounce or URL-push cooldown anymore — `scrollOperationId` + `cancellingScroll` handle concurrent popstates.) Is `history.scrollRestoration = "manual"` still set?
7. **State names:** Do the nine states in "State Machine Flow" still match the `states:` keys in `lib/post-stack-machine.ts`? Are there still no `settled`/`settling`/`settlingScroll`/`goingHome` states?
8. **Data attributes:** Does `scroll-utils.ts` still query `[data-post-id]` and `[data-post-index]` for DOM targeting?

## References

- [Post Stack Statecharts](../../../docs/post-stack-statecharts.md) — live XState diagrams, full event inventory, sequence flows, race matrix, follow-up candidates
- [Browser Integration Deep Dive](references/browser-integration.md) — popstate handling, scroll cancellation pipeline, race condition guards
