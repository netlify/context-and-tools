---
name: netlify-image-cdn
description: Transform, resize, crop, and reformat images on demand via Netlify's Image CDN HTTP endpoint (/.netlify/images). Use when serving optimized images, converting formats (webp/avif/jpg/png), generating responsive/thumbnail sizes, adding a blurhash placeholder, allowlisting remote image domains, or wiring framework image components (Next.js, Astro, Nuxt, Angular, Gatsby) to Netlify. Triggers on tasks like "optimize images", "resize an image", "convert to webp", "crop to a square thumbnail", or "serve images from an external bucket".
---

# Netlify Image CDN

Transform images by requesting the edge endpoint — no function code, no source file to author.

```
GET /.netlify/images?url=<source>&<transform params>
```

`url` is REQUIRED. All other params optional. This is the only documented form; there is no legacy/deprecated syntax.

## Runnable examples

```bash
# Format conversion (JPEG -> PNG); response has content-type: image/png
curl -vs 'https://mysite.netlify.app/.netlify/images?url=/owl.jpeg&fm=png'

# Resize width only (height derived to keep aspect ratio)
curl -vs 'https://mysite.netlify.app/.netlify/images?url=/owl.jpeg&w=50'

# Square thumbnail — resize + crop (fit=cover REQUIRES both w and h)
curl -vs 'https://mysite.netlify.app/.netlify/images?url=/owl.jpeg&fit=cover&w=50&h=50'

# Cover with crop anchor (keep left side)
curl -vs 'https://mysite.netlify.app/.netlify/images?url=/owl.jpeg&fit=cover&w=50&h=50&position=left'

# Convert to AVIF at medium quality
curl -vs 'https://mysite.netlify.app/.netlify/images?url=/owl.jpeg&fm=avif&q=50'

# Source-only: no url params -> auto content-negotiated webp/avif, size unchanged
curl -vs 'https://mysite.netlify.app/.netlify/images?url=/owl.jpeg'
```

## Query parameters

| Param | Values | Notes |
|-------|--------|-------|
| `url` | relative (`/owl.jpeg`) or remote (`https://...`) | **Required.** Remote domains must be allowlisted (see below). |
| `w` | integer px | Target width. Behavior depends on `fit`. |
| `h` | integer px | Target height. Behavior depends on `fit`. |
| `fit` | `contain` (default), `cover`, `fill` | Resize behavior. |
| `position` | `center` (default), `top`, `bottom`, `left`, `right` | Crop anchor. **Only applies when `fit=cover`.** |
| `fm` | `avif`, `jpg`, `png`, `webp`, `gif`, `blurhash` | Output format. `webp`/`gif` may be animated. `blurhash` returns a placeholder string (see https://blurha.sh). |
| `q` | integer `1`–`100`, default `75` | Quality. **Only applies to `avif`, `jpg`, `gif`, `webp`.** |

### `fit` behavior

| `fit=` | aspect ratio kept | crops excess | returns exact requested dims |
|--------|-------------------|--------------|------------------------------|
| `contain` | yes | no | no — one dimension may be smaller |
| `cover` | no (scaled then cropped) | yes | yes |
| `fill` | no (stretches/squishes) | no | yes |

- `contain` (default): supply one dimension and the other is derived.
- `cover`: **must supply both `w` and `h`**; use `position` to control crop.
- `fill`: distorts to fit exactly.

### Format content negotiation

If `fm` is omitted, Netlify inspects the `Accept` header: use `webp` if accepted, else `avif` if accepted, else the original format.

## Remote source images

Remote `url` domains MUST be allowlisted first or the request fails:

```toml
# netlify.toml
[images]
  remote_images = ["https://my-images.com/.*", "https://animals.more-images.com/[bcr]at/.*"]
```

- Array of regex strings; restrict to specific subdomains/directories.
- **Double-escape regex.** `https://` becomes regex `https:\/\/` and must be written in `netlify.toml` as `https:\\/\\/`.
- **Footgun:** Credential-bearing headers (`Authorization`, `Cookie`) are NOT forwarded to remote sources. Remote images must be publicly accessible, or use self-authorizing URLs (e.g. S3 presigned URLs) and ensure `remote_images` patterns match them.

## Redirects / reusable transforms

Alias transforms so multiple images share params:

```
# _redirects — /transform-small/owl.jpeg transforms /owl.jpeg to 50x50
/transform-small/* /.netlify/images?url=/:splat&w=50&h=50 200
```

```toml
# netlify.toml
[[redirects]]
  from = "/transform-small/*"
  to = "/.netlify/images?url=/:splat&w=50&h=50"
  status = 200
```

**Caution:** Cross-site redirects for image transformations are not recommended (performance impact).

## Custom cache headers

Header rules on source images propagate to the transformed asset:

```
# _headers
/source-images/*
  Cache-Control: public, max-age=604800, must-revalidate
```

```toml
# netlify.toml
[[headers]]
  for = "/source-images/*"
  [headers.values]
    Cache-Control = "public, max-age=604800, must-revalidate"
```

- Custom headers apply ONLY to source images on the site's own domain — NOT to remote sources (Netlify does respect cache headers the remote domain sends).
- `Cache-Control` on source images applies only to browsers/CDNs in front of Netlify — NOT the Netlify Cache itself.

## Response codes

- Invalid transformation parameter value → `404` (fails silently as a not-found; validate params).
- Valid new transformation → `200` with content + `content-type`.
- Previously transformed image → `304`.

## Framework integrations

Use the framework's native image component to route through Netlify Image CDN automatically; each framework configures its own remote allowlist.

| Framework | Prerequisites | Remote allowlist |
|-----------|---------------|------------------|
| Angular | None — `NgOptimizedImage` auto-uses it. | `[images] remote_images` in `netlify.toml` |
| Astro | None — `<Image />` auto-uses it. | `image.domains` / `image.remotePatterns` in `astro.config.mjs` |
| Gatsby | `NETLIFY_IMAGE_CDN=true` env var + Contentful/Drupal/WordPress source plugin. | `[images] remote_images` in `netlify.toml` |
| Next.js | Next.js 13.5+ and Netlify adapter v5. | `remotePatterns` in `next.config.js` |
| Nuxt | None — `nuxt/image` module auto-uses it. | `image.domains` in `nuxt.config.ts` |

For any other framework, call `/.netlify/images` directly.

## Notes

- Transformed results are cached per-transformation on the edge; atomic deploys re-run transforms when a source image changes so stale assets aren't served.
- Test locally with Netlify Dev (Netlify CLI).
- **Split Testing is not supported** — image results may be inconsistent across split-test branches.
- **Not supported under HIPAA-compliant hosting.**
