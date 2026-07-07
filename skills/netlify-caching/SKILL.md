---
name: netlify-caching
description: Guide for controlling caching on Netlify's CDN. Use when configuring cache headers, setting up stale-while-revalidate, implementing on-demand cache purge, or understanding Netlify's CDN caching behavior. Covers Cache-Control, Netlify-CDN-Cache-Control, cache tags, durable cache, and framework-specific caching patterns.
---

# Caching on Netlify

## Default Behavior

**Static assets** are cached automatically:
- CDN: cached for 1 year, invalidated on every deploy
- Browser: always revalidates (`max-age=0, must-revalidate`)
- No configuration needed

**Dynamic responses** (functions, edge functions, proxied) are **not cached by default**. Add cache headers explicitly.

**Only `GET` requests are cached.** Netlify's CDN caches responses to `GET` requests only. Responses to `POST`, `PUT`, `PATCH`, `DELETE`, and other non-`GET` methods are never cached, no matter what cache headers you set on them. If a response needs to be CDN-cacheable, expose it on a `GET` route (put the inputs in the URL/query string) — you cannot make the CDN cache a mutating `POST` endpoint by adding cache headers.

## Cache-Control Headers

Three headers control caching, from most to least specific:

| Header | Who sees it | Use case |
|---|---|---|
| `Netlify-CDN-Cache-Control` | Netlify CDN only (stripped before browser) | CDN-only caching |
| `CDN-Cache-Control` | All CDN caches (stripped before browser) | Multi-CDN setups |
| `Cache-Control` | Browser and all caches | General caching |

### Common Patterns

```typescript
// Cache at CDN for 1 hour, browser always revalidates
return new Response(body, {
  headers: {
    "Netlify-CDN-Cache-Control": "public, s-maxage=3600, must-revalidate",
    "Cache-Control": "public, max-age=0, must-revalidate",
  },
});

// Stale-while-revalidate (serve stale for 2 min while refreshing)
return new Response(body, {
  headers: {
    "Netlify-CDN-Cache-Control": "public, max-age=60, stale-while-revalidate=120",
  },
});

// Durable cache (shared across edge nodes, serverless functions only)
return new Response(body, {
  headers: {
    "Netlify-CDN-Cache-Control": "public, durable, max-age=60, stale-while-revalidate=120",
  },
});
```

### Immutable Assets

For fingerprinted files (hash in filename):

```toml
# netlify.toml
[[headers]]
for = "/assets/*"
[headers.values]
Cache-Control = "public, max-age=31536000, immutable"
```

## Cache Tags and On-Demand Purge

Tag responses for selective cache invalidation:

```typescript
return new Response(body, {
  headers: {
    "Netlify-Cache-Tag": "product,listing",
    "Netlify-CDN-Cache-Control": "public, s-maxage=86400",
  },
});
```

Purge by tag:

```typescript
import { purgeCache } from "@netlify/functions";

export default async () => {
  await purgeCache({ tags: ["product"] });
  return new Response("Purged", { status: 202 });
};
```

Purge entire site:

```typescript
await purgeCache();
```

`purgeCache()` picks up the site ID and credentials automatically **only when it runs inside a deployed Netlify Function**. Called from anywhere else — a local script, a CI job, a build step, or any code outside the Netlify Functions runtime — it has no ambient credentials, and you must pass a Netlify personal access token (and the site ID). Read the token from an environment variable; never hardcode it:

```typescript
await purgeCache({
  token: process.env.NETLIFY_PURGE_TOKEN, // a Netlify personal access token, from env
  siteID: process.env.NETLIFY_SITE_ID,
  tags: ["product"],
});
```

`Netlify-Cache-Tag` is **purge-only**: tagged responses are still cleared by automatic deploy-based invalidation like everything else. The tag only lets you purge them on demand between deploys.

### Surviving deploys with `Netlify-Cache-ID`

