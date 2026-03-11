# Browser Integration Deep Dive

How the Post Stack system integrates with browser back/forward navigation. This is the most race-condition-prone subsystem — multiple async flows (popstate, scroll animation, DOM updates) must coordinate without corrupting state.

## Popstate Handler Flow

Defined in `hooks/use-url-management.ts:91-146`.

```
popstate event
  -> guard: skip if isInternalUpdateRef is true (prevents re-entrant calls)
  -> debounce: 50ms via popstateDebounceRef (coalesces rapid back/forward clicks)
  -> record lastBrowserNavTimestampRef (blocks URL pushes for 500ms)
  -> read stackIds from history.state.stackIds (preferred) or parse URL (fallback)
  -> set isInternalUpdateRef = true
  -> actor.send({ type: "BROWSER_NAVIGATION", stackIds, direction })
  -> microtask: clear isInternalUpdateRef
```

## Scroll Cancellation Pipeline

When browser navigation arrives during an active scroll, the machine must cancel the scroll before processing the new navigation.

```
BROWSER_NAVIGATION event during scrolling state
  -> machine transitions to cancellingScroll
  -> stores navigation in context.pendingNavigation
  -> cancelCurrentScroll() called (scroll-utils.ts:30-35, aborts AbortController)
  -> scrollToElement rejects with ScrollCancelledError
  -> SCROLL_CANCELLED event fires
  -> machine checks pendingNavigation
  -> if present: replays as BROWSER_NAVIGATION, transitions to processingNavigation
  -> if absent: transitions to idle
```

Key code paths:
- `cancelCurrentScroll()` — `lib/scroll-utils.ts:30-35`
- `ScrollCancelledError` handling — `hooks/use-scroll-management.ts:177-184`
- `pendingNavigation` context field — `lib/post-stack-machine.ts:23`

## Race Condition Guards

| Guard | Location | Purpose |
|-------|----------|---------|
| 50ms popstate debounce | `use-url-management.ts:104` | Coalesces rapid browser nav events |
| 500ms URL push cooldown | `use-url-management.ts:47-50` | Prevents app from pushing URLs immediately after browser nav |
| `isInternalUpdateRef` | `use-url-management.ts:31` | Blocks popstate handler during app-initiated URL changes |
| `scrollOperationId` matching | `post-stack-machine.ts:22` | Discards stale SCROLL_COMPLETE events |
| `isProgrammaticScroll` lock | `post-stack-machine.ts:21` | Suppresses IntersectionObserver during programmatic scrolls |
| Scroll state URL gating | `use-url-management.ts:61-64` | Defers URL push during programmatic scroll to prevent browser scroll reset |

## Data Attributes for DOM Targeting

Used by `scroll-utils.ts` and `post-stack-observer.tsx` to locate post elements:

- `data-post-id` — canonical post ID (e.g., `"about"`, `"my-blog-post"`)
- `data-post-index` — zero-based position in the current stack

Element selectors prioritize wrapper `div[data-post-id][data-post-index]` over inner `section` elements because wrapper divs have correct `offsetTop` values. See `scroll-utils.ts:539-548`.

## History State Shape

Each `history.pushState` / `replaceState` stores `{ stackIds: string[] }` so that popstate can read stack state without parsing the URL. Set in:
- `use-url-management.ts:74` (pushState on navigation)
- `use-url-management.ts:162` (replaceState on initial load)

## Validation Probes

Line numbers in this file drift fastest. When consulting this reference:

1. Confirm `handleBrowserNavigation` callback still lives in `hooks/use-url-management.ts` near the cited lines. Search for `popstateDebounceRef` if lines shifted.
2. Confirm `cancelCurrentScroll` still uses `AbortController.abort()` in `lib/scroll-utils.ts`. Search for `currentScrollController` if lines shifted.
3. Confirm the Race Condition Guards table entries match actual ref names and timeout values in the source files.
4. If any line reference is off by >10 lines, update this file.
