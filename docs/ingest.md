# iOS Shortcut → PR Ingest

Two HTTP endpoints + one bun worker daemon that turn iOS Shortcut shares into draft PRs against this repo.

Per the project's truth hierarchy, this doc points at code. When something here drifts from the source, the source wins.

## Architecture (one-liner)

```
iOS Shortcut → POST /api/ingest(-images) → IngestSubmission row → worker daemon → AI SDK (Gemini + urlContext) → MDX file → git branch → gh pr create
```

| Layer | Path |
| --- | --- |
| Routes | `app/api/ingest/route.ts`, `app/api/ingest-images/route.ts` |
| Shared lib (routes + worker) | `lib/ingest/{auth,schema,hash,staging,db}.ts` |
| Worker daemon | `scripts/ingest-worker.ts` |
| Worker pipeline stages | `scripts/lib/ingest/{gemini-runner,mdx-writer,git-ops,pr-creator,pipeline}.ts` |
| Schema | `prisma/schema.prisma` — `IngestSubmission` model |

State machine: `pending → processing → (completed | failed)`. Source of truth is `lib/ingest/db.ts`.

## How the model is called

The worker pipeline (`scripts/lib/ingest/gemini-runner.ts`) uses the Vercel AI SDK (`ai` + `@ai-sdk/google`) with `generateText` + `Output.object(zodSchema)`. The returned `output` is **statically typed and runtime-validated** against the Zod schema — no manual JSON parsing, no hand-rolled JSON Schema, no model-output guessing.

