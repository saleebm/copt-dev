# iOS Shortcut → Review / Merge / Publish

Companion API to `docs/ingest.md`. The ingest pipeline produces draft PRs; this surface lets an iOS Shortcut **review** them, **merge** them, and toggle **published** status per post — without opening GitHub.

Per the project's truth hierarchy, this doc points at code. When something here drifts from the source, the source wins.

## Architecture (one-liner)

```
iOS Shortcut → GET  /api/review/queue           → pick a PR
            → GET  /api/review/pr/{number}      → preview MDX + metadata
            → POST /api/review/merge            → gh pr merge (+ optional publish)
            → POST /api/review/close            → gh pr close (reject)
            → GET  /api/review/posts            → list recent posts in DB
            → POST /api/review/publish          → toggle Post.published / status
```

| Layer | Path |
| --- | --- |
| Routes | `app/api/review/{queue,pr/[number],merge,close,posts,publish}/route.ts` |
| Shared lib | `lib/review/{auth,gh,queue,publish,index}.ts` |
| Pluggable providers | `lib/review/providers/{index,types,post-type}.ts` |
| Schema (existing) | `prisma/schema.prisma` — `Post.status` / `Post.published` |

The system is intentionally **module-style**: each `PostType` (or any future ingest target) registers a `ReviewProvider` that knows how to (1) recognise its PRs by file path, (2) predict the eventual post slug before sync, and (3) optionally run hooks on merge / publish toggle. Adding a new ingest content type is one file under `lib/review/providers/` plus an entry in the registry — routes don't change.

## Auth

All routes require `Authorization: Bearer $REVIEW_TOKEN`. Falls back to `INGEST_TOKEN` so a single Shortcut secret covers both surfaces. 401 otherwise.

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
  "publish": false,         // also flip Post.published=true once merged
  "body": "optional merge body"
}
```

iOS Shortcuts ship scalars as text — `number`, `admin`, `deleteBranch`, and `publish` all accept string forms (`"42"`, `"true"`).

Response:

```json
{
  "ok": true,
  "merge": {
    "number": 42,
    "branch": "ingest/img-2025-11-19",
    "provider": { "id": "sight", "label": "Sight", "postType": "SIGHT", "predictedSlug": "cats-on-the-rug", "mdxPath": "posts/sight/cats-on-the-rug.mdx" },
    "predictedSlug": "cats-on-the-rug"
  },
  "publish": null,           // populated if publish=true succeeded
  "publishError": null       // populated if publish=true but the post wasn't in the DB yet (sync still pending)
}
```

Note: posts only appear in the DB after `bun run db:sync-posts` runs against the new `main`. The Linode deploy (`bun run deploy`) does this for you. If you set `publish: true` immediately after merge **before** a deploy/sync, you'll get a 200 with `publishError: "post not found: <slug>"` — re-call `/api/review/publish` after the next deploy.

### `POST /api/review/close`

```json
{ "number": 42, "comment": "reject reason (optional)" }
```

Calls `gh pr close --delete-branch`.

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
| `REVIEW_TOKEN` | Bearer for `/api/review/*`. Falls back to `INGEST_TOKEN`. |
| `REVIEW_REPO_PATH` | Git checkout the routes use for `gh pr` calls. Falls back to `INGEST_REPO_PATH`. `gh auth status` must be green inside it. |

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

Two shortcuts compose the review loop. Both reuse the `INGEST_TOKEN` bearer.

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
