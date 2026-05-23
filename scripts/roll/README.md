# roll

A fucking-random topic generator plus a tiny Gemini loop that helps you draft a post in your own voice. Output is DRAFT mdx in `posts/blog/dummy/rolls/`. Nothing publishes until you move it.

## Why this exists

Some days the blank page is too blank. h0p3's wiki gave you 16,884 places his brain has been; this script rolls a die against it and asks "what does this pull out of *you*?" Gemini does two small jobs — striking sparks, then reshaping your free-write — but you write the actual words. The AI is a co-thinker, not a ghost-writer.

## Setup

One-time:

```bash
bun run extract:tiddlers       # populates records/tiddlers/*.json (only needs to run once, or after wiki updates)
```

In `.env`:

```
GEMINI_API_KEY=…                # required (or GOOGLE_API_KEY, or GOOGLE_GENAI_API_KEY — all three are tried in order)
AI_MODEL=gemini-3.1-pro-preview # optional, default shown
AI_TEMPERATURE=0.7              # optional, default shown
```

`AI_MODEL` defaults to `gemini-3.1-pro-preview` for roll specifically — `sparks.ts` and `reshape.ts` override the shared `scripts/lib/ai-config.ts` default (`gemini-2.5-flash`) so the multi-step prompt-and-shape loop runs on Pro with `thinkingLevel: "low"`. Setting `AI_MODEL` in `.env` overrides both. API key + temperature still resolve through `scripts/lib/ai-config.ts`.

