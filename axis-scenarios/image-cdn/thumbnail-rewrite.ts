import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

export default {
  name: "Image CDN: clean thumbnail URLs for blog posts",
  prompt:
    "This Next.js blog will start including hero images for each post, stored under `public/uploads/`. I want template code to render a 320×180 (cover) thumbnail and a 1280×720 hero variant from a single source image, served through Netlify's Image CDN. Use a clean URL pattern `/img/thumb/<filename>` and `/img/hero/<filename>` via netlify.toml so the markup isn't littered with query strings.",
  judge: [
    { check: "Adds status-200 redirects in netlify.toml that rewrite the clean thumb and hero paths to `/.netlify/images?url=/uploads/<file>&...` with the appropriate w/h/fit query params. Either a splat (`/img/thumb/* -> :splat`) or a named placeholder (`/img/thumb/:key -> :key`) is acceptable — both correctly route to the Image CDN" },
    { check: "Thumbnail rule includes `w=320&h=180&fit=cover` (or `crop`) — both width and height plus a fit that crops/covers, not just one dimension" },
    { check: "Hero rule includes `w=1280&h=720` (with or without `fit=cover`)" },
    { check: "Does NOT hardcode `fm=avif` or `fm=webp` unless a specific format is required — leaving `fm` unset lets Netlify auto-negotiate the best format per browser" },
    { check: "Image elements in the JSX reference the CLEAN paths (`/img/thumb/<file>`, `/img/hero/<file>`), not the raw `/.netlify/images?...` URL directly" },
    { check: "Does NOT add an entry under `[images] remote_images` — the source images live in the same site (`public/uploads/`), so they don't need to be allow-listed as remote" },
    { check: "Does NOT introduce a custom Netlify Function to do the resizing — Netlify Image CDN handles it natively" },
  ],
  setup: copyFixture("nextjs-blog"),
  variants: withSkillVariants(),
} satisfies ScenarioInput;
