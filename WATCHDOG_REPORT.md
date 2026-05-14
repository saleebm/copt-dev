# dev-watchdog Report — 2026-05-14T17:07 UTC

## DEGRADED NOTIFICATION PATH

AgentMail is unavailable. `am mail send` fails with "Resource is temporarily busy".
Root cause: stale `am` process (pid 26289, ppid 11219) has held the exclusive mailbox
activity lock at `/Users/minasaleeb/.local/share/mcp-agent-mail/git_mailbox_repo/.mailbox.activity.lock`
for over 1 hour. `am doctor repair` also blocked by the same lock.

ACTION REQUIRED: Kill or wait for pid 26289 to release the lock, then run `am doctor repair`.
Do NOT kill this process without confirming it is safe to stop — it belongs to AgentMail
but may be a running agent operation initiated by the user.

---

## Dev Server Status: UP

| Key | Value |
|-----|-------|
| URL | https://copt.localhost |
| Internal port | 4276 |
| Next.js | 16.2.6 |
| PID (next-server) | 89754 |
| PID (portless proxy) | 89717 |
| Shell | attached to existing process (no duplicate started) |

Diagnostics plane: initialized via `mcp__next-devtools__init`. Peer agents use
`mcp__next-devtools__nextjs_call` with port `4276`.

---

## Routes (12 — App Router only)

/, /[...postStack], /api/ingest, /api/ingest-images, /api/og/[slug],
/api/posts-manifest, /apple-icon, /icon, /opengraph-image,
/robots.txt, /sitemap.xml, /twitter-image

---

## Signals Detected (no build/compile errors)

### WARN — serverComponentsHmrCache experiment failed at startup
- Logged at timestamp 00:00:00.898 with a cross mark: `⨯ serverComponentsHmrCache`
- All other experiments (inlineCss, mdxRs) show checkmarks.
- This may be intentional if the experiment was removed in Next.js 16.2.6, or it may
  indicate a misconfiguration in `next.config.*`.
- Severity: informational until confirmed. Needs verification.

### ERROR (recurring) — DialogContent missing DialogTitle (Radix UI accessibility)
- Browser error: "`DialogContent` requires a `DialogTitle` for the component to be
  accessible for screen reader users."
- Also: "Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}."
- Appears at session start on multiple browser connects (timestamps 00:03:28, 00:04:41, 00:06:01).
- Not a crash. Accessibility regression — screen readers cannot identify the dialog.
- Source: a `<DialogContent>` component somewhere in the app is missing a `<DialogTitle>`
  (or a VisuallyHidden wrapper around one).
- Severity: WARN (not a build failure, but a real accessibility defect).

### WARN — Image aspect ratio (golden_red_light_eye.svg)
- "Image with src `.../golden_red_light_eye.00~d.vtkatr2o.svg` has either width or height
  modified, but not the other."
- Recurring on every browser connect.
- Fix: add `width: "auto"` or `height: "auto"` to the CSS for that image element.
- Severity: low.

---

## Next Actions

1. User should confirm whether pid 26289 (`am` process) is safe to kill so AgentMail
   can be repaired. Once released: `am doctor repair`.
2. Verify `serverComponentsHmrCache` in `next.config.*` — remove if no longer valid in 16.2.6.
3. Locate `DialogContent` usage missing `DialogTitle` — fix for accessibility.
4. Fix image aspect ratio for `golden_red_light_eye.svg`.

---

Report written by dev-watchdog (fallback path — AgentMail unavailable).
