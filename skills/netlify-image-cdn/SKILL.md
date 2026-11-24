---
name: netlify-image-cdn
description: Transform, resize, crop, and convert images on demand through Netlify Image CDN at the /.netlify/images endpoint. Use this skill whenever someone asks to optimize images, generate thumbnails or responsive sizes, serve WebP or AVIF automatically, crop to a square or cover box, add blurred placeholders, allow remote image domains, or create a reusable image preset URL. It also applies to setting cache or CORS headers on transformed images, fixing next/image headers on Netlify, and configuring Angular, Astro, Gatsby, Next.js, or Nuxt image optimization on Netlify.
---

# Netlify Image CDN

## Use this / avoid this

```js
// USE: build the URL on the site's own domain; url is required, the rest optional
const src = `/.netlify/images?url=${encodeURIComponent(remoteOrPath)}&w=400&h=300&fit=cover&fm=webp&q=75`;
```

```toml
# USE: single-quoted literal regex in netlify.toml
[images]
  remote_images = ['https://my-images\.com/.*']
```

Avoid:
- `_headers` / `[[headers]]` rules targeting a path that rewrites to `/.netlify/images` (including `/_next/image`). They are **silently ignored**. Use an edge function instead.
- `headers()` in `next.config.js` for `next/image`. It is ignored for the same reason.
- `fit=cover` with only `w` or only `h`. Cover requires both.
- Hand-rolling `/.netlify/images` URLs in Angular, Astro, Gatsby, Next.js, or Nuxt. Use the framework's image component, which already uses Image CDN (see Frameworks).

## Endpoint

```
/.netlify/images?url=<source>[&w=<int>][&h=<int>][&fit=contain|cover|fill][&position=top|bottom|left|right|center][&fm=avif|jpg|png|webp|gif|blurhash][&q=1-100]
```

| Param | Values | Default | Notes |
|---|---|---|---|
| `url` | relative (`/owl.jpeg`) or absolute remote URL | required | Remote URLs must match `remote_images` |
| `w`, `h` | integer px | — | Applied according to `fit` |
| `fit` | `contain` / `cover` / `fill` | `contain` | Same semantics as CSS `object-fit` |
| `position` | `top` / `bottom` / `left` / `right` / `center` | `center` | The part of the image retained when `fit=cover` |
| `fm` | `avif` `jpg` `png` `webp` `gif` `blurhash` | negotiated | `webp` and `gif` may be animated |
| `q` | integer 1–100 | `75` | Lossy quality for `avif`, `jpg`, `gif`, `webp` |

**Format negotiation when `fm` is omitted** (from the `Accept` header): `webp` if accepted, else `avif`, else the original format. A `url`-only request keeps the image's dimensions but still converts the format.

**Response codes:**
- `200`: new transformation, with the correct `content-type` (for example `image/png` for `fm=png`).
- `304`: previously transformed image.
- `404`: **any invalid parameter value**. Check the parameters before suspecting the source.

### `fit` behavior (400×310 source)

| fit | Aspect ratio kept | Crops | Exact dims returned | Example |
|---|---|---|---|---|
| `contain` | yes | no | no | `w=600&h=600` → 600×465. Upscaling is allowed. One dimension alone derives the other. |
| `cover` | yes (scales, then crops) | yes | yes | `w=150&h=150` → resized to height 150, then left/right cropped |
| `fill` | no (stretches) | no | yes | `w=300&h=100` → squished vertically |

## Examples

```bash
S=https://mysitename.netlify.app
curl -vs "$S/.netlify/images?url=/owl.jpeg"                                   # format negotiation only
curl -vs "$S/.netlify/images?url=/owl.jpeg&w=50"                              # resize width
curl -vs "$S/.netlify/images?url=/owl.jpeg&fit=cover&w=50&h=50"               # square crop
curl -vs "$S/.netlify/images?url=/owl.jpeg&fit=cover&w=50&h=50&position=left" # keep left side
curl -vs "$S/.netlify/images?url=/owl.jpeg&fm=png"                            # -> content-type: image/png
curl -vs "$S/.netlify/images?url=/owl.jpeg&fm=avif&q=50"                      # avif, medium quality
curl -vs "$S/.netlify/images?url=https%3A%2F%2Fmy-images.com%2Fowl.jpeg"      # remote (allowlisted)
```

Interactive parameter playground: https://image-cdn-playground.netlify.app/

## Remote sources

```toml
[images]
  remote_images = [
    'https://my-images\.com/.*',
    'https://animals\.more-images\.com/[bcr]at/.*',
  ]
```

- `remote_images` is an array of regexes. Anchor patterns to specific subdomains or directories.
- Relative sources need no config.
- Remote sources must be **publicly reachable**.
- > **Footgun:** `Authorization`, `Cookie`, and other credential-bearing headers are **not forwarded** to remote origins. Private buckets fail. Use self-authorizing URLs, such as S3 presigned URLs, and make sure the patterns match them.
- **Netlify cache duration for remote sources** comes from the remote origin's headers. The first one present wins: `Netlify-CDN-Cache-Control` → `CDN-Cache-Control` → `Cache-Control`. You cannot set site headers on remote sources.

