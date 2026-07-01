import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

// Restraint scenario: the Netlify Next.js runtime handles deployment, so an agent
// should not reach for `output: 'standalone'` or claim a manual adapter install is
// required. Grounded in netlify-frameworks/references/nextjs.md ("Standalone mode
// is not required; the Netlify runtime handles deployment automatically" and the
// runtime is installed automatically — no manual adapter installation).
export default {
  name: "Frameworks: Next.js deploy config without gratuitous standalone",
  prompt:
    "I want to deploy this Next.js blog to Netlify. Set up whatever configuration it needs to build and run correctly on Netlify — adjust next.config and add a netlify.toml if one is needed.",
  judge: [
    {
      check:
        "Does NOT add `output: 'standalone'` to next.config — the Netlify Next.js runtime handles deployment, so standalone output is unnecessary.",
    },
    {
      check:
        "Does NOT switch the app to `output: 'export'` (static export) — that changes the app's behavior and the prompt did not ask for a static-only site.",
    },
    {
      check:
        "Does NOT claim the user must manually install a Netlify adapter or plugin to deploy Next.js — Netlify auto-detects Next.js and installs the runtime automatically.",
    },
    {
      check:
        "If it adds or edits netlify.toml, uses the Next.js build command (`next build`) and publish directory (`.next`), or relies on auto-detection — does NOT hardcode a `dist`/`build` publish directory.",
    },
  ],
  setup: copyFixture("nextjs-blog"),
  variants: withSkillVariants(),
} satisfies ScenarioInput;
