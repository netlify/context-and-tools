import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Image CDN: cache headers on source images",
  prompt:
    "My Netlify site serves original product photos as static files from `public/images/`, and I render optimized variants through the Image CDN (`/.netlify/images?url=/images/<file>&w=...`). I want the original source images cached aggressively at the CDN edge with a long max-age so repeat transform requests don't keep re-fetching the source. Configure caching for the source images in netlify.toml.",
  judge: [
    { check: "Adds a `[[headers]]` rule in netlify.toml targeting the source image path (e.g. `/images/*`) that sets a `Cache-Control` header on those files" },
    { check: "The `Cache-Control` value uses `public` with a long `max-age` (e.g. `max-age=31536000`, optionally `immutable`) so source images are cached long-term at the edge" },
    { check: "Sets the cache headers on the SOURCE images, NOT on the `/.netlify/images` transform endpoint — transformed images are cached at the CDN edge automatically" },
    { check: "Does NOT introduce a custom Netlify Function, plugin, or middleware to handle image caching — source caching is a headers config and transform caching is automatic" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
