---
name: netlify-image-cdn
description: Transform, resize, crop, reformat, and optimize images on demand via Netlify Image CDN's /.netlify/images endpoint. Use when adding responsive images, generating thumbnails, converting formats (avif/webp/png), cropping to aspect ratios, tuning image quality, creating blurred placeholders, allowlisting remote image domains, serving user-uploaded images, or wiring framework image components (Next.js, Astro, Nuxt, Angular, Gatsby) to Netlify. Triggers on tasks like "optimize images", "add image thumbnails", "resize images on the fly", "serve images from an external domain", or "add blur placeholders".
---

# Netlify Image CDN

Transform images by requesting `/.netlify/images` with query parameters. No function or file authoring required — it's a built-in edge endpoint.

```bash
# resize + crop to a 50px square, retain left side, convert to webp at q=80
curl -vs 'https://mysitename.netlify.app/.netlify/images?url=/owl.jpeg&fit=cover&w=50&h=50&position=left&fm=webp&q=80'
```

There is no legacy/deprecated form — the endpoint above is the only programmatic surface. Use framework image components where available (below) rather than hand-building URLs.

## Endpoint & query parameters

`GET /.netlify/images?url=<source>&...`

| Param | Values | Notes |
|---|---|---|
| `url` | relative path or full remote URL | **REQUIRED**. Only required param. |
| `w` | integer px | width |
| `h` | integer px | height |
| `fit` | `contain` (default), `cover`, `fill` | resize behavior |
| `position` | `center` (default), `top`, `bottom`, `left`, `right` | only applies when `fit=cover` |
| `fm` | `avif`, `jpg`, `png`, `webp`, `gif`, `blurhash` | output format; `webp`/`gif` can be animated |
| `q` | integer `1`–`100` (default `75`) | only for `avif`, `jpg`, `gif`, `webp` |

### `fit` behavior

| `fit=` | aspect ratio kept | crops excess | returns exact dimensions |
|---|---|---|---|
| `contain` | yes | no | no — one dimension may be smaller |
| `cover` | no | yes | yes — scaled proportionally, then cropped |
| `fill` | no | no | yes — stretched/squished if needed |

- **`fit=cover` requires BOTH `w` and `h`.** Supplying only one silently misbehaves.
- `contain` with one dimension calculates the other to preserve aspect ratio.

### Format & content negotiation

- Source-only request (just `url`, no size/format): image is unchanged in size/shape but **still reformatted** to `avif`/`webp` based on the browser's `Accept` header.
- No `fm` specified → `webp` if accepted, else `avif` if accepted, else original.
- `fm=blurhash` returns a BlurHash **text string, not image bytes.** Pointing `<img src>` or a CSS background at it renders nothing. Fetch the string server-side/ahead of time, decode it client-side with a BlurHash library (https://blurha.sh), then load the real image as a separate request without `fm=blurhash`.

### Response codes

- Invalid transformation param values → `404`.
- Valid, new transformation → `200` with content + `content-type`.
- Previously transformed → `304`.

## Remote source images

Remote `url` values require allowlisting the domain in `netlify.toml`:

```toml
[images]
  remote_images = ["https://my-images.com/.*", "https://animals.more-images.com/[bcr]at/.*"]
```

Then percent-encode the remote URL and request it:

```js
const src = `/.netlify/images?url=${encodeURIComponent("https://my-images.com/owl.jpeg")}`;
```

- **Always `encodeURIComponent` the remote URL** before placing it in `url` — URLs containing `?` or `&` break otherwise.
- In `remote_images` patterns, **escape only the dot**: `"https://example\.com/.*"`. Forward slashes are NOT regex metacharacters — do not write `https:\/\/`.
- Remote sources must be **publicly accessible**. Netlify does NOT forward `Authorization` or `Cookie` headers to remote sources. For auth-required images use self-authorizing URLs (e.g. S3 presigned URLs) and make sure your `remote_images` pattern matches them.

## Reusable transformations (redirects)

Reuse the same params across many images via a redirect:

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

Then `GET /transform-small/owl.jpeg` yields a 50×50 transform. **Avoid cross-site redirects for transformations** — they hurt performance.

## Custom headers (caching)

`_headers`:
```
/source-images/*
  Cache-Control: public, max-age=604800, must-revalidate
```

- Headers set on a source image are applied to the transformed asset served by Image CDN.
- Custom headers **cannot** be applied to remote (other-domain) source images; Netlify respects whatever cache headers the external domain sends.
- `Cache-Control` on source images applies only to browsers/CDNs in front of Netlify, **not** the Netlify Cache itself.

## Framework integrations

Use the framework's native image component/handling; it wires to Image CDN automatically. Configure the remote allowlist per framework:

| Framework | Prerequisite | Remote allowlist |
|---|---|---|
| Angular | none — `NgOptimizedImage` auto-uses it | `[images] remote_images` in `netlify.toml` |
| Astro | none — `<Image />` auto-uses it | `image.domains` / `image.remotePatterns` in `astro.config.mjs` |
| Nuxt | none — `nuxt/image` auto-uses it | `image.domains` in `nuxt.config.ts` |
| Next.js | Next 13.5+ and adapter v5 | `remotePatterns` in `next.config.js` |
| Gatsby | env `NETLIFY_IMAGE_CDN=true` + Contentful/Drupal/WordPress source plugin | `[images] remote_images` in `netlify.toml` |

## Local development

Run `netlify dev` (Netlify CLI) to test transformations locally — it mimics production including Image CDN.

- **A local `404` on `/.netlify/images` almost always means a framework dev server (`vite`, `next dev`, `astro dev`) is running instead of `netlify dev`.** The endpoint, `[images]` allowlisting, and image redirects only exist under `netlify dev`. The URL itself is usually fine.

## Caching & deploys

Transformed results are uniquely cached on Netlify's edge. Atomic deploys are respected: changing a source image in a new deploy re-runs transformations on new requests so stale assets aren't served.

## User-uploaded image pipelines

For user-uploaded image pipelines (Functions + Blobs + Image CDN composed), see `references/user-uploads.md` in this skill.

## Limitations

- **Split Testing is not supported** — you may get inconsistent image results between split test branches.
- Not currently supported in Netlify's HIPAA-compliant hosting offering. See the Trust Center for the HIPAA-compliant reference architecture.

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
5. In `remote_images` patterns, the meaningful escape is the dot:
   `"https://example\.com/.*"`. Forward slashes are not regex
   metacharacters — do not write `https:\/\/`.
