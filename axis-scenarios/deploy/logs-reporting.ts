import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Deploy: pull function and deploy logs from the CLI",
  prompt:
    "Our Netlify function `process-order` is throwing errors in production, and I also want to look at the deploy logs for the latest deploy. Get me both sets of logs from the command line.",
  judge: [
    { check: "Gives the correct CLI command for the function logs — `netlify logs --source functions --function process-order` (the documented CLI logs surface). If the sandbox isn't linked/authenticated to a site, surfacing that limitation (e.g. run `netlify link` first) instead of routing around it also satisfies this — actually returning log lines is not required." },
    { check: "Gives `netlify logs --source deploy` for the deploy logs via the CLI, noting that sources can be combined in a single `netlify logs` invocation" },
    { check: "Does NOT direct the user to the Netlify dashboard UI as the primary way to read these logs, and does NOT curl `api.netlify.com` for logs" },
    { check: "Does NOT read auth tokens off disk or use `netlify api` to fetch logs" },
    { check: "May use `--follow` to stream live or `--since <window>` for a longer historical window (optional, not required)" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
