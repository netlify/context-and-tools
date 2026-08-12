---
name: netlify-blobs
description: Store and retrieve unstructured objects, file uploads, and cache-like state on Netlify using the @netlify/blobs key/value API from Functions, Edge Functions, and Build Plugins. Use when a task involves saving user file or image uploads, persisting form or contact-form submissions, storing generated output from Background Functions (sitemaps/processed media/bulk-email results), building read-only asset stores, adding client-side blob expiration, or wiring file-based blob uploads at deploy time. Not for per-user, transactional, or relational data (counters/balances/sessions) — reach for Netlify DB there instead.
---

# Netlify Blobs

Modern import — reach for this:

```ts
import { getStore, getDeployStore, listStores } from "@netlify/blobs";
```

Install: `npm install @netlify/blobs`. Fetch API is required (built into Node 18+); otherwise pass a custom `fetch`.

Two ways to open a store — use the **options-object form** when you need `consistency` or a custom `fetch` (the string form cannot pass them):

```ts
const store = getStore("file-uploads");                          // string form
const store = getStore({ name: "animals", consistency: "strong" }); // options form
```

`siteID`, `token`, `deployID`, and `region` are set automatically inside Functions, Edge Functions, and Build Plugins — do not pass them manually there.

## Choosing the store type — READ THIS FIRST

- **`getStore(name)`** — site-scoped. Persists across deploys and is **shared across ALL deploy contexts**. Code on a Deploy Preview reads, overwrites, and deletes production data. **Never seed throwaway data or run destructive tests from a preview.**
- **`getDeployStore(name)`** — scoped to one deploy; isolated from production. Use this for throwaway/per-deploy data, or use a context-specific store name for isolation.

Blobs have **no built-in access control** — the serving function is the gate. Default to private: gate reads behind an authenticated function rather than exposing blobs publicly. Never accept an arbitrary caller-supplied key against a store holding sensitive data.

## Common tasks

### Persist a user upload with metadata (`set`)

```ts
import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";
import { v4 as uuid } from "uuid";

export default async (req: Request, context: Context) => {
  const form = await req.formData();
  const file = form.get("file") as File;
  const key = uuid();

  const uploads = getStore("file-uploads");
  await uploads.set(key, file, {
    metadata: { country: context.geo.country.name }
  });

  return new Response("Submission saved");
};
```

Edge Function form is identical but imports `Context` from `@netlify/edge-functions`.

### Persist JSON (`setJSON`)

```ts
const uploads = getStore("json-uploads");
await uploads.setJSON(key, data, { metadata: { country: context.geo.country.name } });
```

### Read a blob (`get`) — always null-check

```ts
const uploads = getStore("file-uploads");
const entry = await uploads.get(key);          // string by default
if (entry === null) {
  return new Response(`Could not find ${key}`, { status: 404 });
}
return new Response(entry);
```

Pass `type` for other formats: `get(key, { type: "json" | "arrayBuffer" | "blob" | "stream" | "text" })`.

### Atomic conditional write

Write only if the key is new:

```ts
const { modified } = await store.set("jane@netlify.com", "Jane Doe", { onlyIfNew: true });
if (!modified) return new Response("Email already exists", { status: 400 });
```

Write only if the entry matches a known ETag (compare-and-swap):

```ts
const { modified } = await store.set(key, "New Jane", { onlyIfMatch: etag });
if (!modified) return new Response("Cached data is stale", { status: 400 });
```

**Do not build counters, balances, or read-modify-write logic on a blob key** — even with `onlyIfMatch` retries. That is transactional data; use Netlify DB.

### List blobs

```ts
const { blobs } = await store.list();          // auto-paginates all pages
// blobs: [ { etag: "\"etag1\"", key: "..." }, ... ]
```

Manual pagination (returns an `AsyncIterator`):

```ts
for await (const entry of store.list({ paginate: true })) {
  console.log(entry.blobs);
}
```

Hierarchical listing — group keys with `/`, set `directories: true` to list one level, and use a **trailing slash** on `prefix` to drill in (without it, `cats` would also match `catsuit`):

```ts
const { blobs, directories } = await store.list({ directories: true });      // top level
const catList = await store.list({ directories: true, prefix: "cats/" });    // inside cats/
```

### List stores

```ts
const { stores } = await listStores();   // does NOT include deploy-specific stores
```

### Delete

```ts
await store.delete(key);                       // resolves undefined
const { deletedBlobs } = await store.deleteAll(); // deletes the whole store; 0 if it didn't exist
```

### Build plugin — write to a deploy-specific store

Build plugins can **READ from any of the site's stores, but can WRITE only to deploy-specific stores** (`getDeployStore`).

```js
import { readFile } from "node:fs/promises";
import { getDeployStore } from "@netlify/blobs";
import { v4 as uuid } from "uuid";

export const onPostBuild = async () => {
  const file = await readFile("some-file.txt", "utf8");
  const uploads = getDeployStore("file-uploads");
  await uploads.set(uuid(), file);
};
```

### Client-side expiration (no server-side TTL)

Blobs have no TTL. Store a timestamp in metadata, check it on read, and `delete` when expired:

```ts
await uploads.set(key, await req.text(), {
  metadata: { expiration: new Date("2024-01-01").getTime() }
});
const entry = await uploads.getWithMetadata(key);
const { expiration } = entry.metadata;
if (expiration && expiration < Date.now()) {
  await uploads.delete(key);
}
```

### Conditional read with ETag (`getWithMetadata`)

