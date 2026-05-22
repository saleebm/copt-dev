# iOS Shortcut → Review / Merge / Publish

Companion API to `docs/ingest.md`. The ingest pipeline produces draft PRs; this surface lets an iOS Shortcut **review** them, **merge** them, and toggle **published** status per post — without opening GitHub.

Per the project's truth hierarchy, this doc points at code. When something here drifts from the source, the source wins.

## Architecture (one-liner)

```
iOS Shortcut → GET  /api/review/queue                → pick a PR
            → GET  /api/review/pr/{number}           → preview MDX + metadata
            → POST /api/review/merge                 → gh pr merge (+ optional publish)
            → POST /api/review/close                 → gh pr close (reject)
            → POST /api/review/deploy                → spawn deploy.sh, return runId
            → GET  /api/review/deploy/{runId}        → tail deploy log + state
            → GET  /api/review/posts                 → list recent posts in DB
            → POST /api/review/publish               → toggle Post.published / status
```

| Layer | Path |
| --- | --- |
| Routes | `app/api/review/{queue,pr/[number],merge,close,deploy,deploy/[runId],posts,publish}/route.ts` |
| Shared lib | `lib/review/{auth,gh,queue,publish,deploy}.ts` |
| Pluggable providers | `lib/review/providers/{index,types,post-type}.ts` |
| Schema (existing) | `prisma/schema.prisma` — `Post.status` / `Post.published` |
| Deploy script | `deploy.sh` (flock-locked, tee'd into `$DEPLOY_LOG_DIR/copt-dev-deploy-<id>.log`) |

The system is intentionally **module-style**: each `PostType` (or any future ingest target) registers a `ReviewProvider` that knows how to (1) recognise its PRs by file path, (2) predict the eventual post slug before sync, and (3) optionally run a hook on publish toggle. Adding a new ingest content type is one file under `lib/review/providers/` plus an entry in the registry — routes don't change.

## Happy path: ingest → published on `main`

The end-to-end loop the iOS Shortcut drives. Steps 1, 5, and the deploy poll in 6 are async; everything else is synchronous request/response.

1. **Ingest worker** (separate process; see `docs/ingest.md`) opens a **draft** PR on `ingest/<type>-<id>` containing `posts/<type>/<slug>.mdx` + assets.
2. `GET /api/review/queue?state=open` — Shortcut lists open PRs annotated by provider (`finding` / `sight` / `blog` / `concrete`).
3. *(Optional)* `GET /api/review/pr/{n}` — preview the MDX body before deciding.
4. `POST /api/review/merge` with `{ "number": n, "publish": "true" }` —
   - If the PR is draft, the API calls `gh pr ready` first (default `markReady:true`).
   - Then `gh pr merge --squash --delete-branch`.
   - Then attempts `setPublished({ slug: predictedSlug, published: true })`. This will return `publishError: "post not found: <slug>"` because the new MDX hasn't been synced into the DB yet — that's expected (see [Merge → publish race](#merge--publish-race) below).
5. `POST /api/review/deploy` (separate strict-tier endpoint) — `deploy.sh` pulls `main`, builds, and runs `db:sync-posts`, which upserts the post.
6. If step 4 surfaced `publishError`, re-call `POST /api/review/publish` with `{ "slug": "<slug>", "published": "true" }` once `GET /api/review/deploy/{runId}` reports `state: "completed"`. The post is now `published=true` / `status=PUBLISHED` and live.

The "Toggle Published" Shortcut described below covers step 6 (and the reverse direction — flipping any existing post back to draft).

## Auth

Tiered bearer auth, designed so one Shortcut secret works out of the box but you can ratchet down least-privilege when you want to.

| Tier | Routes | Token precedence (first non-empty wins) |
| --- | --- | --- |
| Review | `/queue`, `/pr/{n}`, `/merge`, `/close`, `/posts`, `/publish` | `REVIEW_TOKEN` → `INGEST_TOKEN` |
| Deploy | `/deploy`, `/deploy/{runId}` | `DEPLOY_TOKEN` → `REVIEW_TOKEN` → `INGEST_TOKEN` |

Constant-time compare on every check. 401 with a `reason` field on failure (the reason names which env var the tier expected, so misconfig is obvious without leaking the token).

If you only set `INGEST_TOKEN`, every route works — same secret for ingest, review, and deploy. Set `DEPLOY_TOKEN` to a distinct value when you want a household Shortcut able to merge/publish but not redeploy.

## Endpoints

### `GET /api/review/queue`

List open PRs annotated with provider info.

Query params:

| Param | Default | Notes |
| --- | --- | --- |
| `type` | — | Filter by provider id (`finding`, `sight`, `blog`, `concrete`) |
| `state` | `open` | `open` \| `closed` \| `merged` \| `all` |
| `limit` | `50` | Forwarded to `gh pr list --limit` |
| `all` | `false` | `true` drops the `ingest/` branch-prefix filter (review human PRs too) |

Response:

```json
{
  "count": 1,
  "items": [{
    "number": 42,
    "title": "ingest: Cats on the Rug",
    "url": "https://github.com/owner/repo/pull/42",
    "branch": "ingest/img-2025-11-19",
    "isDraft": true,
    "author": "saleebm",
    "createdAt": "...",
    "updatedAt": "...",
    "labels": [],
    "provider": {
      "id": "sight",
      "label": "Sight",
      "postType": "SIGHT",
      "predictedSlug": "cats-on-the-rug",
      "mdxPath": "posts/sight/cats-on-the-rug.mdx"
    }
  }]
}
```

### `GET /api/review/pr/{number}`

Single-PR detail with body, file list, and an MDX preview (read from the PR head ref via `gh api`).

Response adds `body`, `state`, `mergeable`, `files[]`, and `mdxPreview` (string | null) to the queue-item shape above.

### `POST /api/review/merge`

Body — `Content-Type: application/json`:

```json
{
  "number": 42,
  "method": "squash",      // "squash" (default) | "merge" | "rebase"
  "admin": false,           // gh pr merge --admin (bypass required checks)
  "deleteBranch": true,     // gh pr merge --delete-branch (default true)
  "markReady": true,        // gh pr ready first if PR is still draft (default true — ingest PRs are draft)
  "publish": false,         // also flip Post.published=true once merged
  "body": "optional merge body"
}
```

iOS Shortcuts ship scalars as text — `number`, `admin`, `deleteBranch`, `markReady`, and `publish` all accept string forms (`"42"`, `"true"`).

Response:

```json
{
  "ok": true,
  "merge": {
    "number": 42,
    "branch": "ingest/img-2025-11-19",
    "provider": { "id": "sight", "label": "Sight", "postType": "SIGHT", "predictedSlug": "cats-on-the-rug", "mdxPath": "posts/sight/cats-on-the-rug.mdx" },
    "predictedSlug": "cats-on-the-rug",
    "markedReady": true
  },
  "publish": null,           // populated if publish=true succeeded
  "publishError": null       // populated if publish=true but the post wasn't in the DB yet (sync still pending)
}
```

<a id="merge--publish-race"></a>**Merge → publish race.** New ingest posts only land in the DB after `bun run db:sync-posts` runs against the new `main` (the Linode deploy does this for you). If `publish: true` fires immediately after merge, the post isn't there yet — the API returns **`200` with `publishError: "post not found: <slug>"`** alongside a successful `merge` block. Treat this as "merged, will publish after deploy" and re-call `/api/review/publish` once `/api/review/deploy/{runId}` reports `state: "completed"`.

### `POST /api/review/close`

```json
{ "number": 42, "comment": "reject reason (optional)" }
```

Calls `gh pr close --delete-branch`.

### `POST /api/review/deploy`

Spawns the deploy command (default `./deploy.sh`) detached and returns **immediately** — the actual deploy runs in the background and survives `pm2 startOrReload` killing the Next.js worker that handled the request.

Body — `Content-Type: application/json` (all fields optional):

```json
{
  "triggeredBy": "ios-shortcut",  // recorded in the log header
  "reason": "merged PR #42"        // recorded in the log header
}
```

The API forwards `triggeredBy` and `reason` to `deploy.sh` as `DEPLOY_TRIGGERED_BY` and `DEPLOY_REASON` env vars for log-header annotation only — they are not server-side configurables.

Response (`202`):

```json
{
  "ok": true,
  "runId": "20251119-034712-018",
  "pid": 12345,
  "command": "./deploy.sh",
  "cwd": "/home/deploy/apps/copt-dev",
  "logPath": "/home/deploy/logs/deploy-20251119-034712-018.log",
  "startedAt": "2026-05-20T03:47:12.018Z",
  "statusUrl": "/api/review/deploy/20251119-034712-018"
}
```

Concurrency: `deploy.sh` re-execs itself under `flock -n $DEPLOY_LOCK_FILE`. If a deploy is already running, the spawned process exits non-zero with `flock: failed to get lock` in the log — the API still returns `202` (it's fire-and-forget), so poll the status endpoint to see the failure.

### `GET /api/review/deploy/{runId}`

Returns the current state and a log tail.

Query params:

| Param | Default | Notes |
| --- | --- | --- |
| `tailBytes` | `16384` | Cap on returned log size; full file always exists at `logPath` |

Response:

```json
{
  "runId": "20251119-034712-018",
  "state": "completed",          // "running" | "completed" | "failed" | "unknown"
  "exitCode": 0,                  // null while running
  "startedAt": "2026-05-20T03:47:12Z",
  "finishedAt": "2026-05-20T03:48:51Z",
  "logPath": "/home/deploy/logs/deploy-20251119-034712-018.log",
  "log": "==> deploy-id 20251119-034712-018\n... full tail ...\n==> exitCode 0\n",
  "sizeBytes": 8412
}
```

State derivation reads the log tail for `==> exitCode <n>` and `==> finishedAt <ts>` markers, both emitted by the hardened `deploy.sh`. 404 if the log file doesn't exist (invalid `runId` or it was cleaned up).

### `GET /api/review/posts`

Read-side counterpart for the publish toggle. Lists posts in the DB ordered by `updatedAt desc`.

Query params:

| Param | Default | Notes |
| --- | --- | --- |
| `type` | — | `BLOG` \| `FINDING` \| `SIGHT` \| `CONCRETE` (case-insensitive) |
| `status` | — | `PUBLISHED` \| `DRAFT` \| `ARCHIVED` (case-insensitive) |
| `limit` | `25` | Hard cap on row count |

Each item has `slug`, `title`, `type`, `status`, `published`, `updatedAt`, `createdAt`, `originalUrl`, `sourceType`, `providerId`.

### `POST /api/review/publish`

```json
{ "slug": "cats-on-the-rug", "published": true }
```

Updates `Post.published` and sets `Post.status` to `PUBLISHED` or `DRAFT` accordingly. Fires any registered provider `onPublishChange` hook.

The DB is the runtime truth — this is what the running app reads. The MDX frontmatter is reconciled on the next `db:sync-posts` (next deploy). If you want the publish toggle to survive a re-sync, edit the frontmatter in the source MDX as well, or rely on the post staying drafted-by-default until you explicitly flip it.

Returns 404 if the slug doesn't exist in the DB yet.

## Environment

| Var | Purpose |
| --- | --- |
| `REVIEW_TOKEN` | Bearer for the review tier. Falls back to `INGEST_TOKEN`. |
| `REVIEW_REPO_PATH` | Git checkout the routes use for `gh pr` calls. Falls back to `INGEST_REPO_PATH`. `gh auth status` must be green inside it. |
| `DEPLOY_TOKEN` | Bearer for the deploy tier. Falls back to `REVIEW_TOKEN` → `INGEST_TOKEN`. |
| `REVIEW_DEPLOY_CMD` | Command spawned by `/api/review/deploy`. Default: `./deploy.sh`. |
| `REVIEW_DEPLOY_CWD` | Working directory for the deploy command. Falls back to `REVIEW_REPO_PATH` → `INGEST_REPO_PATH`. |
| `REVIEW_DEPLOY_LOG_DIR` | Where per-run deploy logs land. Default: `/tmp/copt-deploys`. Production should override to a persistent path (e.g. `/home/deploy/logs`) so logs survive PM2 restarts. |
| `DEPLOY_LOCK_FILE` | Path `deploy.sh` `flock`s on to serialize concurrent runs. Default: `$APP_DIR/.deploy.lock`. |
| `DEPLOY_LOG_DIR` | Where `deploy.sh` writes its `tee`'d log. Default: `/home/deploy/logs`. Should equal `REVIEW_DEPLOY_LOG_DIR` so the API can find the log it spawned. |

No new infra — runs in the existing Next.js process alongside `/api/ingest`.

## Extensibility: adding a new content type

The review surface is provider-driven so you can add new ingestable kinds without touching routes.

1. Drop a module in `lib/review/providers/` exporting a `ReviewProvider`:
   ```ts
   export const myKindProvider: ReviewProvider = {
     id: "my-kind",
     label: "My Kind",
     postType: PostType.FINDING, // or null if not a Post
     priority: 5,                // lower = matched first
     match(pr) {
       const files = pr.files.map(f => f.path);
       if (!files.some(p => p.startsWith("posts/my-kind/"))) return null;
       return {
         id: "my-kind",
         postType: PostType.FINDING,
         label: "My Kind",
         predictedSlug: deriveSlug(files[0]),
         mdxPath: files[0],
       };
     },
     async onMerge(ctx) { /* optional */ },
     async onPublishChange(ctx) { /* optional */ },
   };
   ```
2. Add it to `REVIEW_PROVIDERS` in `lib/review/providers/index.ts`.
3. Done — `/api/review/queue?type=my-kind` filters to it, `/api/review/merge` carries the new provider in its response, and the iOS Shortcut picks it up automatically because the picker reads the provider list from the queue response.

## iOS Shortcut configuration

Three shortcuts compose the review loop: **Review Ingest** (pick + merge), **Deploy Now** (push + tail log), and **Toggle Published** (flip an existing post's status). All three reuse the same `INGEST_TOKEN` bearer by default; set `DEPLOY_TOKEN` separately if you want Deploy Now on a different device.

### First-time setup

You only do this once. The three recipes below assume you've done these steps.

**1. Confirm the server is reachable.**

Smoke-test from your laptop before touching iOS — Shortcuts is harder to debug than curl. Use the `Wire-shape testing without iOS` block below to confirm `/api/review/queue` returns `200` with a `count` and `items` array. If it doesn't, fix the server side first (see [Troubleshooting](#troubleshooting)).

**2. Pick your base URL and token.**

- **Base URL**: `https://copt.dev` for prod, or your tunneled dev URL (e.g. ngrok / portless).
- **Token**: whatever you set as `INGEST_TOKEN` in the server's `.env`. Treat it like a password — paste it into Shortcuts once and never type it in plaintext anywhere else (Notes, Messages, screenshots).

**3. Open the Shortcuts app on iOS.**

Comes preinstalled. If you removed it, redownload from the App Store. Tap **+** in the top-right of the **My Shortcuts** tab to start a new shortcut.

**4. Learn the four iOS Shortcut primitives this API uses.**

Every recipe below is built from these four building blocks. Search for them by name in the action picker (bottom sheet inside the shortcut editor).

| Action | What it's for | Notes |
| --- | --- | --- |
| **Text** | Holds the literal `Bearer <token>` string. | Tap the action, paste the full `Bearer abc123...`. The action's output is a Magic Variable you reference in later steps as the `Authorization` header value. |
| **Dictionary** | Builds the JSON request body and the headers map. | For request bodies, set each key to the type you want (Text / Number / Boolean). For headers, use Text values so the `Authorization` and `Content-Type` keys come through as strings. |
| **Get contents of URL** | The HTTP call itself. | Expand **Show More** → set **Method**, **Headers** (point at your Dictionary), and **Request Body** → JSON (point at your body Dictionary). |
| **Get Dictionary Value** | Reads a single field out of the JSON response. | Type the JSON key into the `Key` field. Supports dotted paths like `provider.predictedSlug`. |

**5. Reference variables as you go.**

When you tap a parameter field in a later action, iOS shows a **Select Variable** chip above the keyboard. That's how you pipe the output of one action into the input of another (the "Magic Variable" pattern referenced throughout the recipes).

**6. Store the bearer once, reuse everywhere.**

Inside each shortcut, the very first action should be a single **Text** action containing `Bearer <your-token>`. Rename its Magic Variable to `Auth` (long-press the variable → Rename). Every subsequent **Get contents of URL** action references `Auth` for the `Authorization` header. This way the token lives in exactly one place per shortcut and never appears in screenshots of headers further down.

**7. Test inside the editor before saving.**

The big **▶** at the bottom of the editor runs the shortcut once with the editor open. After each action runs, tap the action to see its actual output JSON — invaluable for catching a typo'd key path before you wire it into the next step.

**8. (Optional) Promote to one-tap.**

Once a shortcut works, you can:
- **Home-screen icon**: shortcut details → **Add to Home Screen**.
- **Siri**: "Hey Siri, Review Ingest" — uses the shortcut name verbatim.
- **Share sheet**: turn on **Show in Share Sheet** so it appears when sharing a URL from Safari (useful for a different ingest flow, not this one).
- **Apple Watch**: toggle **Show on Apple Watch** if you want a glanceable trigger.

### `Review Ingest`

Pick a PR, preview it, merge or close it. Optionally auto-publish on merge.

1. **Text** — set the bearer once: `Bearer <your INGEST_TOKEN>`. Reference as Magic Variable below.
2. **Get contents of URL** → `https://copt.dev/api/review/queue?state=open`
   - Method: GET
   - Headers: `Authorization` → bearer Magic Variable
3. **Get Dictionary from Input** → key `items` → `items` list.
4. **Choose from List** (`items`) — show `title`. Magic Variable: `selected`.
5. **Get Dictionary Value** → key `number` from `selected` → `prNumber`.
6. **Choose from Menu** with menu items:
   - "Preview"
   - "Merge as draft (don't publish)"
   - "Merge and publish"
   - "Close (reject)"
7. **Per menu branch**:
   - **Preview**: GET `https://copt.dev/api/review/pr/[prNumber]`, then Show Result (use `mdxPreview` + `body`).
   - **Merge as draft**: Get contents of URL → POST `https://copt.dev/api/review/merge`
     - Headers: `Authorization`, `Content-Type: application/json`
     - JSON body: `{ "number": [prNumber], "publish": "false" }`
   - **Merge and publish**: same as above but `"publish": "true"`.
   - **Close**: POST `https://copt.dev/api/review/close` with `{ "number": [prNumber] }`.
8. **Show Notification** with the response `ok` / `error`.

### `Deploy Now`

One-tap trigger that pushes the latest `main` (which now contains the just-merged PR) to production and tails the log until done.

1. **Text** — bearer Magic Variable (use `DEPLOY_TOKEN` if you set one, else `INGEST_TOKEN`).
2. **Get contents of URL** → POST `https://copt.dev/api/review/deploy`
   - JSON body: `{ "triggeredBy": "ios-shortcut", "reason": "Manual deploy" }`
3. **Get Dictionary Value** → `runId`.
4. **Repeat 30 times**:
   - **Wait** 5 seconds
   - GET `https://copt.dev/api/review/deploy/[runId]` with bearer
   - **If** `state` is not `running`, **Stop Repeat**.
5. **Show Notification** with `state` + `exitCode`. Optionally **Show Result** with the last 2 KB of `log`.

### `Toggle Published`

Flip a post's published status by slug.

1. **Get contents of URL** → `https://copt.dev/api/review/posts?limit=50` with bearer header.
2. **Get Dictionary from Input** → `items`.
3. **Choose from List** → show `title (published: <published>)`. Magic Variable: `post`.
4. **Get Dictionary Value** → key `slug` → `slug`. Key `published` → `current`.
5. **POST** `https://copt.dev/api/review/publish` with `{ "slug": "[slug]", "published": "[!current]" }` (use a Math/If to flip).
6. **Show Notification** with the response.

### Wire-shape testing without iOS

Hit each route locally with curl:

```bash
TOK="Bearer $INGEST_TOKEN"
BASE="$NEXT_PUBLIC_APP_URL"   # e.g. https://copt.dev or your local dev URL

curl -H "Authorization: $TOK" "$BASE/api/review/queue?state=open"
curl -H "Authorization: $TOK" "$BASE/api/review/pr/42"
curl -H "Authorization: $TOK" -H "Content-Type: application/json" \
     -d '{"number":42,"publish":"true"}' \
     "$BASE/api/review/merge"
curl -H "Authorization: $TOK" -H "Content-Type: application/json" \
     -d '{"slug":"cats-on-the-rug","published":"false"}' \
     "$BASE/api/review/publish"

curl -H "Authorization: $TOK" -H "Content-Type: application/json" \
     -d '{"triggeredBy":"curl","reason":"smoketest"}' \
     "$BASE/api/review/deploy"
# Then poll:
curl -H "Authorization: $TOK" "$BASE/api/review/deploy/20251119-034712-018"
```

## Operating

Inspect failed merges:

```bash
gh pr view <number>          # in REVIEW_REPO_PATH
gh pr checks <number>
```

If `mergeable` is `CONFLICTING`, the iOS Shortcut surface won't fix it for you — open the PR locally and resolve manually, then re-run merge.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `401 unauthorized` | Bearer mismatch | Confirm `REVIEW_TOKEN` (or `INGEST_TOKEN`) byte-for-byte matches the Shortcut. |
| `500 queue failed` w/ `gh pr list failed` | `gh` not authenticated in `REVIEW_REPO_PATH` | `gh auth status` in that dir; re-auth. |
| Merge returns `publishError: "post not found: ..."` | Post hasn't been sync'd yet (the deploy hasn't pulled main + run `db:sync-posts`) | Deploy, then call `/api/review/publish` directly. |
| Merge fails with `Pull request is not mergeable` | Conflict or required check failing | Resolve manually or pass `"admin": "true"` if you have admin merge rights. |
| Provider id is `"unknown"` in queue response | PR touches no `posts/<type>/*.mdx` file | Either it's not an ingest PR, or it spans multiple types — register a more specific provider or pass `?all=true`. |
| `POST /api/review/deploy` returns 202 but `state` stays `unknown` forever | The spawned process didn't write the header; usually `REVIEW_DEPLOY_CWD` doesn't exist or `REVIEW_DEPLOY_CMD` isn't executable. | Check the log file at `logPath`; verify `cwd` and `command` in the 202 response actually exist. |
| Deploy log ends with `flock: failed to get lock` | A previous deploy is still running. | `GET /api/review/deploy/[runId]` for both runs; wait for the first to finish, then retry. |
| `404 deploy run not found` | Wrong `runId`, or `REVIEW_DEPLOY_LOG_DIR` differs from `DEPLOY_LOG_DIR` so the API and `deploy.sh` aren't looking in the same place. | Set both env vars to the same path (e.g. `/home/deploy/logs`). |
