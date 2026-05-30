---
title: "fix: Resolve post-stack state-machine follow-up gaps"
type: fix
status: active
date: 2026-05-30
origin: docs/post-stack-statecharts.md
---

# fix: Resolve post-stack state-machine follow-up gaps

## Summary

Fix the suspected behavior gaps captured in the post-stack statecharts doc's "Follow-up
candidates" section: make the `error` state recoverable via browser navigation, keep
`currentStackIds`/`visiblePostIds` consistent with deduped `posts`, and trim dead machine
surface (the unused `direction` plumbing, the never-dispatched `URL_UPDATED` handler, the
unreachable `GO_HOME`/`goingHome` state, and a stale `SCROLL_SUCCESS` docblock mention).
All changes are confined to `lib/post-stack-machine.ts` plus a small update to the popstate
sender, backed by new machine unit tests and the existing Playwright scroll suite.

---

## Problem Frame

The post-stack XState machine carries dead and inconsistent surface that the statecharts
documentation audit surfaced. Two items are genuine correctness risks (a stranded `error`
state when the user hits back/forward after a failed load; stack-id arrays diverging from
`posts` on duplicate ids), and the rest are dead code that misleads readers about how the
machine actually behaves. None are fixed yet — they were deferred from the docs PR.

---

## Assumptions

*This plan was authored as a cloud agent without synchronous user confirmation. The items
below are agent inferences that should be reviewed before implementation proceeds.*

- The intended scope is "fix the documented follow-up candidates," not a broader post-stack
  refactor.
- `goHome()`'s full-page reload (`window.location.href = "/"`) is intentional clean-slate
  behavior; therefore the dead `GO_HOME`/`goingHome` machine surface should be **removed**
  rather than wired up. Converting home navigation to a client-side transition is treated as
  a separate product/UX decision (deferred to `ce-brainstorm`).
- `CLEAR_ERROR` is retained (not removed) as the sanctioned `error → idle` recovery
  transition, even though it is not dispatched today, because making `error` interactive
  (U3) gives it a real future role; surfacing error UI that dispatches it is deferred.
- It is acceptable to introduce a new `bun:test` unit-test file for the machine
  (`lib/post-stack-machine.test.ts`), matching the existing `lib/*.test.ts` convention.

---

## Requirements

- R1. Browser back/forward must remain functional in every reachable state, including the
  `error` state after a failed post load (no stranding).
- R2. Machine context must stay internally consistent: `currentStackIds` and
  `visiblePostIds` must not diverge from `posts` when a navigation carries duplicate ids.
- R3. The machine and its docblock must not reference completion signals, events, or states
  that do not exist (`SCROLL_SUCCESS`).
- R4. Dead machine surface that misrepresents real behavior is removed: the unused
  `direction` field on `BROWSER_NAVIGATION` / `pendingNavigation`, and the never-dispatched
  `URL_UPDATED` handler.
- R5. The unreachable `GO_HOME` event + `goingHome` state are resolved with an explicit
  decision (default: removed).
- R6. All other externally observable behavior is preserved — click-add, dismiss, browser
  navigation, scroll restoration, and observer active-post tracking must not regress.

---

## Scope Boundaries

- No change to scroll execution (`lib/scroll-utils.ts`), the scroll/URL hooks beyond the
  one popstate sender edit, the observer, or any rendering component.
- No new error UI; `error` state remains visually unsurfaced (only its navigation
  robustness is fixed).
- No change to `goHome()`'s full-reload behavior.
- No reconciliation of the separately-dead `UrlStateManager.syncWithUrl()` /
  `getPostsToLoad()` (tracked elsewhere; not part of these follow-ups).
- The `USER_INTERACTION` operation-id question is resolved as "no change" (see Open
  Questions), not an implementation unit.

### Deferred to Follow-Up Work

- Client-side home navigation (dispatch `GO_HOME` instead of full reload): separate
  product/UX decision via `ce-brainstorm`.
- Error-recovery UI that surfaces the `error` context and dispatches `CLEAR_ERROR` or a
  retry: separate plan.