- **URL kind** — passes `tools: { url_context: google.tools.urlContext({}) }` so Gemini fetches each URL itself (https://ai.google.dev/gemini-api/docs/url-context). One round trip handles both retrieval and structuring.
- **Image kind** — attaches each staged image as an inline `{ type: 'image', image: Buffer, mediaType }` part on a user message. Body references images as `IMAGE_1`, `IMAGE_2`, … placeholders; `mdx-writer.ts` rewrites them to final committed paths.
- **Note kind** — straight prompt-to-structured-output.

The post type (`FINDING` / `SIGHT` / `BLOG`) is **not** chosen by the model — the worker forces it from the row's `kind` before writing frontmatter.

## HTTP contract

Both endpoints require `Authorization: Bearer $INGEST_TOKEN`. 401 otherwise.

### `POST /api/ingest`

URL + notes shortcut (`public/url-shortcut.png`).

Body — `Content-Type: application/json`:

```json
{
  "urls": ["https://example.com/a", "https://example.com/b"],
  "notes": "optional free text",
  "force": false
}
```

- `urls` accepts an array OR a newline-separated string (iOS Shortcuts often does the latter).
- `notes` and `urls` are both optional, but at least one must be non-empty.
- `force: true` re-ingests an identical payload by salting the content hash.

Responses:

- `202` `{ id, status: "pending", kind: "url"|"note", deduped: false }` — accepted, queued.
- `200` `{ id, status, kind, deduped: true }` — payload already submitted; returns the existing row's status.
- `400` validation failure with Zod issues.
- `401` missing/invalid bearer.

### `POST /api/ingest-images`

Image shortcut (`public/images-shortcut.png`). One request **per image**. The worker aggregates the batch.

Two body shapes are accepted:

**Multipart** (`Content-Type: multipart/form-data`):

| Field | Type |
| --- | --- |
| `image` | File (required) |
| `batchId` | string (required) |
| `imageIndex` | integer ≥ 0 |
| `totalCount` | integer ≥ 1 |
| `notes` | string (optional) |

**Raw image** (`Content-Type: image/jpeg` / `image/png` / etc.):
Metadata goes in headers OR query params:

- Headers: `X-BatchId`, `X-ImageIndex`, `X-TotalCount`, `X-Notes`
- Query: `?batchId=...&imageIndex=...&totalCount=...&notes=...`

Responses: `202`/`200` `{ id, batchId, imageIndex, totalCount, status, deduped }`. The worker won't start a batch until exactly `totalCount` rows exist for that `batchId`.

## Deduplication

`IngestSubmission.contentHash` has a unique index.

- URL/note: `sha256({ urls: urls.sort(), notes })` — re-ingesting the same URL set + notes short-circuits.
- Image: `sha256(image bytes)` — identical screenshots dedup at the byte level.
- `force: true` (URL only) salts with `Date.now()` to bypass.

Routes catch Prisma's P2002 unique-violation and return the existing row's id+status with `deduped: true` — see `lib/ingest/db.ts:createSubmission`.

## Worker

Run on the host that owns the git checkout you want PRs pushed from:

```bash
bun run worker        # foreground
bun run worker:dev    # bun --watch, restarts on code change
```

Loop (`scripts/ingest-worker.ts`):

1. Claim one URL/note row, OR a complete image batch (`pending` rows where `count(batchId) == totalCount`).
2. Run pipeline: `gemini-runner` → `git syncMain` → `createBranch` → `mdx-writer` → `commit` → `push` → `gh pr create --draft`.
3. `markCompleted` with `resultPostSlug`, `resultPrUrl`, `resultBranch`. On throw, `markFailed` with the error string and leave staged files for inspection.

SIGINT/SIGTERM exit cleanly after the current tick.

## Post-type mapping

Forced by the worker, not chosen by Gemini:

| Input | PostType | Directory |
| --- | --- | --- |
| URLs | `FINDING` | `posts/finding/` |
| Images | `SIGHT` | `posts/sight/` (images committed under `posts/sight/<batchId>/`) |
| Notes only | `BLOG` | `posts/blog/` |

Filename conventions match `scripts/lib/services/file-service.ts`: BLOG/FINDING get an `MMddyyyy-` prefix; SIGHT does not.

## Environment

See `.env.example`. Worker + routes share the same process env on the host:

| Var | Purpose |
| --- | --- |
| `INGEST_TOKEN` | Shared bearer token for both endpoints (≥32 hex chars). |
| `INGEST_REPO_PATH` | Absolute path to a git checkout the worker pushes from. Must have `gh` authenticated and push rights. |
| `INGEST_STAGING_DIR` | Where uploaded image bytes are staged. Default `/tmp/copt-ingest`. |
| `INGEST_POLL_INTERVAL_MS` | Worker poll interval. Default `5000`. |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | Gemini auth. Same env the rest of the repo uses; the worker passes it through to `@ai-sdk/google`. |
| `AI_MODEL` | Gemini model id (default `gemini-2.5-flash`). |

## iOS Shortcut configuration

Two shortcuts: one for URLs/notes, one for images. Reference screenshots: `public/url-shortcut.png`, `public/images-shortcut.png`.

The `Authorization` header must be present on every "Get contents of URL" action. Use a single `Text` action at the top of each shortcut to define the bearer string once and reference it as a Magic Variable below — easier to rotate.

### URL shortcut (`Lesswhelmed`)

Receives shared URLs (and optional notes) from Share Sheet / Quick Actions. One POST per share.

Actions, in order:

1. **Receive** — Input: URLs, from Share Sheet, Quick Actions. If no input: Ask For Text.
2. **Get URLs from Shortcut Input** — coerces input to a URL list.
3. **Ask for Text** — prompt: "Add notes (optional)". Allow blank.
4. **Get text from "Ask for Input"** — stores notes.
5. **Ask for Text** — prompt: "Force? (false || true)". Default: `false`.
6. **Get text from "Ask for Input"** — stores the force flag as text.
7. **Get contents of URL** → `https://lesswhelmed.copt.dev/api/ingest`
   - **Method**: POST
   - **Headers**:
     - `Authorization`: `Bearer <your INGEST_TOKEN>`
     - `Content-Type`: `application/json`
   - **Request Body**: JSON
     - `urls` (Text) → URLs Magic Variable
     - `notes` (Text) → notes Magic Variable
     - `force` (Boolean) → force text Magic Variable

Notes:

- The route accepts `urls` as either an array OR a newline-separated string. iOS sends it as text-joined newlines when the field type is `Text` — both work.
- `force: "true"` re-ingests an identical payload by salting the dedup hash. Default `false`.

### Image shortcut (`Lesswhelmed Images`)

Receives one or more images from Share Sheet / "What's On Screen". Each image becomes its own POST inside a Repeat loop; the worker groups them by `batchId`.

Actions, in order:

1. **Receive** — Input: Images and Media, from Share Sheet, What's On Screen. If no input: Ask For Photos.
2. **Ask for Text** — prompt: "Add notes about these images (optional)".
3. **Get text from "Ask for Input"** — stores notes.
4. **Current Date** → `Format Date` (any human-readable format works; this is opaque to the server).
5. **Set variable** `BatchId` to the formatted date string.
6. **Count** items in Shortcut Input.
7. **Set variable** `TotalCount` to the Count result.
8. **Get text from "Ask for Input"** — re-fetches the notes Magic Variable so it's available inside the Repeat.
9. **Repeat with each item in Shortcut Input**:
   - **Get contents of URL** → `https://lesswhelmed.copt.dev/api/ingest-images`
     - **Method**: POST
     - **Request Body**: File (default — the current Repeat Item, which is the image)
     - **Headers**:
       - `Authorization`: `Bearer <your INGEST_TOKEN>`
       - `X-BatchId`: `BatchId` Magic Variable
       - `X-ImageIndex`: `Repeat Index` Magic Variable — OR `Repeat Index − 1` via a Math action (see note below)
       - `X-TotalCount`: `TotalCount` Magic Variable
       - `X-Notes`: notes Magic Variable

Notes:

- `Content-Type` is set automatically by iOS based on the image's MIME (typically `image/jpeg`, `image/png`, or `image/heic`). The route reads it.
- iOS Repeat Index is **1-based**; the API contract is **0-based** (`min(0)`). Both pass validation, but if you send 1-based, the committed image filenames in the PR will be `2.<ext>, 3.<ext>, …` instead of `1.<ext>, 2.<ext>, …`. Functionally identical; cosmetic only.
- The worker waits until **exactly `totalCount`** rows are present for that `batchId` before processing. If iOS only fired N−1 requests (rare network case), the batch sits `pending` indefinitely. Inspect via `prisma studio`.

### Testing the wire shape without the worker

Point the shortcut URL at a free request inspector to see exactly what iOS sends:

```
https://webhook.site/#!/<your-id>
```

Run the shortcut. The captured request shows headers, content-type, and body shape — useful for confirming the iOS Magic Variable types resolve as expected before pointing at production.

## Operating

Inspect queue:

```bash
bunx --bun prisma studio   # browse the IngestSubmission table
```

Manually re-process a failed row (rare — usually the worker logs explain the failure):

```sql
UPDATE "IngestSubmission" SET status = 'pending', "errorMessage" = NULL WHERE id = '<id>';
```

The worker will pick it up on the next tick.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `401 unauthorized` | Token mismatch or `INGEST_TOKEN` not loaded. | Confirm header `Authorization: Bearer ...` matches env var byte-for-byte. |
| Worker logs `INGEST_REPO_PATH not configured` | Env var missing in the worker's environment. | Export it in the worker's launch unit, not just your shell. |
| Worker logs `AI_APICallError` or schema-validation failure | Missing/invalid `GEMINI_API_KEY` or the model returned malformed output. | Inspect the worker log; check the key and rate limits. Schema is enforced by Zod, so a malformed response fails the row rather than writing garbage. |
| `gh pr create did not return a PR URL` | `gh` not authenticated for the workspace's remote. | `gh auth status` in `INGEST_REPO_PATH`; re-auth if needed. |
| Image rows stuck `pending` indefinitely | Worker hasn't seen `totalCount` rows for the `batchId`. | Look for missing iterations in the shortcut; one image POST per Repeat iteration is required. |
| Submission `deduped: true` but you wanted a new post | The exact same URL set + notes was already ingested. | Toggle the shortcut's `Force?` prompt to `true`, or change the notes. |
| iOS shortcut returns `400 missing batchId` for images | A header isn't reaching the server (iOS sometimes silently strips empty Magic Variables). | Point the shortcut at webhook.site, run it, confirm `X-BatchId`/`X-ImageIndex`/`X-TotalCount` are present and non-empty. Ensure `BatchId`/`TotalCount` are `Set Variable`d **before** the Repeat block. |
| Image POST returns `400 empty image body` | iOS sent metadata-only with no file body. | Confirm "Request Body" in the URL action is left as **File** (default inside a Repeat-with-each), not JSON or Form. |

## Bootstrapping

```bash
bun run ingest:setup
```

Validates prerequisites (`bun`, `gh`, `@ai-sdk/google` installed, Gemini API key, Postgres `DATABASE_URL`, git checkout at `INGEST_REPO_PATH` with `gh` authenticated), generates an `INGEST_TOKEN` if absent, creates the staging dir, and prints the exact iOS Shortcut header values you need.
