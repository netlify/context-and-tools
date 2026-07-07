import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Footgun: TanStack Start < 1.132.0 can't use the standalone
// `@netlify/vite-plugin-tanstack-start` plugin — pass `target: 'netlify'` to
// `tanstackStart()` instead. And Netlify CLI deploys require netlify-cli >= 17.31.
// Grounded in netlify-frameworks/references/tanstack.md.
export default {
  name: "Frameworks: TanStack Start version floor for the Netlify plugin",
  prompt:
    "I'm deploying a TanStack Start app to Netlify, but we're pinned to @tanstack/react-start 1.130.2 and can't upgrade right now. We deploy through the Netlify CLI in CI. How do I configure this version to build its server functions on Netlify, and is there anything I need to know about the CLI?",
  judge: [
    {
      check:
        "Recognizes that TanStack Start 1.130.2 is below 1.132.0, so the standalone `@netlify/vite-plugin-tanstack-start` plugin isn't available — does NOT tell the user to install that plugin.",
    },
    {
      check:
        "Configures Netlify by passing the `target: 'netlify'` option to `tanstackStart()` in `vite.config.ts` (i.e. `tanstackStart({ target: 'netlify' })`).",
    },
    {
      check:
        "Notes that deploying via the Netlify CLI requires netlify-cli >= 17.31.",
    },
    {
      check:
        "Does NOT hand-author raw Netlify Functions for the app's `createServerFn` server functions — they are translated to Netlify Functions automatically.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