- Removing the dead `UrlStateManager.syncWithUrl()` / `getPostsToLoad()` methods.

---

## Context & Research

### Relevant Code and Patterns

- `lib/post-stack-machine.ts` — the only behavior file changing. Relevant pieces: `idle`'s
  `BROWSER_NAVIGATION` handler (rebuilds `posts` deduped by `post.id` via `Map`, but assigns
  `currentStackIds`/`visiblePostIds` directly from `event.stackIds`), `cancellingScroll`'s
  `always` action (same dedup asymmetry), `error` state (`on: { CLEAR_ERROR, ADD_POST }` —
  **no** `BROWSER_NAVIGATION`), `goingHome` state + `GO_HOME` event, the `direction` field
  on `BROWSER_NAVIGATION` and `pendingNavigation`, the `URL_UPDATED` handler in `idle`, and
  the docblock mention of a nonexistent `SCROLL_SUCCESS` event.
- `hooks/use-url-management.ts` — `handleBrowserNavigation` sends
  `{ type: "BROWSER_NAVIGATION", stackIds, direction: "forward" }`; the `direction` arg is
  removed when U4 drops the field.
- `lib/post-stack-utils-client.ts` — `processPostIds` already dedupes id arrays
  (order-preserving) and is the pattern to reuse for R2.
- Event dispatch reality (re-grepped): `GO_HOME`, `URL_UPDATED`, `CLEAR_ERROR` are never
  sent; `direction` is only ever written, never read.

### Institutional Learnings

- `.agents/skills/post-stack/SKILL.md` and `docs/post-stack-statecharts.md` are the current
  ground truth for state/event names; update neither's behavior claims without re-checking
  the machine. The statecharts "Follow-up candidates" section is the origin of this plan.

### External References

- None required — XState v5 (`xstate@^5.31.1`) is well-established in the repo; the changes
  follow existing machine patterns.

---

## Key Technical Decisions

- **KTD1 — `error` handles `BROWSER_NAVIGATION`.** Add a `BROWSER_NAVIGATION` transition to
  the `error` state that mirrors `idle`'s (rebuild stack/posts/active from `postCache`,
  clear `error`, route to `processingNavigation`). Rationale: today a failed load strands
  the user — back/forward is swallowed. Extract the shared `BROWSER_NAVIGATION` rebuild
  (action + target) into a single definition reused by `idle` and `error` so they cannot
  drift.
- **KTD2 — Dedupe stack-id arrays.** Apply order-preserving de-duplication (reuse
  `processPostIds` or an inline `[...new Set(...)]`) when assigning `currentStackIds` and
  `visiblePostIds` in the `BROWSER_NAVIGATION` rebuild and in `cancellingScroll`, so they
  match the already-deduped `posts`. Rationale: prevents stack-length/index drift (R2).
- **KTD3 — Remove unused `direction`.** Drop `direction` from the `BROWSER_NAVIGATION` event
  and from `pendingNavigation` (context), and from the popstate sender. Rationale: nothing
  consumes it; an honest API beats correct-but-dead data (YAGNI). *Alternative considered:*
  compute the real direction via `UrlStateManager._calculateDirection` — rejected because
  the machine has no direction-dependent logic, so the field would remain unconsumed.
- **KTD4 — Remove `URL_UPDATED` handler.** It is never dispatched and is fully superseded by
  `BROWSER_NAVIGATION`. Rationale: dead handler misrepresents the machine's real inputs.
  *Contrast:* `SET_ACTIVE_POST`, `UPDATE_POST_CONTENT`, `ENABLE_OBSERVER` are all dispatched
  and stay.
