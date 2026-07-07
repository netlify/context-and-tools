import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: netlify.toml overrides Netlify UI settings",
  prompt:
    "Our site's build command and publish directory are configured in the Netlify dashboard UI. A teammate just committed a netlify.toml that sets a different `[build]` command and publish directory. Which values actually run on the next deploy, and where should we manage these settings going forward?",
  judge: [
    { check: "States that `netlify.toml` takes precedence over the Netlify UI — the committed `[build]` command and publish directory win and override the dashboard settings" },
    { check: "Notes the override is silent: the UI fields still display their old values but become inert once netlify.toml sets the same property" },
    { check: "Recommends managing these settings in `netlify.toml` (the source of truth once present) rather than editing the UI, to avoid the confusion" },
    { check: "Does NOT claim the Netlify UI settings override or take precedence over netlify.toml" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