```ts
const { data, etag } = await uploads.getWithMetadata("my-key", { etag: cachedETag });
if (etag === cachedETag) {
  // data is null — cached copy still fresh
}
```

`getWithMetadata` returns `{ data, etag, metadata }`, or `null` if the key is absent. `getMetadata(key)` returns `{ metadata, etag }` (no blob body) — use it to check existence cheaply.

## API surface

Store instance methods:
- `set(key, value, { metadata, onlyIfMatch, onlyIfNew })` → `{ modified, etag }`. `value` is `ArrayBuffer | Blob | string`.
- `setJSON(key, value, { metadata, onlyIfMatch, onlyIfNew })` → `{ modified, etag }`.
- `get(key, { consistency, type })` → blob in requested format, or `null`.
- `getWithMetadata(key, { consistency, etag, type })` → `{ data, etag, metadata }` or `null`.
- `getMetadata(key, { consistency, etag })` → `{ metadata, etag }` or `null`.
- `list({ directories, paginate, prefix })` → `{ blobs, directories }` (auto-paginates unless `paginate: true`).
- `delete(key)` → `undefined`.
- `deleteAll()` → `{ deletedBlobs }`.

Module functions:
- `listStores({ paginate })` → `{ stores }`. Excludes deploy-specific stores.

## Configuration

### Consistency
Default is **eventual**: writes are globally readable immediately; updates and deletes propagate within **60 seconds**. Opt into **strong** consistency per store or per read:

```ts
const store = getStore({ name: "animals", consistency: "strong" }); // whole store
await store.get("dog", { consistency: "strong" });                  // single read
```

The CLI always uses strong consistency.

### Regions (deploy-specific stores)
Deploy-specific stores default to the function's region. Override with `region`:

```ts
const uploads = getDeployStore({ name: "file-uploads", region: "ap-southeast-2" });
```

Available regions: https://docs.netlify.com/build/functions/configuration#region

### File-based uploads (no build plugin)
Place blob files under `.netlify/blobs/deploy/` in the site's base directory; Netlify uploads them to deploy-specific stores (preserving directory structure) after build, before deploy.

- Attach metadata with a sibling JSON file prefixed with `$`: `$mouse.jpg.json` for `mouse.jpg`, `dogs/$good-boy.jpg.json` for `dogs/good-boy.jpg`.
- Metadata files must be valid JSON or **the deploy fails**.
- `.netlify/blobs/deploy` is **wiped before each build** — files must be created DURING the build (build command or plugin). Files committed to the repo beforehand are NOT uploaded.
- Requires continuous deployment or CLI deploys.

## Constraints & gotchas

- **Store names:** no `/`, no `:`, max 64 bytes.
- **Keys:** non-empty, cannot start with `/`, max 600 bytes, any Unicode. (UTF-8: most chars 1 byte, some more, e.g. `à` = 2 bytes.)
- **Sizes:** object ≤ 5 GB; metadata ≤ 2 KB.
- **Pagination pages:** `list` and `listStores` cap pages at 1,000 entries/stores.
- **Last write wins** — no concurrency control beyond `onlyIfMatch` / `onlyIfNew`.
- **Go Functions cannot access Blobs.**
- **Local dev (Netlify Dev)** uses a sandboxed local store: no file-based uploads, and you cannot read production data.
- **Not supported** under Netlify's HIPAA-compliant hosting.
- Deploy deletion cleans up deploy-specific stores only; other stores need manual deletion or your own expiration logic.
- Downloading a deploy does NOT include deploy-specific blobs; locking a published deploy does NOT prevent writes to its deploy-specific stores.
- Encrypted at rest and in transit; blobs are reachable only through your own site.

## When something fails
Surface the error and read the function logs. Do not invent REST endpoints or side-channel APIs to retry a failed store operation.

## CLI & migration
Inspect blobs with `netlify blobs:list` / `:get` / `:set` / `:delete` — reference: https://cli.netlify.com/commands/blobs/

If you wrote to site-wide stores with `@netlify/blobs` ≤ 6.5.0, data becomes inaccessible after upgrading (namespacing change). Migrate with the latest CLI, which makes the store accessible on 7.0.0+:

```sh
netlify recipes blobs-migrate YOUR_STORE_NAME
```

<!-- system: agent-context/blobs/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify house rules (blobs)

These are org conventions, not docs facts — merged into the rendered skill by
ctx-gen and never generated. Owned by the skills maintainer.

1. Blobs is not a database. For dynamic, per-user, or transactional data,
   use Netlify DB — Blobs is for objects, files, and cache-like state.
2. When a store operation fails, surface the error and read the function
   logs — do not invent REST endpoints or side-channel APIs to retry.
3. `netlify blobs:list/get/set/delete` exist for inspection; the CLI
   reference is their source of truth — link, don't restate.
4. Blobs have no built-in access control — the serving function is the gate.
   When in doubt, default to private: gate reads behind an authenticated
   function rather than exposing blobs publicly.
5. Site-scoped stores are shared across ALL deploy contexts — code on a
   deploy preview reads, overwrites, and deletes production data. Never run
   destructive tests or seed throwaway data from previews; use
   `getDeployStore()` or a context-specific store name for isolation.
6. Don't build counters, balances, or read-modify-write logic on a blob key —
   even with `onlyIfMatch` retries. That's transactional data; use Netlify DB.
7. Build plugins: state BOTH halves — they can read from any of the site's
   stores, but write only to deploy-specific stores (`getDeployStore`).
