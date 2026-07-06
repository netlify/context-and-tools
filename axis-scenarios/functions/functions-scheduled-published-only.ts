import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Functions: do scheduled functions run on deploy previews?",
  prompt:
    "I have a Netlify scheduled function configured to run @daily. When I open a deploy preview or a branch deploy of my site, will that scheduled function also start running on the preview/branch deploy? Answer the question directly.",
  judge: [
    { check: "States that scheduled functions run ONLY on published (production) deploys — they do NOT run on deploy previews or branch deploys" },
    { check: "Does NOT claim the schedule fires on every preview/branch deploy, and does NOT claim each preview gets its own running schedule" },
    { check: "Answer is direct and correct; if it shows config it uses config.schedule with a cron expression or shortcut (e.g. '@daily')" },
    { check: "Does NOT fabricate a per-environment scheduling toggle or config flag that does not exist to control this" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
