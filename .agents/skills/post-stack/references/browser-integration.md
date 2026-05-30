# Browser Integration Deep Dive

How the Post Stack system integrates with browser back/forward navigation. This is the most race-condition-prone subsystem — multiple async flows (popstate, scroll animation, DOM updates) must coordinate without corrupting state.

> Source of truth is `lib/post-stack-machine.ts`, `hooks/use-url-management.ts`,
> `hooks/use-scroll-management.ts`, and `lib/scroll-utils.ts`. This file avoids line
> numbers; search by symbol name. See [`docs/post-stack-statecharts.md`](../../../../docs/post-stack-statecharts.md)
> for the full statecharts, event inventory, and sequence diagrams.

## Popstate Handler Flow

Defined as `handleBrowserNavigation` in `hooks/use-url-management.ts`.

```
popstate event
  -> guard: skip if isInternalUpdateRef is true (prevents re-entrant calls)
  -> clear pendingStackIdsRef (drop any URL push deferred during a scroll)
  -> read stackIds from history.state.stackIds (preferred) or parse URL (fallback)
  -> set isInternalUpdateRef = true
  -> reset lastPushedRef so a later forward-nav to the same URL isn't deduped
  -> actor.send({ type: "BROWSER_NAVIGATION", stackIds, direction: "forward" })
  -> microtask (Promise.resolve().then): clear isInternalUpdateRef
```

There is intentionally **no** popstate debounce and **no** post-navigation URL-push
cooldown. The earlier 50ms `popstateDebounceRef` and 500ms `lastBrowserNavTimestampRef`
were removed; concurrent popstates are now handled by `scrollOperationId` versioning plus
the `cancellingScroll` → `processingNavigation` replay path.

> Known follow-up: `direction` is hard-coded to `"forward"` for every popstate. The
> machine does not currently branch on direction, so this is harmless today but is a
> documented follow-up candidate (see the statecharts doc).

## Scroll Cancellation Pipeline

When browser navigation arrives during an active programmatic scroll (`scrolling` or
`restoringScroll`), the machine cancels the scroll before applying the new navigation.

```
BROWSER_NAVIGATION while in scrolling / restoringScroll
  -> transition action calls cancelCurrentScroll() (aborts the AbortController)
  -> stores { stackIds, direction } in context.pendingNavigation
  -> bumps scrollOperationId (so the aborted scroll's SCROLL_COMPLETE is ignored)
  -> target state: cancellingScroll
       entry: clears scrollState + programmaticScrollTarget
       always: -> processingNavigation, applying pendingNavigation to
               currentStackIds / visiblePostIds / posts / activePostId from postCache
  -> processingNavigation re-checks the cache:
       missing post(s) -> loadingPost
       all cached      -> restoringScroll
```

The aborted `scrollToElement` rejects with `ScrollCancelledError`, which
`use-scroll-management.ts` swallows and still answers with `SCROLL_COMPLETE` carrying the
**stale** `operationId`; the machine's operation-id guard discards it. There is no
`SCROLL_CANCELLED` event.

Key code paths (search by symbol):
- `cancelCurrentScroll()` / `currentScrollController` — `lib/scroll-utils.ts`
- `ScrollCancelledError` handling — `hooks/use-scroll-management.ts`
- `pendingNavigation` context field + `cancellingScroll` state — `lib/post-stack-machine.ts`

## Race Condition Guards

| Guard | Location | Purpose |
|-------|----------|---------|
| `isInternalUpdateRef` | `use-url-management.ts` | Blocks the popstate handler during app-initiated URL changes |
| Deferred URL push during scroll | `use-url-management.ts` (`pendingStackIdsRef`) | Holds `pushState` while `scrollState === "programmaticScroll"`, flushes on idle, to avoid a browser scroll reset mid-animation |
| `scrollOperationId` matching | `post-stack-machine.ts` | Discards stale `SCROLL_COMPLETE` / `SCROLL_ERROR` events |
| `isProgrammaticScroll` lock | `post-stack-machine.ts` | Suppresses the `scrollend` observer during programmatic scrolls |
| `pendingNavigation` replay | `post-stack-machine.ts` (`cancellingScroll`) | Applies a navigation that arrived while a scroll was being cancelled |
| AbortController cancellation | `scroll-utils.ts` (`cancelCurrentScroll`) | Aborts the in-flight scroll animation so a new one can start |

## Data Attributes for DOM Targeting

Used by `scroll-utils.ts` and `post-stack-observer.tsx` to locate post elements:

- `data-post-id` — canonical post ID (e.g., `"about"`, `"my-blog-post"`)
- `data-post-index` — zero-based position in the current stack

`waitForPostElement` prefers the indexed selector
`[data-post-id="…"][data-post-index="…"]` and falls back to `[data-post-id="…"]`. The
observer prefers a wrapper element carrying `data-post-index` over an inner `section`
when scoring visibility.

## History State Shape

Every `history.pushState` / `replaceState` stores
`{ stackIds: string[], scrollByPostId: ScrollMemory }` so popstate can read the stack
without parsing the URL, and so per-post reading anchors survive back/forward. Written in
`use-url-management.ts` (`updateUrl` pushState; the initial `replaceState` seed) and
`lib/post-stack-utils-client.ts` (`writeScrollMemory`). `scrollByPostId` maps post id →
`{ anchorId, fineOffsetPx }` and is mirrored to `sessionStorage` (`copt:scroll`) as a
hard-refresh backup.

## Validation Probes

When consulting this reference, confirm against live source:

1. `handleBrowserNavigation` still lives in `hooks/use-url-management.ts`, reads
   `history.state.stackIds`, and dispatches `BROWSER_NAVIGATION`. There should be **no**
   `popstateDebounceRef` / `lastBrowserNavTimestampRef`.
2. `cancelCurrentScroll` still uses `currentScrollController.abort()` in
   `lib/scroll-utils.ts`.
3. The Race Condition Guards table still matches the ref names and the machine's
   `cancellingScroll` / `scrollOperationId` / `pendingNavigation` mechanics.
4. The history state shape still includes both `stackIds` and `scrollByPostId`.
