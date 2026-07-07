import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Forms: detection enabled but the live form won't collect until a redeploy",
  prompt:
    "I already turned on form detection in the Netlify UI for my site, and my contact form has data-netlify=\"true\" with a unique name. But the already-deployed form still isn't collecting anything. Why, and what do I do?",
  judge: [
    {
      check:
        "Explains that Netlify scans for forms at build/deploy time, so enabling form detection only applies to FUTURE deploys — it does not retroactively rescan or register the currently-published deploy.",
    },
    {
      check:
        "Tells the user to trigger a new deploy/build (e.g. push a commit or redeploy) so the build parser scans the HTML and registers the form; submissions start collecting from that deploy onward.",
    },
    {
      check:
        "Confirms the existing markup (`data-netlify=\"true\"` + a unique `name`, POST) is already correct, so the fix is redeploying rather than changing the form.",
    },
    {
      check:
        "Does NOT tell the user to build a custom Netlify Function to capture submissions — native detection works once a fresh deploy has been scanned.",
    },
    {
      check:
        "Does NOT propose re-enabling detection or fetching submissions by curling `https://api.netlify.com/...`, running `netlify api <method>`, or reading tokens off disk.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
