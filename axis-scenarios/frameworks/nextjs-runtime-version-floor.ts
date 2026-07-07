import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Footgun: the Netlify Next.js Runtime v5 requires Next.js >= 13.5; older versions
// can't use it. Grounded in netlify-frameworks/references/nextjs.md ("The current
// Next.js Runtime (v5) supports Next.js 13.5 and later").
export default {
  name: "Frameworks: Next.js runtime version floor",
  prompt:
    "We're deploying a Next.js app to Netlify, but the project is pinned to Next.js 13.2. Are there any Netlify Next.js runtime version requirements I should know about before deploying, and if so what do we need to do?",
  judge: [
    {
      check:
        "States that the current Netlify Next.js Runtime (v5) requires Next.js 13.5 or later.",
    },
    {
      check:
        "Concludes that Next.js 13.2 is below that floor and advises upgrading Next.js to at least 13.5 to deploy on the current runtime.",
    },
    {
      check:
        "Does NOT claim any/all Next.js versions deploy unchanged, and does NOT invent an unrelated version requirement.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