Optional: install [`gum`](https://github.com/charmbracelet/gum) for prettier banner + totals card. Without it, the script falls back to hand-drawn boxes — same info, just less glamorous.

```bash
brew install gum   # optional
```

## Usage

```bash
bun run roll                      # full flow, dice picks the lane
bun run roll:dry                  # roll only — no AI burn, no save
bun run roll --lane hlexicon      # force a lane (hlexicon | concept | quote | wild)
bun run roll -h                   # help
```

Flags:

- `--lane <name>` / `-l` — force a specific lane (skips uniform random over lanes; still random *within* the lane)
- `--dry-run` / `-d` — roll the dice and stop; no Gemini calls, no file writes
- `--help` / `-h`

## The 5 phases

### 1. Roll

`node:crypto.randomInt` picks one lane uniformly, then one item within that lane:

| Lane       | Source                                                    | Pool size      |
| ---------- | --------------------------------------------------------- | -------------- |
| `hlexicon` | `records/tiddlers/hlexicon.json` (h0p3's `TERM := def`)   | 56             |
| `concept`  | `records/tiddlers/ranked.json` (top-ranked tiddlers)      | 200            |
| `quote`    | `records/tiddlers/blockquotes.json` (`<<<…<<<` regions)   | 5,000 (capped) |
| `wild`     | `records/tiddlers/tiddlers.index.json` (every tiddler)    | 16,884         |

The roll shows:
- the lane + the rolled item
- the source tiddler title (so you can dig further)
- a small preview of the source body when available
- 2–3 related hlexicons (token overlap with the rolled item) — these get passed to Gemini in the next phase

Then it prompts `[k]eep / [r]e-roll / [q]uit`. Re-rolls are free — no API burn until you press `k`.

### 2. Sparks (Gemini round 1)

Streams 4 sharp spark questions tailored to the rolled topic. The system prompt is your voice anchors (`posts/concrete/principles.mdx` + `about.mdx`); the user prompt includes the topic, the source preview, and the related hlexicons.

Sparks are designed to:
- Reference a memory, a body sensation, or a concrete object (at least one)
- Poke at a tension or stance (at least one)
- Optionally riff on a hlexicon by name (at most one)
- Never be a generic "what is X?"

You see them stream in token-by-token.

### 3. Free-write

For each spark you get a `>` prompt. Type your answer. **End each answer with `.` on its own line** to commit it and move to the next spark. Two shortcuts:

- `skip` (alone, on the first line) — leave this spark blank, move on
- `done` (alone, on the first line) — end the free-write early

If every spark is empty/skipped, the script bails before burning Gemini round 2.

### 4. Reshape (Gemini round 2)

Streams a 250–500 word draft built from your free-write, in your voice. Rules baked into the prompt:

- Opens with a concrete sentence, not a thesis
- Preserves your specifics (objects, memories, names) — no generalizing-them-away
- Uses markdown; one H1 with the topic
- May embed 0–2 `{{term|definition}}` hlexicons from the related pool, copy-pasted literally (never invented)
- Banned: "in conclusion", "ultimately", summary paragraphs, corporate hedge phrases
- First person; the "I" is you, not the model

Then prompts `[s]ave / [e]dit again / [d]iscard`. "Edit again" calls reshape again with the same inputs (so it'll vary — Gemini isn't deterministic at temp 0.7).

### 5. Save

Writes to `posts/blog/dummy/rolls/YYYY-MM-DD-<slug>.mdx` (UTC date, kebab-case slug, collision-safe with `-2`, `-3` suffixes).

Frontmatter:

```yaml
---
title: "<topic>"
tags: "rolls,draft,<lane-name>"
status: "DRAFT"
---
```

Followed by a one-line HTML comment trace so you can later see what was rolled:

```mdx
<!-- rolled hlexicon from "APFVD" on 2026-05-12 -->
```

Then the reshape body.

`status: "DRAFT"` keeps it out of any published view. Promote by moving the file (e.g. to `posts/blog/daily/`) and flipping `status` to `"PUBLISHED"`.

## Timer

Each phase is timed and reported at the end:

- **sparks**: time from prompt-sent to last token (a Braille spinner runs on stderr until the first token arrives so you know it isn't hung)
- **write**: total time you spent in the free-write phase
- **reshape**: time for round-2 streaming (sums across re-edits if you press `[e]`)
- **total**: roll start to save

The spinner is TTY-only — piped/scripted invocations skip it. If `gum` is on `PATH`, the banner and totals card render as gum-styled boxes; otherwise the script draws plain ASCII boxes that say the exact same thing.

## Where files live

```
scripts/roll/
  roll.ts             # 5-phase orchestrator
  lib/
    dice.ts           # crypto.randomInt-backed picks
    pool.ts           # loads records/tiddlers/*.json into 4 lanes; finds related hlexicons
    readline.ts       # Bun async-iterable readline + readBlock + readChoice + withInputSuppressed
    voice.ts          # principles.mdx + about.mdx as system prompt
    sparks.ts         # streamText round 1 (questions, with onFirstChunk callback)
    reshape.ts        # streamText round 2 (draft, with onFirstChunk callback)
    save.ts           # frontmatter + filename + file write
    timer.ts          # Stopwatch + formatMs
    spinner.ts        # Braille spinner with live elapsed on stderr
    glamour.ts        # gum-or-ASCII banner + totals card
    types.ts
  README.md           # this file
```

Drafts always land in:

```
posts/blog/dummy/rolls/
```

## Lib walkthrough

Each lib file does one thing. The orchestrator (`roll.ts`) wires them together; nothing here is clever on its own.

### `dice.ts` — true randomness

Wraps `node:crypto.randomInt` so callers don't have to think about uniformity. `pick(items)` returns one item, `rollInt(n)` returns an int in `[0, n)`. No seeding — by design. You asked for "fr fr" random and that's what `crypto.randomInt` gives you.

### `pool.ts` — the four lanes

Lazily loads the four JSON pools (`hlexicon.json`, `ranked.json`, `blockquotes.json`, `tiddlers.index.json`) into memory once, keyed by lane. `rollTopic(forceLane?)` picks a lane uniformly (or honors the override), then picks an item within. Also runs `findRelatedHlexicons(topic, k=3)` — scores all 56 hlexicons by title-token + body-token overlap with the rolled topic, returns top-k; tops up with random fillers when overlap is sparse so the AI always has 3 hlexicons in scope.

### `readline.ts` — input plumbing

Three primitives on top of Bun's `for await (const line of console)`:

- `readLine()` — one line, blocking
- `readBlock(sentinels=["."])` — multi-line until you type `.`
- `readChoice(prompt, valid)` — re-prompts until your answer matches one of the valid keys

Plus `withInputSuppressed(work)` — puts the terminal in raw mode for the duration of `work()` and discards every keystroke. We wrap streaming AI calls in this so your typing during streams doesn't get echoed inline AND doesn't poison the next prompt. Ctrl+C still works.

### `voice.ts` — system-prompt anchors

Reads `posts/concrete/principles.mdx` and `posts/concrete/about.mdx`, strips frontmatter, joins them with a directive header. Both AI calls (`sparks` and `reshape`) pass this as their `system` prompt so the model's voice matches yours.

### `sparks.ts` and `reshape.ts` — the Gemini calls

Both use Vercel AI SDK's `streamText` against `@ai-sdk/google`. Each accepts an optional `onFirstChunk?: () => void` callback fired the moment the first chunk arrives — the orchestrator passes `spinner.stop` so the spinner clears cleanly before the stream starts painting.

- `streamSparks` returns `{ sparks, raw }`. Parser keeps lines that end in `?`, drops list-marker prefixes, caps at 5.
- `streamReshape` returns the trimmed body as a string. Capture-and-return so the orchestrator can offer `[e]dit again`.

### `timer.ts` — Stopwatch + formatMs

Two things, both small. `new Stopwatch()` starts ticking at construction; `.elapsedMs()` returns ms since. `formatMs(ms)` returns `"4.2s"` under a minute, `"1m 24s"` over. Not a `performance.now()` rig — `Date.now()` is fine for human-scale.

### `spinner.ts` — Braille frames

`startSpinner(label)` returns `{ stop }`. Writes 10-frame Braille animation + live elapsed to stderr every 100ms; `stop()` clears the line cleanly with `\r\x1b[2K`. No-op when stderr isn't a TTY, so piped runs stay clean.

### `glamour.ts` — gum-or-ASCII

`hasGum()` shells `command -v gum` once and caches. `bannerOrFallback()` and `totalsCard(rows)` try `gum style` first and fall back to ASCII boxes drawn manually. Gum invocations are skipped on non-TTY stdout (ANSI noise when captured). Per the `tui-glamorous` skill's pre-flight checklist: detect optional features at startup, degrade gracefully.

### `save.ts` — frontmatter writer

`saveRoll(topic, body)` writes `posts/blog/dummy/rolls/YYYY-MM-DD-<slug>.mdx`. UTC date so the filename doesn't shift on you across timezones. Slug is kebab-case of the topic, collision-safe with `-2`, `-3` suffixes. Frontmatter: `title`, `tags`, `status: DRAFT`. Body is prefixed with one HTML-comment trace recording lane + source tiddler + date so future-you can find the seed.

### `types.ts` — shared shapes

`Lane`, `RolledTopic`, `SparkAnswer`, `RollState`. Nothing surprising.

## Troubleshooting

**`missing hlexicon.json — run \`bun run extract:tiddlers\` first`**
The roll script reads from `records/tiddlers/*.json`. Run the extractor once.

**`❌ GEMINI_API_KEY not set`**
Real rolls need a key. Use `bun run roll:dry` to test the dice without the AI loop.

**Sparks come back as a wall of text with no clear questions**
The parser keeps lines that end in `?`. If Gemini wraps everything in one paragraph, the script falls back to a single generic spark (`What does "<topic>" pull out of you right now?`) — you can keep going from there.

**Draft references a hlexicon term that isn't in the related list**
The reshape prompt restricts it to the 2–3 related hlexicons passed in. If it invents one, it's hallucinating — flag it; the prompt is supposed to forbid this.

**You want a different draft from the same free-write**
Choose `[e]` at the save prompt. Reshape runs again with the same sparks + answers; output will vary at temperature 0.7.

**The roll keeps landing on chatlogs / weird tiddlers**
That's the `wild` lane. Either press `r` to re-roll, or use `--lane hlexicon|concept|quote` to skip wild entirely.

**Banner renders as literal `╭─…` text instead of `╭───`**
This was a real bug we hit: Bun has an issue where `String.raw` with characters above U+007F outputs them as literal escape-sequence TEXT instead of the actual glyphs. The fix is to use a plain template literal — never `String.raw` with box-drawing chars or emoji. Confirmed with `bun -e 'console.log("╭")'` (works) vs `bun -e 'console.log(String.raw\`╭\`)'` (prints `╭`). All banner-rendering code in this script uses plain template literals.

**Buffered keystrokes during streaming poison the next prompt**
Streams suppress input via raw mode (`withInputSuppressed` in `readline.ts`). If you somehow bypass this and see ghost characters in your next answer, the readline layer is the place to look.

**Spinner doesn't appear**
Spinner is TTY-only. Piping output (e.g. `bun run roll | tee log.txt`) disables it on purpose — `\r` overwrites are garbage in a flat log. Run in a real terminal.

## Determinism

The dice are cryptographically random (`node:crypto.randomInt`). You can't seed them. Two consecutive `bun run roll` invocations are independent — that's the "fr fr" you asked for.
