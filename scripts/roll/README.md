# roll

Fucking-random topic → tiny Gemini loop → DRAFT mdx in `posts/blog/dummy/rolls/`.

```bash
bun run roll        # full flow
bun run roll:dry    # roll only — no AI, no save (use to test the dice)
bun run roll --lane hlexicon   # force a lane (hlexicon|concept|quote|wild)
```

## Flow

1. **Dice** — `node:crypto.randomInt` picks one of 4 lanes uniformly, then picks one item:
   - `hlexicon` — one of h0p3's 56 `TERM := definition` entries
   - `concept` — one of the top 200 ranked tiddlers
   - `quote` — one of 5k blockquotes
   - `wild` — uniform random from all 16,884 tiddlers (may be weird; that's the point)
2. **Sparks** — Gemini streams 4 sharp questions targeted to the rolled topic, with related hlexicons in scope.
3. **Free-write** — you answer each spark; end each answer with `.` on its own line.
4. **Reshape** — Gemini drafts a post in your voice (anchored to `posts/concrete/principles.mdx` + `about.mdx`), embedding 0–2 `{{term|definition}}` hlexicons where natural.
5. **Save** — DRAFT mdx written to `posts/blog/dummy/rolls/YYYY-MM-DD-<slug>.mdx`.

## Source files

```
scripts/roll/
  roll.ts         # 5-phase orchestrator
  lib/
    dice.ts       # node:crypto-backed picks
    pool.ts       # loads records/tiddlers/*.json into 4 lanes
    readline.ts   # Bun async-iterable readline + readBlock + readChoice
    voice.ts      # principles.mdx + about.mdx as system prompt
    sparks.ts     # streamText round 1 (questions)
    reshape.ts   # streamText round 2 (draft)
    save.ts       # frontmatter + filename + write
    types.ts
```

## Requires

- `bun run extract:tiddlers` has been run at least once (populates `records/tiddlers/*.json`).
- `GEMINI_API_KEY` (or `GOOGLE_API_KEY` / `GOOGLE_GENAI_API_KEY`) set.
- `AI_MODEL` (default `gemini-2.5-flash`), `AI_TEMPERATURE` (default `0.7`) — read by `scripts/lib/ai-config.ts`.