- **KTD5 — Remove `GO_HOME` + `goingHome`.** `goHome()` deliberately does a full reload, so
  the event/state are unreachable. Remove both (and `idle`'s `GO_HOME` handler). Rationale:
  eliminate misleading dead state; trivially restorable if client-side home nav is later
  chosen. Flagged for review (see Assumptions).
- **KTD6 — Keep `CLEAR_ERROR`.** Retain the `error → idle` recovery transition despite being
  undispatched; U3 makes `error` interactive, giving it a real future role. Removing it
  would force a re-add when error UI lands.

---

## Open Questions

### Resolved During Planning

- *Should `USER_INTERACTION` carry an `operationId` guard like `SCROLL_COMPLETE`?* No.
  Interruption is inherently "now" — the user physically scrolled — so releasing the lock
  unconditionally is correct. Adding a guard risks dropping a legitimate interrupt. No code
  change; documented in the statecharts doc.
- *Remove or compute `direction`?* Remove (KTD3).
- *Remove or wire `GO_HOME`?* Remove in this plan; wiring is a deferred product decision
  (KTD5).

### Deferred to Implementation

- Exact extraction shape for the shared `BROWSER_NAVIGATION` rebuild (named action vs inline
  helper) — decide while editing, guided by XState v5 `setup({ actions })` ergonomics.
- Whether `cancellingScroll`'s rebuild can call the same extracted helper as
  `idle`/`error`, or only share the dedup utility (its source is `pendingNavigation`, not the
  event).

---

## Implementation Units

- U1. **Correct the machine docblock**

**Goal:** Remove the stale `SCROLL_SUCCESS` reference so the docblock names only real
completion events.

**Requirements:** R3

**Dependencies:** None

**Files:**
- Modify: `lib/post-stack-machine.ts` (docblock only)

**Approach:**
- Update the `POST STACK STATE MACHINE` docblock to reference `SCROLL_COMPLETE` /
  `SCROLL_ERROR` only; drop `SCROLL_SUCCESS`.

**Patterns to follow:**
- Existing docblock prose style in the same file.

**Test scenarios:**
- Test expectation: none -- comment-only change, no behavior.

**Verification:**
- No occurrence of `SCROLL_SUCCESS` remains in the file; `bun run typecheck` clean.

---

- U2. **Dedupe stack-id arrays on navigation**

**Goal:** Keep `currentStackIds`/`visiblePostIds` consistent with the deduped `posts` when a
navigation carries duplicate ids.

**Requirements:** R2, R6

**Dependencies:** None

**Files:**
- Modify: `lib/post-stack-machine.ts` (`idle` `BROWSER_NAVIGATION` action; `cancellingScroll` `always` action)
- Create: `lib/post-stack-machine.test.ts`

**Approach:**
- Apply order-preserving de-duplication to the ids assigned to `currentStackIds` and
  `visiblePostIds` (reuse `processPostIds` from `lib/post-stack-utils-client.ts` or inline
  `[...new Set(ids)]`), matching the `Map`-by-`post.id` dedup already applied to `posts`.

**Patterns to follow:**
- `processPostIds` in `lib/post-stack-utils-client.ts`.
- The existing `Map`-based post dedup in the same `BROWSER_NAVIGATION` action.

**Test scenarios:**
- Happy path: `BROWSER_NAVIGATION` with unique `stackIds` (all cached) → `currentStackIds`,
  `visiblePostIds`, and `posts` lengths match; `activePostId` is the last id's post.
- Edge case: `BROWSER_NAVIGATION` with a duplicated id (e.g. `["about","about"]`) →
  `currentStackIds` and `visiblePostIds` are deduped to `["about"]` and match `posts.length === 1`.
- Integration: a navigation routed through `cancellingScroll` (send `BROWSER_NAVIGATION`
  while in `scrolling`) with a duplicate id → after the transient settles, stack arrays are
  deduped and consistent with `posts`.

**Verification:**
- New tests pass via `bun test lib/post-stack-machine.test.ts`; existing `test:scroll` suite
  still green.

---

- U3. **Make the `error` state recoverable via browser navigation**

**Goal:** Prevent the `error` state from swallowing back/forward, which currently strands a
user after a failed post load.

**Requirements:** R1, R6

**Dependencies:** U2

**Files:**
- Modify: `lib/post-stack-machine.ts` (`error` state; extract shared `BROWSER_NAVIGATION` rebuild used by `idle` and `error`)
- Modify: `lib/post-stack-machine.test.ts`

**Approach:**
- Extract `idle`'s `BROWSER_NAVIGATION` rebuild (the cache-driven `assign` plus
  `cancelCurrentScroll()` side effect and `target: "processingNavigation"`) into a single
  shared definition (e.g. a named action under `setup({ actions })` plus a shared transition
  object) and reference it from both `idle` and `error`.
