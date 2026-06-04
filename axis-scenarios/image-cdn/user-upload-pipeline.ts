import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Image CDN: user upload pipeline with Blobs",
  prompt:
    "Build an avatar upload pipeline. POST /api/avatar accepts a multipart image, stores it in Netlify Blobs, and returns a JSON `{ url }` field. The returned URL must serve a 256×256 cover-cropped version of the avatar through Netlify's Image CDN with a clean URL shape like `/avatars/<key>`. Implement the upload function, the raw-serve function for `/avatars-raw/<key>`, and the netlify.toml rewrites that wire `/avatars/<key>` to the Image CDN.",
  judge: [
    { check: "Upload function stores the avatar in a Netlify Blobs store via `getStore(...)` + `store.set(key, ...)` from '@netlify/blobs' — NOT in Netlify Database, and NOT only in memory" },
    { check: "Raw-serve function (`/avatars-raw/:key`) retrieves the blob with a binary `type` (`'stream'`, `'blob'`, or `'arrayBuffer'`) — NOT the default string type" },
    { check: "Raw-serve function sets the original Content-Type on the Response (read from blob metadata or stored at upload time)" },
    { check: "netlify.toml has a status-200 rewrite that wires the clean avatar path (`/avatars/<key>`) to `/.netlify/images?url=<raw-serve path>&w=256&h=256&fit=cover`, where the raw path resolves to the `/avatars-raw/<key>` route. Either a splat (`/avatars/* -> :splat`) or a named placeholder (`/avatars/:key -> :key`) is acceptable — both correctly route to the Image CDN" },
    { check: "Upload function returns the CLEAN URL (`/avatars/<key>`) — NOT the raw blob path and NOT a direct `/.netlify/images?...` URL" },
    { check: "Server-side validates content type and rejects non-image uploads (e.g. checks for an `image/*` MIME type) — uploads aren't trusted blindly" },
    { check: "Does NOT add `[images] remote_images` for the raw-serve URL — it's a same-site path, so it doesn't need to be allow-listed as remote" },
    { check: "Functions use the modern Netlify handler signature with `config.path` declaring each route" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
