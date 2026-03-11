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
| `lib/url-state-manager.ts` | URL as single source of truth, navigation direction detection | `UrlStateManager`, `NavigationState`, `NavigationDirection` |
| `lib/scroll-utils.ts` | Scroll execution, AbortController cancellation, visibility scoring | `scrollToElement`, `cancelCurrentScroll`, `waitForPostElement`, `getMostVisiblePostIndex` |
| `lib/post-stack-utils-client.ts` | Client-side URL parsing, post ID processing | `parseCurrentUrl`, `ParsedPostIds`, `PostStackParams` |
| `lib/post-stack-utils-server.ts` | Server-side post fetching, MDX rendering | `createRenderedPost`, `fetchPostStack` |
| `components/post-stack/post-stack-provider-xstate.tsx` | React context, XState actor, hooks for state/actions | `usePostStackState`, `usePostStackActions` |
| `components/post-stack/post-stack-observer.tsx` | IntersectionObserver — tracks which post is "active" | `PostStackObserver` |
| `components/post-stack/post-stack-interactive.tsx` | Client-side effect coordinator, hydration guard | `PostStackInteractive` |
| `hooks/use-url-management.ts` | popstate handler, URL push/replace, debouncing | `useUrlManagement` |
| `hooks/use-scroll-management.ts` | Scroll-to-post orchestration, operation ID tracking | `useScrollManagement` |
| `app/[...postStack]/page.tsx` | Catch-all route entry point | `PostStackPage` |

## Architectural Invariants

These rules must not be violated. They protect against race conditions and state corruption.

1. **URL is the single source of truth.** `UrlStateManager` owns the canonical stack. The state machine coordinates transitions but defers to `UrlStateManager.syncWithUrl()` during browser navigation. Stack state lives in `?stack=slug1,slug2` query param and `history.state.stackIds`.

2. **Scroll locking prevents observer interference.** `isProgrammaticScroll` in machine context gates the `IntersectionObserver` in `post-stack-observer.tsx`. When `true`, observer callbacks are suppressed to prevent them from changing the active post during programmatic scrolls.

3. **Operation ID versioning discards stale completions.** `scrollOperationId` in machine context increments on each scroll operation. `SCROLL_COMPLETE` events carry an `operationId` — the machine ignores completions whose ID doesn't match current.

4. **AbortController cancellation prevents overlapping scrolls.** `cancelCurrentScroll()` in `scroll-utils.ts` aborts in-progress scroll animations via a global `AbortController`. New scrolls always cancel any existing one first.

5. **Pending navigation queue handles rapid browser nav.** `pendingNavigation` in machine context stores a navigation that arrived while a scroll was being cancelled (`cancellingScroll` state). After cancellation completes, the pending navigation replays.

6. **Manual scroll restoration.** `history.scrollRestoration = "manual"` is set in `use-url-management.ts:153` to prevent the browser from interfering with programmatic scroll positioning.

## Key Types

- `PostStackContext`, `PostStackEvent`, `PostStackInput` — `lib/post-stack-machine.ts:7-63`
- `NavigationState`, `NavigationDirection` — `lib/url-state-manager.ts:12-25`
- `ScrollState` — `lib/scroll-utils.ts:6-10`
- `RenderedPost` — `types/post.ts`
- `PostStackParams`, `ParsedPostIds` — `lib/post-stack-utils-client.ts:11-23`

## State Machine Flow

See the docblock at `lib/post-stack-machine.ts:66-89` for the full state transition diagram. Key flows:

- **New post:** idle -> loadingPost -> scrolling -> settled -> idle
- **Cached post:** idle -> existingPost -> scrolling -> settled -> idle
- **Dismiss:** idle -> dismissing -> settling -> scrolling -> settled -> idle
- **Browser nav:** any -> processingNavigation -> restoringScroll -> settlingScroll -> idle

## Validation Checklist

Run these probes when working in post-stack code. If any fail, the doc is stale — fix it.

1. **File map:** Do all 11 files in the File Map exist? Do the listed exports still exist in each file?
2. **Context shape:** Does `PostStackContext` in `lib/post-stack-machine.ts` still contain `isProgrammaticScroll`, `scrollOperationId`, `pendingNavigation`? These are the fields the invariants depend on.
3. **Scroll lock gate:** Does `post-stack-observer.tsx` still read `isProgrammaticScroll` and skip observer updates when true?
4. **Operation ID flow:** Does `SCROLL_COMPLETE` event type still carry `operationId`? Does the machine guard against mismatched IDs?
5. **AbortController:** Does `scroll-utils.ts` still export `cancelCurrentScroll` using a module-level `AbortController`?
6. **Popstate debounce:** Does `use-url-management.ts` still debounce popstate with a timeout ref? Is `history.scrollRestoration = "manual"` still set?
7. **State transitions:** Does the docblock at `lib/post-stack-machine.ts:66-89` still describe the state flow? Do the 4 flows listed in "State Machine Flow" match?
8. **Data attributes:** Does `scroll-utils.ts` still query `[data-post-id]` and `[data-post-index]` for DOM targeting?

## References

- [Browser Integration Deep Dive](references/browser-integration.md) — popstate handling, scroll cancellation pipeline, race condition guards
