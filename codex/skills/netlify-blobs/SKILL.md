---
name: netlify-blobs
description: Guide for using Netlify Blobs for file and asset storage — images, documents, uploads, exports, cached binary artifacts. Covers getStore(), CRUD operations, metadata, listing, deploy-scoped vs site-scoped stores, and local development. Do NOT use Blobs as a dynamic data store — use Netlify Database for that.
---

# Netlify Blobs

Netlify Blobs is zero-config object storage for **files and assets**: images, documents, uploads, exports, cached binary artifacts. Available from any Netlify compute (functions, edge functions, framework server routes). No provisioning required.

**Not for dynamic data.** If the project needs to store records, user data, application state, or anything queryable, use Netlify Database instead — see `netlify-database/SKILL.md`. Reach for Blobs when the thing you're storing is a file or an asset blob, not a record.

```bash
npm install @netlify/blobs
```

## Before you build

If the prompt didn't already specify, ask the user a few short questions before scaffolding any blob storage — answers shape access patterns, scoping, and how the assets are served back to clients:

- **What kind of asset?** (User uploads, exported documents, cached binaries, generated images — drives the storage and serving pattern.)
- **Who should be able to read it?** Public (anyone with a URL, or an unauthenticated endpoint that streams the blob) or private (only authenticated users, gated by your server code)? Blobs have **no built-in access control** — the serving layer is the gate. When in doubt, default to private; making something public later is easy, while pulling back data that was inadvertently exposed is not.
- **Site-scoped or deploy-scoped?** Site-scoped (`getStore()`) persists across deploys — the right default for user data. Deploy-scoped (`getDeployStore()`) is tied to a single deploy and disappears when that deploy is replaced — use only when the lifecycle should match a deploy (e.g., per-deploy build artifacts).
- **Roughly how big and how many?** Helps choose between a single large blob vs many small keyed blobs, and informs whether you'll need `list({ prefix: ... })` patterns.

**If you don't have preferences here, tell me what the assets are and I'll pick sensible defaults** — typically site-scoped with private access, served through an authenticated function.

## Getting a Store

```typescript
import { getStore } from "@netlify/blobs";

const store = getStore({ name: "my-store" });

// Use "strong" consistency when you need immediate reads after writes
const store = getStore({ name: "my-store", consistency: "strong" });
```

## CRUD Operations

These are the **only** store methods. Do not invent others.

### Create / Update

```typescript
// String or binary data
await store.set("key", "value");
await store.set("key", fileBuffer);

// With metadata
await store.set("key", data, {
  metadata: { contentType: "image/png", uploadedAt: new Date().toISOString() },
});

// JSON data
await store.setJSON("key", { name: "Example", count: 42 });
```

### Read

```typescript
// Text (default)
const text = await store.get("key");                    // string | null

// Typed retrieval
const json = await store.get("key", { type: "json" });  // object | null
const stream = await store.get("key", { type: "stream" });
const blob = await store.get("key", { type: "blob" });
const buffer = await store.get("key", { type: "arrayBuffer" });

// With metadata
const result = await store.getWithMetadata("key");
// { data: any, etag: string, metadata: object } | null

// Metadata only (no data download)
const meta = await store.getMetadata("key");
// { etag: string, metadata: object } | null
```

### Delete

```typescript
await store.delete("key");
```

### List

```typescript
const { blobs } = await store.list();
// blobs: [{ etag: string, key: string }, ...]

// Filter by prefix
const { blobs } = await store.list({ prefix: "uploads/" });
```

`store.list()` **auto-paginates**: a plain `await store.list()` transparently fetches every page and returns the complete `blobs` array — you do NOT hand-roll page cursors or offsets. For a very large store, pass `{ paginate: true }` to get an async iterator and stream results a page at a time instead of buffering every key in memory:

```typescript
for await (const page of store.list({ paginate: true })) {
  for (const { key } of page.blobs) {
    // handle each key
  }
}
```

Pass `{ directories: true }` to group keys by the `/` delimiter (folder-style): the result's `blobs` holds keys at the current level and `directories` holds the common prefixes, which you drill into with `prefix`. Keys are a flat namespace — `/` is only a naming convention that `prefix` and `directories` let you navigate.

## Store Types

- **Site-scoped** (`getStore()`): Persist across all deploys. Use for most cases.
- **Deploy-scoped** (`getDeployStore()`): Tied to a specific deploy lifecycle.

