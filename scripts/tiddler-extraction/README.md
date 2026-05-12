# tiddler-extraction

Distill h0p3's [philosopher.life](https://philosopher.life/) TiddlyWiki into JSON and seed drafts for `posts/blog/`. Inspired by, not stolen from. The wiki is a 55 MB single-file HTML export with ~16k tiddlers; this script walks every one, lifts out the recurring shapes (hlexicon definitions, internal links, em-dash quotes, blockquotes), ranks tiddlers by signal density, and writes everything to `records/tiddlers/` for review.

## Run

```bash
bun run extract:tiddlers:dry        # parse + score, no writes
bun run extract:tiddlers             # write JSON to records/tiddlers/
bun run extract:tiddlers:scaffold    # write JSON + draft MDX to posts/blog/dummy/inspirations/
```

Flags: `--top N` (ranked size, default 200), `--scaffold-count N` (drafts, default 30), `--source PATH` (override input), `--verbose`, `--dry-run`.

## Layout

```
scripts/tiddler-extraction/
  data/index.html      # raw copy (gitignored — 55 MB)
  lib/parser.ts        # streaming tiddler reader
  lib/extractors.ts    # links, quotes, blockquotes, headings, meta-labels
  lib/hlexicon.ts      # `TERM := definition` → {term, def, aliases}
  lib/ranker.ts        # signal-density scoring
  lib/scaffolder.ts    # draft mdx writer
  extract.ts           # entry
```

## Outputs (`records/tiddlers/`)

- `tiddlers.index.json` — every tiddler, metadata + score (no body)
- `hlexicon.json` — h0p3's lexicon, normalized; each entry includes `mdx: "{{term|def}}"` for direct use
- `quotes.json` — em-dash quotes with attribution
- `blockquotes.json` — `<<<…<<<` regions
- `meta-labels.json` — `{{ datestamp - author: description }}` style references
- `ranked.json` — top N tiddlers with full body + signals (this carries the raw link signal — no separate links.json)
- `concrete-proposals.json` — concepts linked from ≥3 essay-shaped (non-chatlog) tiddlers, deduped by source. `hasOwnTiddler: true` means h0p3 has a tiddler for that concept you can read for context. Candidates for new CONCRETE posts; not auto-written.

Scaffold mode writes DRAFT MDX into `posts/blog/dummy/inspirations/` so they're isolated from the live tree until promoted.
