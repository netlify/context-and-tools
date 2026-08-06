---
name: netlify-image-cdn
description: Guide for using Netlify Image CDN for image optimization and transformation. Use when serving optimized images, creating responsive image markup, setting up user-uploaded image pipelines, or configuring image transformations. Covers the /.netlify/images endpoint, query parameters, remote image allowlisting, clean URL rewrites, and composing uploads with Functions + Blobs.
---

# Netlify Image CDN

Every Netlify site has a built-in `/.netlify/images` endpoint for on-the-fly image transformation. No configuration required for local images.

## Basic Usage

```html
<img src="/.netlify/images?url=/photo.jpg&w=800&h=600&fit=cover&q=80" />
```

## Query Parameters

| Param | Description | Values |
|---|---|---|
| `url` | Source image path (required) | Relative path or absolute URL |
| `w` | Width in pixels | Any positive integer |
| `h` | Height in pixels | Any positive integer |
| `fit` | Resize behavior | `contain` (default), `cover`, `fill` |
| `position` | Crop alignment (with `cover`) | `center` (default), `top`, `bottom`, `left`, `right` |
| `fm` | Output format | `avif`, `webp`, `jpg`, `png`, `gif`, `blurhash` |
| `q` | Quality (lossy formats) | 1-100 (default: 75) |

When `fm` is omitted, Netlify auto-negotiates the best format based on browser support (preferring `webp`, then `avif`).

### `fm=blurhash` returns a string, not an image

`fm=blurhash` is special: the response body is a short BlurHash **text string**, not image bytes. Pointing an `<img src>` (or CSS `background-image`) straight at a `/.netlify/images?...&fm=blurhash` URL does not work — the browser receives text and has nothing to render. Use it as a placeholder workflow instead: obtain the blurhash string ahead of time (server-side, in a data loader, via a `fetch`, or at build time), decode it with a BlurHash decoder library into a rendered placeholder (a canvas or a data-URI), and show that while the real image loads. The real, displayable image is a **separate** `/.netlify/images` request **without** `fm=blurhash`.

## Remote Image Allowlisting

External images must be explicitly allowed in `netlify.toml`:

```toml
[images]
remote_images = ["https://example\\.com/.*", "https://cdn\\.images\\.com/.*"]
```

Values are regex patterns.

A remote source URL that does **not** match any `remote_images` pattern is rejected with a **404** — Netlify does not fetch or proxy it. This is a strict allowlist, not a fallback: there is no automatic proxying of arbitrary external hosts. Add the host (as an escaped regex) to `remote_images` *before* referencing it through `/.netlify/images`, or every transform request for that source will 404. (Local images on the same site never need allowlisting.)

When referencing an allow-listed remote image, **percent-encode the source URL** before placing it in the `url` parameter:

```html
<!-- source: https://cdn.example.com/marketing/banner.jpg -->
<img src="/.netlify/images?url=https%3A%2F%2Fcdn.example.com%2Fmarketing%2Fbanner.jpg&w=800&fm=webp&q=80" />
```

Percent-encode the source value (e.g. with `encodeURIComponent`) whenever it contains characters that would otherwise be read as Image CDN params — `?`, `&`, `=`, `#`, or whitespace. This applies to remote URLs and relative paths alike (a filename or user-generated key can contain them too, e.g. `url=/uploads/a%26b.jpg`). Basic paths without those characters don't need encoding.

## Clean URL Rewrites

Create user-friendly image URLs with redirects:

```toml
# Basic optimization
[[redirects]]
from = "/img/*"
to = "/.netlify/images?url=/:splat"
status = 200

# Preset: thumbnail
[[redirects]]
from = "/img/thumb/:key"
to = "/.netlify/images?url=/uploads/:key&w=150&h=150&fit=cover"
status = 200

# Preset: hero
[[redirects]]
from = "/img/hero/:key"
to = "/.netlify/images?url=/uploads/:key&w=1200&h=675&fit=cover"
status = 200
```

## Local Development

`/.netlify/images` is a Netlify platform endpoint — it does **not** exist in a framework's own dev server. Running `vite`, `next dev`, `astro dev`, etc. directly will **404** on `/.netlify/images`, and `[images]` allowlisting and your image redirects won't apply either. Run `netlify dev` for local work: it emulates the Image CDN endpoint, remote-image allowlisting, and redirect rules, so image URLs resolve locally the same way they do in production. A 404 on `/.netlify/images` locally almost always means a framework dev server is being run directly instead of `netlify dev` — the URL itself is fine.

## Caching

- Transformed images are cached at the CDN edge automatically
- Cache invalidates on new deploys
- Set cache headers on source images to control caching:

```toml
[[headers]]
for = "/uploads/*"
[headers.values]
Cache-Control = "public, max-age=31536000, immutable"
```

## User-Uploaded Images

Combine **Netlify Functions** (upload handler) + **Netlify Blobs** (storage) + **Image CDN** (serving/transforming) to build a complete user-uploaded image pipeline. See [references/user-uploads.md](references/user-uploads.md) for the full pattern.
