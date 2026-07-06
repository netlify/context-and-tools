import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: branch-deploy context plus a named-branch override",
  prompt:
    "In netlify.toml: every branch deploy (any non-production branch) should run `npm run build:staging` and set ENVIRONMENT=staging. But the specific branch named `release-2.0` should instead run `npm run build:release` and set ENVIRONMENT=release. Configure both.",
  judge: [
    { check: "Adds a `[context.branch-deploy]` block with `command = 'npm run build:staging'`" },
    { check: "Sets ENVIRONMENT=staging for branch deploys under `[context.branch-deploy.environment]` (not a top-level environment table)" },
    { check: "Adds a context for the specific branch with the name quoted — `[context.\"release-2.0\"]` — because the branch name contains a dot" },
    { check: "The named-branch context sets `command = 'npm run build:release'` and ENVIRONMENT=release under `[context.\"release-2.0\".environment]`" },
    { check: "Does NOT use `[context.production]` or `[context.deploy-preview]` for either rule — both targets are branch-level, not the production or preview contexts" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
