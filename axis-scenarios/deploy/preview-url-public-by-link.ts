import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Deploy: draft/preview deploy URLs are public by link",
  prompt:
    "I ran `netlify deploy` to get a draft/preview URL for an unreleased feature, and I want to send that URL to an outside contractor for review. The build contains confidential, not-yet-announced content. Since the preview URL is a long random-looking string that isn't linked from anywhere, only the person I send it to can see it, right? It's effectively private?",
  judge: [
    { check: "Corrects the assumption: draft deploy / Deploy Preview / branch deploy URLs are publicly accessible to anyone who has the link — an unguessable, unlisted URL is NOT access control" },
    { check: "Warns the user not to treat the preview URL as a private/safe place for confidential or unreleased content on the basis of URL obscurity alone" },
    { check: "To actually restrict access, points to enabling site protection in the Netlify UI (Password Protection, or Team/SSO protection), and notes you can protect all deploys or only non-production deploys" },
    { check: "Does NOT claim preview URLs are private or secure by default, or that the randomness/unguessability of the URL protects them" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
