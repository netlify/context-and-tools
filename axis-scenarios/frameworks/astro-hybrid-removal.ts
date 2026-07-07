import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Footgun: Astro 5 removed the `"hybrid"` output mode. There are now two modes
// (`"static"` and `"server"`) and per-route `export const prerender` control
// replaces hybrid. Grounded in netlify-frameworks/references/astro.md ("Output Modes").
export default {
  name: "Frameworks: Astro 5 removed the hybrid output mode",
  prompt:
    "I'm upgrading my Astro site to Astro 5 and deploying it on Netlify. It used to be configured with `output: 'hybrid'` — mostly prerendered static pages plus a handful of dynamic, server-rendered routes. Now `hybrid` no longer works. How should I configure the output mode and my routes for Astro 5 on Netlify?",
  judge: [
    {
      check:
        "Explains that Astro 5 removed the `'hybrid'` output mode — there are now two output modes (`'static'` and `'server'`) and per-route control replaces it.",
    },
    {
      check:
        "Controls which routes render on demand vs. are prerendered per route with `export const prerender = true`/`false`, rather than a `hybrid` output setting.",
    },
    {
      check:
        "Keeps the site on one of the two supported modes — e.g. `output: 'static'` (default) with the dynamic routes opting into on-demand rendering via `export const prerender = false`, or equivalently `output: 'server'` with the static routes prerendered.",
    },
    {
      check:
        "Includes the Netlify adapter (`adapter: netlify()` from `@astrojs/netlify`) in astro.config, since some routes render on demand.",
    },
    {
      check:
        "Does NOT recommend `output: 'hybrid'` — it no longer exists in Astro 5.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