- The `error` handler must also clear `error` (or rely on the eventual `idle` entry, which
  sets `error: null`) — prefer clearing in the shared action for cleanliness.

**Execution note:** Add the failing `error → BROWSER_NAVIGATION` test first, then implement.

**Patterns to follow:**
- `idle`'s existing `BROWSER_NAVIGATION` handler (source of the extracted logic).
- XState v5 `setup({ actions: { ... } })` for shared named actions.

**Test scenarios:**
- Error path → recovery: drive the machine into `error` (`ADD_POST` → `loadingPost` →
  `POST_LOAD_ERROR`), then send `BROWSER_NAVIGATION` with a cached stack → machine leaves
  `error`, rebuilds the stack from cache, and reaches `processingNavigation`
  (then `restoringScroll`/`idle`); `error` context is cleared.
- Regression: `error` still handles `ADD_POST` (→ `loadingPost`) and `CLEAR_ERROR` (→ `idle`).
- Integration: `idle` and `error` produce identical context after the same
  `BROWSER_NAVIGATION` event (proves the shared action didn't drift).

**Verification:**
- New + existing machine tests pass; `test:scroll` and `test:e2e` green; manual check that
  navigating to a bad slug then pressing back returns to the prior post.

---

- U4. **Trim dead machine surface (`direction`, `URL_UPDATED`)**

**Goal:** Remove machine inputs that are never produced or consumed so the machine's API
reflects real behavior.

**Requirements:** R4, R6

**Dependencies:** U3 (the `BROWSER_NAVIGATION` handlers are touched by U3's extraction; do
this after to avoid churn)

**Files:**
- Modify: `lib/post-stack-machine.ts` (remove `direction` from the `BROWSER_NAVIGATION` event type and `pendingNavigation` context type + both `assign` sites; remove the `URL_UPDATED` handler from `idle`)
- Modify: `hooks/use-url-management.ts` (drop `direction: "forward"` from the `BROWSER_NAVIGATION` send)
- Modify: `lib/post-stack-machine.test.ts` (adjust any tests that constructed events with `direction`)

**Approach:**
- Delete the `direction` field end-to-end (event union, `pendingNavigation` shape, the two
  `assign` writes, and the sole sender). Delete the `URL_UPDATED` case object from `idle`.
- Leave `SET_ACTIVE_POST`, `UPDATE_POST_CONTENT`, `ENABLE_OBSERVER`, and `CLEAR_ERROR` intact.

**Patterns to follow:**
- TypeScript discriminated-union edits; let `tsc` surface every reference site.

**Test scenarios:**
- Regression: `BROWSER_NAVIGATION` (now without `direction`) still rebuilds the stack and
  routes through `cancellingScroll` when sent during `scrolling`.
- Edge case: type-level — constructing a `BROWSER_NAVIGATION` event no longer accepts/needs
  `direction` (verified by `bun run typecheck`).

**Verification:**
- `bun run typecheck` clean (no dangling `direction`/`URL_UPDATED` references); machine tests
  and `test:scroll` green.

---

- U5. **Remove the unreachable `GO_HOME` / `goingHome`**

**Goal:** Eliminate the dead `GO_HOME` event and `goingHome` state, since `goHome()` performs
a full-page reload rather than dispatching `GO_HOME`.

**Requirements:** R5, R6

**Dependencies:** U3 (avoid editing the same `idle` `on` block twice)

**Files:**
- Modify: `lib/post-stack-machine.ts` (remove the `goingHome` state, the `GO_HOME` event-union member, and `idle`'s `GO_HOME` handler)
- Modify: `lib/post-stack-machine.test.ts` (no `GO_HOME` test; assert state list if tested)

**Approach:**
- Confirm (re-grep) `GO_HOME` has no senders, then remove the event, the `idle` handler, and
  the `goingHome` state. Leave `hooks/use-url-management.ts` `goHome()` (full reload) unchanged.

**Execution note:** This is a reviewer-facing decision (remove vs wire client-side home nav);
default is removal per Assumptions. If reviewers prefer client-side home navigation, this
unit is replaced by a separate brainstorm-driven plan.

**Patterns to follow:**
- XState v5 state/event removal; rely on `tsc` to catch references.

**Test scenarios:**
- Regression: removing `goingHome`/`GO_HOME` does not affect the primary lifecycle —
  click-add, dismiss, and browser-nav machine tests still pass.
- Test expectation: no new test for `GO_HOME` (the event no longer exists).

**Verification:**
- `bun run typecheck` clean; no `GO_HOME`/`goingHome` references remain; `test:scroll` /
  `test:e2e` green; clicking the home/logo control still navigates home (full reload
  preserved).

---

## System-Wide Impact

- **Interaction graph:** Only `lib/post-stack-machine.ts` changes behavior; the single
  external touch point is `hooks/use-url-management.ts` (drops the `direction` send arg).
  Provider, observer, scroll hooks, and rendering are unaffected.
- **Error propagation:** `error` becomes navigable (U3); post-load failures no longer trap
  back/forward. `error` context still clears on reaching `idle`.
- **State lifecycle risks:** Dedup (U2) removes a source of `posts` vs stack-id divergence
  that could mis-key dismiss-index math. The shared `BROWSER_NAVIGATION` action (U3) is the
  main regression-risk surface — covered by parity tests.
- **API surface parity:** `idle` and `error` must apply identical `BROWSER_NAVIGATION`
  semantics (enforced by the extracted action + a parity test).
- **Unchanged invariants:** `isProgrammaticScroll` observer gating, `scrollOperationId`
  stale-completion guarding, `cancelCurrentScroll()` ownership of cancellation, URL/history
  state as the canonical stack source at nav boundaries, and `goHome()`'s full-reload
  behavior all remain unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Extracting the shared `BROWSER_NAVIGATION` action subtly changes `idle` behavior | Parity test asserting identical post-event context for `idle` and `error`; run `test:scroll` + `test:e2e`. |
| Removing `direction` misses a consumer | `tsc --noEmit` surfaces every reference; grep confirmed only writers + one sender today. |
| Removing `goingHome`/`GO_HOME` conflicts with a desired client-side home nav | Decision flagged in Assumptions; removal is trivially reversible; alternative captured as deferred follow-up. |
| New unit tests drift from real DOM behavior | Keep machine tests at the transition/context level; rely on Playwright `test:scroll` for DOM-level coverage. |
| e2e suite needs DB + dev server in the cloud VM | Follow `AGENTS.md` bootstrap (local Postgres, `DATABASE_URL` override, `db:sync-posts`) before running `test:scroll`/`test:e2e`. |

---

## Documentation / Operational Notes

- After implementation, update `docs/post-stack-statecharts.md`: remove the resolved items
  from "Follow-up candidates" (SCROLL_SUCCESS, duplicate stack-ids, hard-coded direction,
  GO_HOME dead code, URL_UPDATED) and refresh the state list (drop `goingHome`) and event
  inventory (drop `GO_HOME`/`URL_UPDATED`/`direction`). Keep the `USER_INTERACTION`
  operation-id note as a resolved "no change" rationale.
- Update `.agents/skills/post-stack/SKILL.md` state count/flows if `goingHome` is removed.
- No migrations, rollout, or monitoring impact.

---

## Sources & References

- **Origin document:** [docs/post-stack-statecharts.md](docs/post-stack-statecharts.md) — "Follow-up candidates"
- Related code: `lib/post-stack-machine.ts`, `hooks/use-url-management.ts`, `lib/post-stack-utils-client.ts`
- Related tests: `tests/post-stack-scroll.spec.ts`, `lib/date-utils.test.ts` (bun:test convention)
- Related docs: `.agents/skills/post-stack/SKILL.md`, `.agents/skills/post-stack/references/browser-integration.md`
