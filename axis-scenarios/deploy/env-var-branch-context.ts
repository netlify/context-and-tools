import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Deploy: scope an env var to a single branch's deploys",
  prompt:
    "On our linked Netlify site we run a long-lived `staging` branch that produces branch deploys. I want `FEATURE_FLAG_CHECKOUT` set to `true` only for the `staging` branch's deploys — not production, not deploy previews, and not other branches. What's the exact `netlify` CLI command?",
  judge: [
    {
      check:
        "Sets the variable with `netlify env:set FEATURE_FLAG_CHECKOUT true` scoped to the branch via the documented `--context branch:staging` syntax",
    },
    {
      check:
        "Uses the `branch:<name>` context form specifically — not `--context production`, not `--context deploy-preview`, and not an unscoped/global set, any of which would apply the flag beyond the staging branch",
    },
    {
      check:
        "Recognizes that a context-scoped variable only applies to deploys matching that context, so the flag stays off in production and other branches without extra steps",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
