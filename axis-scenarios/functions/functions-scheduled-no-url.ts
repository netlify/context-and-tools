import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Footgun: a scheduled function has no public HTTP URL in production. It is not
// reachable at /.netlify/functions/{name} and cannot be triggered by an
// external HTTP request; it runs only on its schedule. Grounded in
// netlify-functions/SKILL.md (Scheduled Functions -> "Testing and triggering").
export default {
  name: "Functions: can a scheduled function be triggered over HTTP?",
  prompt:
    "My Netlify scheduled function netlify/functions/nightly-report.ts runs fine on its @daily schedule, but I also want to trigger it on demand by POSTing to https://mysite.netlify.app/.netlify/functions/nightly-report. That HTTP request fails. What is the public URL for a scheduled function so I can trigger it over HTTP, and if there isn't one, what should I do instead?",
  judge: [
    {
      check:
        "States that a scheduled function has NO public HTTP URL in production — it is not reachable at /.netlify/functions/{name} and cannot be triggered by an external HTTP request; it runs only on its schedule. The failing POST is expected.",
    },
    {
      check:
        "Recommends a grounded alternative for on-demand runs: invoke it via the CLI `netlify functions:invoke`, and/or move the work into a separate ordinary HTTP function (sharing the implementation) that CAN be triggered over HTTP.",
    },
    {
      check:
        "Does NOT invent a special URL, endpoint, header, or config that lets an external HTTP request trigger the scheduled function directly, and does NOT claim /.netlify/functions/{name} works for a scheduled function.",
    },
    {
      check:
        "Does NOT blame the failed HTTP request on an unrelated cause (a deploy glitch, wrong domain, or missing auth) as the primary explanation.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
