import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariantsStrict } from "../helpers/variants";

// Advisory scenario: for framework adapter-generated functions, the region is set
// site-wide in the Netlify UI, NOT via `config.region` in code. Grounded in
// netlify-functions/SKILL.md: "For framework adapter-generated functions (Next.js,
// Astro, Nuxt, etc.) the region must be set site-wide in the Netlify UI, not via
// config.region in code. The generated files can't carry per-function config."
const shared = [
  {
    check:
      "Does NOT hallucinate a working per-function region setting bolted onto a hand-written `netlify/functions/*` file or a next.config option presented as the mechanism — adapter-generated functions can't carry per-function region config. Stating that the region must be configured at the site/platform level is acceptable.",
  },
  {
    check:
      "Does NOT invent a cloud-provider region string like 'eu-west-1' or 'europe' presented as a working Netlify code-level region setting.",
  },
];

export default {
  name: "Frameworks: Next.js adapter region is set site-wide in the UI",
  prompt:
    "My Next.js app deploys to Netlify via the framework runtime (no hand-written Netlify Functions). For data-residency reasons I need its server-side rendering and API-route functions to run from a European region (Dublin) instead of the default. How do I configure that?",
  judge: shared,
  variants: withSkillVariantsStrict([
    ...shared,
    {
      check:
        "Directs the user to set the region SITE-WIDE in the Netlify UI / site configuration, explaining that framework adapter-generated functions cannot have their region set via `config.region` in code.",
    },
    {
      check:
        "Specifically does NOT tell the user to add `export const config = { region: ... }` to Next.js route/page files, nor to hand-write a `netlify/functions` wrapper, in order to pin the region.",
    },
  ]),
} satisfies ScenarioInput;
