import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Setting a custom `config.path` makes a function available ONLY at that path --
// the built-in /.netlify/functions/{name} route no longer works. Grounded in
// netlify-functions/SKILL.md ("Without a `path` config, functions are available
// at /.netlify/functions/{name}. Setting a `path` makes the function available
// only at that path").
export default {
  name: "Functions: a custom config.path disables the default /.netlify/functions route",
  prompt:
    "I set `export const config = { path: '/api/webhook' }` on my Netlify function at netlify/functions/webhook.ts. A third-party service is still calling the old default URL `/.netlify/functions/webhook` and now gets 404s. Why is that happening, and what are my options?",
  judge: [
    {
      check:
        "Correctly explains that setting a custom `path` makes the function available ONLY at that path -- the built-in `/.netlify/functions/webhook` default route is disabled once a `path` is set, so the 404 is expected behavior.",
    },
    {
      check:
        "Does NOT claim the default `/.netlify/functions/{name}` route still works alongside the custom path, and does NOT blame the 404 on an unrelated cause (a deploy glitch, a typo, a bundling bug).",
    },
    {
      check:
        "Offers at least one grounded way to serve the old URL again: list both paths in the `config.path` array (config.path accepts an array of paths), add a `[[redirects]]` rule from the old URL to `/api/webhook`, or point the third-party integration at the new `/api/webhook` path.",
    },
    {
      check:
        "If the answer includes function code, it reads env vars with `Netlify.env.get()` rather than `process.env` (passes vacuously if no function code is shown).",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
