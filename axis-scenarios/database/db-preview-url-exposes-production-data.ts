import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: sharing a deploy preview URL exposes production data",
  prompt:
    "My app uses Netlify Database. I opened a deploy preview for a new feature and I want to send the preview URL to an external stakeholder so they can click around and give feedback. Anything I should watch out for before I share the link?",
  judge: [
    { check: "Warns that the deploy preview's database branch is forked from production — it holds a live copy of real production data, including any PII (real user names, emails, whatever production stores)" },
    { check: "Warns that Netlify deploy preview URLs are public-by-link unless deploy access protection is enabled — anyone with the link can read that production-derived data through the app" },
    { check: "Recommends a concrete safeguard before sharing externally: enable Password Protection / SSO on the deploy (access control), and/or seed the preview branch with non-production data — rather than sending the raw link as-is" },
    { check: "Does NOT claim the preview is safe to share simply because it is not the production URL or is 'just a preview'" },
    { check: "Does NOT reach for side-channel workarounds (curling api.netlify.com, netlify api, reading tokens off disk) to lock down the preview" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
