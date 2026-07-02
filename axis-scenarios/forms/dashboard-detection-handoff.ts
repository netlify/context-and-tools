import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Forms: submissions not appearing — detection enablement handoff",
  prompt:
    "I added a Netlify form to my site but submissions aren't showing up anywhere in Netlify. What do I need to do to actually collect them?",
  judge: [
    {
      check:
        "Explains that form detection must be enabled in the Netlify UI (the Forms section) — having the form attribute in the markup isn't enough on its own until detection is turned on for the project.",
    },
    {
      check:
        "Confirms the required form markup: `data-netlify=\"true\"` and a unique `name` on the `<form>`, submitted via POST.",
    },
    {
      check:
        "If the form is rendered by a JS framework (React/Vue/SSR), notes a static HTML skeleton (e.g. `public/__forms.html`) is required for build-time detection. Passes vacuously if the answer assumes a plain static HTML form.",
    },
    {
      check:
        "Does NOT tell the user to build a custom Netlify Function to capture submissions — Netlify Forms ingests detected form posts natively.",
    },
    {
      check:
        "Does NOT propose enabling detection or fetching submissions by curling `https://api.netlify.com/...`, running `netlify api <method>`, or reading tokens off disk.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
