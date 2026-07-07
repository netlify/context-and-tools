import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Deploy: a manual --prod deploy is replaced by the next Git push",
  prompt:
    "Our site auto-deploys from the `main` branch via Netlify's Git continuous deployment. Production is broken and I need a fix live immediately, so I built locally and ran `netlify deploy --prod` from my laptop to publish the hotfix without waiting on the Git pipeline. Will my manually published build stay live? A teammate is about to push an unrelated commit to `main`.",
  judge: [
    { check: "Explains that because Git continuous deployment is connected, the teammate's next push to the production branch triggers a new build that auto-publishes and REPLACES the manually published `--prod` deploy — the hotfix would be overwritten" },
    { check: "Tells the user how to keep the manual deploy live: lock the published deploy ('Stop auto publishing') from the site's Deploys list in the UI, after which new pushes still build but do not auto-publish until unlocked or manually published" },
    { check: "Warns that mixing manual `--prod` deploys with Git CD on the same production branch is a race the next commit wins, and/or recommends landing the fix in the production branch so the pipeline ships it" },
    { check: "Does NOT tell the user to disable/delete the Git connection or use side-channel API calls (netlify api, curling api.netlify.com) to protect the deploy" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
