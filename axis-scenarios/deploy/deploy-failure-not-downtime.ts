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
        "Conveys that the previous deploy is still serving and does not need to be restored or republished — since the failed deploy never went live there is no downtime to recover from (exact 'nothing to roll back' wording not required).",
    },
    {
      check:
        "Points the user to the real fix — resolve the build/deploy failure so the new code can ship (redeploying once fixed) — rather than restoring an older deploy as the solution.",
    },
    {
      check:
        "Does NOT tell the user to manually publish/restore a previous deploy through `netlify api` (e.g. restoreSiteDeploy/publishDeploy), a direct `https://api.netlify.com/...` call, or by reading auth tokens off disk.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