**A site-scoped store is shared across ALL deploy contexts.** Production, deploy previews, and branch deploys all read and write the *same* `getStore()` store — unlike Netlify Database, which forks a separate branch per preview, Blobs does not isolate previews. Code running on a deploy preview reads, overwrites, and deletes the same production data. Don't run destructive tests or seed throwaway data against a `getStore()` store from a preview — it hits production. When you need per-context isolation, use `getDeployStore()`, or partition by deploy context with a context-specific store `name` or key prefix.

## Consistency and concurrency

Blobs are **eventually consistent by default**: an immediate read right after a write may return the previous value or `null`. Opt into **strong** consistency when you need read-your-writes. You can set it once on the store, or request it per read:

```typescript
const store = getStore({ name: "my-store", consistency: "strong" });

// or just for a single read that must see the latest write:
const fresh = await store.get("key", { consistency: "strong" });
```

Strong reads are **slower** than eventual reads, so don't make everything strong "to be safe" — reserve it for the reads that genuinely need the latest write (typically a read right after a write in the same request). For read-heavy access to data that rarely changes, the default eventual consistency is faster and is the right choice.

Blobs has **no concurrency control**: there is no locking and there are no transactions, and concurrent writes to the same key are **last-write-wins** — one silently overwrites the other. Do NOT build counters, balances, or any read-modify-write logic over a single blob key and expect it to be correct under concurrent traffic (two requests can both read the old value and both write back, losing an update). When you need atomic or transactional updates, use Netlify Database (see `netlify-database/SKILL.md`), which provides real transactions — not Blobs.

## Limits

| Limit | Value |
|---|---|
| Max object size | 5 GB |
| Metadata per object | 2 KB |
| Store name max length | 64 bytes |
| Key max length | 600 bytes |

Object metadata is capped at **2 KB per object** — it's for small descriptors (content type, size, timestamps, a status flag), not a place to stash large JSON. Anything bigger belongs in the blob value itself, not in `metadata`.

## Local Development

Local dev uses a sandboxed store (separate from production). For Vite-based projects, install `@netlify/vite-plugin` to enable local Blobs access. Otherwise, use `netlify dev`.

**Common error**: "The environment has not been configured to use Netlify Blobs" — install `@netlify/vite-plugin` or run via `netlify dev`.

## Inspecting blobs from the CLI

The Netlify CLI can read and write blobs directly — useful for debugging, seeding, or a one-off fix without writing and deploying a function:

```bash
netlify blobs:list <store-name>
netlify blobs:get <store-name> <key>
netlify blobs:set <store-name> <key> <value>
netlify blobs:delete <store-name> <key>
```

These act on the linked site's store, so link the project first (`netlify link`). Reach for these documented subcommands for manual inspection or repair rather than the raw API.

## Uploading blobs at build time

You don't have to write blobs from runtime code — you can seed a store during the build by writing files into a special directory. Files placed in `.netlify/blobs/deploy/` during the build are uploaded to a **deploy-scoped** store and are then readable at runtime via `getDeployStore()`. The path under that directory becomes the blob key (so `.netlify/blobs/deploy/products/1.json` is stored under the key `products/1.json`). This avoids a runtime function looping over `store.set` on a cold start.

To attach metadata to a build-time blob, add a JSON sidecar whose name is the blob's filename prefixed with `$` and suffixed with `.json` — metadata for `logo.png` goes in `$logo.png.json`. Read these blobs back with `getDeployStore()`, not `getStore()`: they live in the deploy-scoped store and are replaced when the deploy is replaced.

## When a store operation fails

If a `get`/`set` call throws in a deployed function, don't guess at a fix or route around it — the exact error is in the **function logs**, and it almost always names the cause. Read it first. Common causes: the store isn't reachable from the calling context, a missing or mismatched store `name`, or a read-after-write timing gap (an immediate read of a just-written key — use `consistency: "strong"` when you need read-your-writes).

The store exposes only the documented methods above; there is no lower-level REST endpoint to fall back on. If the logs don't resolve it, report the exact error plus the affected site/deploy to the user and stop. Reaching around a failing store — direct `https://api.netlify.com/...` calls, reading auth tokens off disk, or inventing endpoints — can't work (those aren't supported surfaces) and risks corrupting or losing the very data you're trying to save.
