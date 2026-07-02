import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Deploy: pull function and deploy logs from the CLI",
  prompt:
    "Our Netlify function `process-order` is throwing errors in production, and I also want to look at the deploy logs for the latest deploy. Get me both sets of logs from the command line.",
  judge: [
    { check: "Retrieves the function logs with `netlify logs --source functions --function process-order` (the documented CLI logs surface)" },
    { check: "Retrieves deploy logs via the CLI with `netlify logs --source deploy` (sources can be combined in one invocation)" },
    { check: "Does NOT direct the user to the Netlify dashboard UI as the primary way to read these logs, and does NOT curl `api.netlify.com` for logs" },
    { check: "Does NOT read auth tokens off disk or use `netlify api` to fetch logs" },
    { check: "May use `--follow` to stream live or `--since <window>` for a longer historical window (optional, not required)" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
