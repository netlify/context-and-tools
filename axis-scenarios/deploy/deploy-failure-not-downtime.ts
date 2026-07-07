import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// A failed deploy never publishes: the site keeps serving the last successful
// deploy, so it isn't down and there is nothing to "roll back." Grounded in
// netlify-deploy/SKILL.md ("A failed deploy does not publish -- the site keeps
// serving the last successful deploy, so it isn't down, and there's nothing to
// 'roll back.' The only way to get the new code live is to fix the failure and
// redeploy").
export default {
  name: "Deploy: a failed deploy is not downtime -- nothing to roll back",
  prompt:
    "My production deploy on Netlify just failed during the build. Is my live site down right now? I'm thinking I should roll back to the previous deploy to get it back up -- how do I do that?",
  judge: [
    {
      check:
        "Reassures the user the live site is NOT down: a failed deploy does not publish, so the site keeps serving the last successful deploy.",
    },
    {
      check:
        "Explains there is nothing to 'roll back' -- the failed deploy never went live, so restoring or republishing a previous deploy is neither needed nor applicable.",
    },
    {
      check:
        "Says the way to get the new code live is to fix the build/deploy failure and redeploy (e.g. re-run `netlify deploy`), not to restore an older deploy.",
    },
    {
      check:
        "Does NOT tell the user to manually publish/restore a previous deploy through `netlify api` (e.g. restoreSiteDeploy/publishDeploy), a direct `https://api.netlify.com/...` call, or by reading auth tokens off disk.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