## Reusable presets (rewrites)

`_redirects`:
```
/transform-small/* /.netlify/images?url=/:splat&w=50&h=50 200
```

`netlify.toml`:
```toml
[[redirects]]
  from = "/transform-small/*"
  to = "/.netlify/images?url=/:splat&w=50&h=50"
  status = 200
```

Request `/transform-small/owl.jpeg`. Avoid cross-site redirects for transformations, because they hurt performance. Redirect docs: https://docs.netlify.com/manage/routing/redirects/overview

## Headers and caching

| Goal | How |
|---|---|
| Browser/downstream caching, site-domain source | Header rule on the **source** path. It carries over to the transformed image. |
| Netlify cache duration, remote source | Cache headers on the remote origin (precedence above) |
| CORS or other headers on a rewritten path | Edge function on that path |
| Headers on `next/image` | Edge function on `/_next/image`, or add `/_next/image` to the middleware `matcher` |

Site-domain sources carry over **only** `Cache-Control`, `X-Nf-Cache-Control`, and `Content-Security-Policy`. Headers such as `Access-Control-Allow-Origin` and `CDN-Cache-Control` are dropped. Site-domain `Cache-Control` affects browsers and CDNs in front of Netlify, **not** the Netlify cache. Atomic deploys handle invalidation: a changed source re-transforms on the next request.

```toml
[[headers]]
  for = "/source-images/*"
  [headers.values]
    Cache-Control = "public, max-age=604800, must-revalidate"
# applies to /.netlify/images?url=/source-images/owl.jpeg
```

```ts
// netlify/edge-functions/image-headers.ts
import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const response = await context.next();
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
};

export const config: Config = { path: "/_next/image" };
```

> **Footgun (cost):** edge functions and middleware run on **every** image request, including cache hits. They do **not** change the Netlify cache duration.

Docs: https://docs.netlify.com/manage/routing/headers and https://docs.netlify.com/build/edge-functions/overview

## Frameworks

Use the framework's own image syntax. Allowlist remote domains where the framework expects them:

| Framework | Prerequisite | Remote allowlist |
|---|---|---|
| Angular | none (`NgOptimizedImage`) | `[images] remote_images` |
| Astro | none (`<Image />`) | `image.domains` / `image.remotePatterns` in `astro.config.mjs` |
| Gatsby | env `NETLIFY_IMAGE_CDN=true` plus the Contentful, Drupal, or WordPress source plugin | `[images] remote_images` |
| Next.js | Next.js 13.5+ with Next.js adapter v5 | `remotePatterns` in `next.config.js` |
| Nuxt | none (`nuxt/image`) | `image.domains` in `nuxt.config.ts` |

Setup guides:
- https://docs.netlify.com/build/frameworks/framework-setup-guides/angular#netlify-image-cdn
- https://docs.netlify.com/build/frameworks/framework-setup-guides/astro#netlify-image-cdn
- https://docs.netlify.com/build/frameworks/framework-setup-guides/gatsby/#netlify-image-cdn
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nuxt#netlify-image-cdn

## Local dev

Run Netlify Dev to get the endpoint locally: https://docs.netlify.com/api-and-cli-guides/cli-guides/local-development

## Limitations

- **Split Testing is not supported.** Image results may be inconsistent across branches: https://docs.netlify.com/manage/monitoring/split-testing/
- **Not available on HIPAA-compliant hosting.**

<!-- Gaps: no documented size/dimension/request limits, pricing, plan gating, or input-format list. Undocumented: behavior of fit=cover with one dimension, position without cover, q on png/blurhash. Gatsby 5.12 status unclear. -->

<!-- system: agent-context/image-cdn/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify house rules (image-cdn)

These are org conventions, not docs facts — merged into the rendered skill by
ctx-gen and never generated. Owned by the skills maintainer.

1. For user-uploaded image pipelines (Functions + Blobs + Image CDN
   composed), see `references/user-uploads.md` in this skill — an authored
   guide with no single docs source.
2. Percent-encode remote source URLs before placing them in the `url`
   parameter (`encodeURIComponent`) — URLs containing `?` or `&` break
   otherwise.
3. `fm=blurhash` returns a BlurHash TEXT string, not image bytes. Pointing an
   `<img src>` (or CSS background) at it renders nothing — fetch the string
   ahead of time, decode it client-side with a BlurHash library, and load the
   real image as a separate request without `fm=blurhash`.
4. A local 404 on `/.netlify/images` almost always means a framework dev
   server (`vite`, `next dev`, `astro dev`) is running instead of
   `netlify dev` — the endpoint, `[images]` allowlisting, and image redirects
   only exist under `netlify dev`. The URL itself is usually fine.
5. In `remote_images` patterns, the meaningful regex escape is the dot;
   forward slashes are not metacharacters — do not write `https:\/\/`.
   In `netlify.toml`, use a single-quoted literal string
   (`'https://example\.com/.*'`) or double the backslash in a
   double-quoted string (`"https://example\\.com/.*"`) — a bare `\.`
   inside double quotes is invalid TOML.
