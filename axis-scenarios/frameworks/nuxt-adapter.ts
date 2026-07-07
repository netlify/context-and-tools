import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Footgun: Nuxt needs NO Netlify adapter install — Nitro auto-detects Netlify and
// uses its `netlify` preset. Grounded in netlify-frameworks/references/nuxt.md.
export default {
  name: "Frameworks: configure Nuxt for Netlify (no adapter needed)",
  prompt:
    "I'm setting up a Nuxt 3 app to deploy on Netlify with server-side rendering and a few server API routes under server/api/. What adapter or plugin do I need to install and configure for Netlify?",
  judge: [
    {
      check:
        "Explains that Nuxt needs NO separate Netlify adapter/module install — Nuxt is built on Nitro, which auto-detects Netlify and uses its `netlify` preset when building on the platform.",
    },
    {
      check:
        "Does NOT tell the user to install a wrong-target adapter (Vercel/Cloudflare/Node) or a separate Netlify adapter package to make Nuxt deploy.",
    },
    {
      check:
        "Does NOT hand-author raw Netlify Functions under `netlify/functions/` for the `server/api/` routes — Nitro compiles them into Netlify Functions automatically.",
    },
    {
      check:
        "Relies on Netlify's auto-detection of Nuxt (or standard `nuxt build`) rather than a manual, incorrect build hack.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
