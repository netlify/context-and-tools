import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: [dev] custom command requires framework = #custom",
  prompt:
    "Configure the [dev] block in netlify.toml so `netlify dev` runs my custom dev server with `command = 'pnpm dev'` listening on `targetPort = 5173`, while Netlify Dev itself serves the site (functions, redirects) at `port = 8888`.",
  judge: [
    { check: "Adds a `[dev]` block with `command = 'pnpm dev'`, `targetPort = 5173`, and `port = 8888`" },
    { check: "Sets the `framework` key to `#custom` because both a custom `command` and a `targetPort` are set — required for Netlify Dev to run the command and connect to targetPort" },
    { check: "Does NOT leave `framework` at `#auto` (or omit it) while `command` and `targetPort` are both set — `#auto` runs Netlify Dev's own detector and ignores the custom command" },
    { check: "Assigns `port` to Netlify Dev (8888) and `targetPort` to the underlying app server (5173) without swapping the two" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
