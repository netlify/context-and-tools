import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Deploy: branch deploys are off by default",
  prompt:
    "My site is connected to GitHub with Netlify continuous deployment. Pushing to `main` deploys to production and opening a PR gives me a deploy preview — both work great. But I just pushed a new `staging` branch expecting Netlify to publish it at a branch URL, and nothing happened. Why isn't my `staging` branch deploying, and how do I get branch deploys working?",
  judge: [
    { check: "Explains that branch deploys are NOT enabled by default — pushing a non-production branch does not automatically produce a branch deploy until branch deploys are turned on" },
    { check: "Tells the user to enable branch deploys in the site's build & deploy settings (either for all branches, or for specific branches like `staging`)" },
    { check: "Treats this as expected behavior rather than a bug/failure — does not claim the push should have 'just worked' or invent a CLI/config command to force the missing branch deploy" },
    { check: "Does not conflate this with PR Deploy Previews (which are separate and already working); the fix is the branch-deploy site setting" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