To keep a cached response *across* deploys, set a `Netlify-Cache-ID` header. A response carrying it is **excluded from automatic deploy-based invalidation** — it persists across deploys and clears only on explicit purge. The `Netlify-Cache-ID` value also auto-registers as a purge tag, so you purge it by that same id:

```typescript
return new Response(body, {
  headers: {
    "Netlify-Cache-ID": "catalog",
    "Netlify-CDN-Cache-Control": "public, s-maxage=86400",
  },
});
```

```typescript
import { purgeCache } from "@netlify/functions";

// Purge by the same id — it doubles as a purge tag.
await purgeCache({ tags: ["catalog"] });
```

## Cache Key Variation

`Netlify-Vary` controls what creates separate cache entries. Each directive names a dimension — `query`, `header`, `cookie`, `country`, or `language` — followed by an enumerated, pipe-separated list of the values to key on:

```typescript
return new Response(body, {
  headers: {
    "Netlify-Vary": "cookie=ab_test|is_logged_in",
  },
});
```

- `query=param1|param2` — key on the named query parameters
- `header=X-Custom` — key on the named request header
- `cookie=ab_test|is_logged_in` — key on the named cookies
- `country=us|de` — serve a distinct cached entry to visitors from the listed countries (two-letter, lowercase ISO country codes)
- `language=en|fr` — key on the listed `Accept-Language` values

Combine dimensions by separating directives with commas — e.g. `Netlify-Vary: query=theme, cookie=plan` keys the cache on both the `theme` query parameter and the `plan` cookie. Always enumerate the specific values; keying on an entire dimension (for example a bare `Vary: Cookie`) fragments the cache into a separate entry per unique visitor.

## Framework-Specific Caching

### Next.js
ISR uses Netlify's durable cache automatically (runtime 5.5.0+). `revalidatePath` and `revalidateTag` trigger cache purge.

### Astro / Remix
Full control over cache headers in server routes. Set `Netlify-CDN-Cache-Control` in responses for CDN caching.

### Nuxt
Default Nitro preset handles caching. ISR-style patterns use `routeRules` with `swr` or `isr` options.

### Vite SPA
Static assets are cached by default. API responses from Netlify Functions need explicit cache headers.

**The full query string is part of the cache key by default.** With no `Netlify-Vary: query=` directive, every distinct query string is cached as a separate entry — so appending tracking or marketing params (`?utm_source=…`, `fbclid`, and the like) silently fragments the cache into many near-duplicate entries and lowers the hit rate, even when those params don't change the response. Add `Netlify-Vary: query=<names>` listing only the parameters that actually affect the output; the CDN then keys on just those and ignores all other query params, collapsing the variants onto one cache entry.

## Local Development

`netlify dev` does not emulate the CDN cache. Header-based CDN caching is only observable on a deployed site: locally, cache headers pass through untouched, nothing is stored in or served from the CDN cache, Cache-API reads return no persisted entries, and the `Cache-Status` response header is absent. A "cache miss every time" on `localhost` is expected, not a bug — you cannot validate `Netlify-Vary` keying, cache tags, durable cache, or purge behavior locally. Verify caching on a deployed URL instead (a Deploy Preview or production) and read its `Cache-Status` header.

## Debugging

Check the `Cache-Status` response header. Netlify emits it in the RFC 9211 format — one entry per named cache layer the request passed through, not a bare `HIT`/`MISS`:

```
Cache-Status: "Netlify Edge"; fwd=miss, "Netlify Durable"; hit; ttl=3600
```

- A named layer (`"Netlify Edge"`, `"Netlify Durable"`) with `hit` — served from that cache
- `fwd=miss` — the entry was not in that layer, so the request was forwarded onward
- `ttl=…` — remaining freshness (seconds) for a hit

## Constraints

- Basic auth disables caching for the entire site
- Durable cache is serverless functions only (not edge functions)
- Same URL must return identical `Netlify-Vary` headers across responses
- Deploy invalidation is scoped to deploy context (production vs preview)
