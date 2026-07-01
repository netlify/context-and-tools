import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: add a build plugin with inputs",
  prompt:
    "Add the Netlify Lighthouse build plugin to netlify.toml and configure it so its report is written to reports/lighthouse.html.",
  judge: [
    { check: "Adds a `[[plugins]]` array-of-tables entry (double brackets) with `package = '@netlify/plugin-lighthouse'`" },
    { check: "Adds a nested `[plugins.inputs]` table configuring the report output path (e.g. `output_path = 'reports/lighthouse.html'`)" },
    { check: "Uses the array-of-tables form `[[plugins]]`, not a single `[plugins]` table — plugins are a list" },
    { check: "Puts the configuration values under `[plugins.inputs]`, not directly under `[[plugins]]` alongside `package`" },
    { check: "Does NOT replace the plugin with hand-written build-command steps or a one-off script that runs Lighthouse manually" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
