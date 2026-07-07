import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Footgun: SvelteKit needs the official `@sveltejs/adapter-netlify` adapter
// registered in svelte.config.js (it does not auto-detect). Grounded in
// netlify-frameworks/references/sveltekit.md.
export default {
  name: "Frameworks: configure SvelteKit for Netlify",
  prompt:
    "I'm deploying a SvelteKit app to Netlify with SSR. What do I need to install and how do I configure it?",
  judge: [
    {
      check:
        "Installs the official `@sveltejs/adapter-netlify` adapter (e.g. as a dev dependency).",
    },
    {
      check:
        "Registers it in `svelte.config.js` — imports the adapter and sets `kit.adapter` to `adapter(...)`.",
    },
    {
      check:
        "Does NOT install a wrong-target adapter (`@sveltejs/adapter-vercel`/`-cloudflare`/`-node`) or leave `adapter-auto` pointed at a non-Netlify target.",
    },
    {
      check:
        "Does NOT hand-author raw Netlify Functions under `netlify/functions/` for SvelteKit endpoints/hooks — the adapter generates them.",
    },
    {
      check:
        "Does NOT pin a guessed/fabricated version for `@sveltejs/adapter-netlify` — installs without explicit pins, with `@latest`, or after checking the current version.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
