import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Forms: a legitimate submission is missing — spam classification",
  prompt:
    "A customer says they submitted my Netlify contact form and saw the success message, but the submission never showed up in my verified submissions and I got no email notification. The form markup and detection are all set up correctly. What's going on?",
  judge: [
    {
      check:
        "Explains that Netlify runs Akismet spam filtering automatically, and a submission classified as spam is moved to a separate Spam list — it does NOT appear in the verified submissions list and does NOT trigger notifications, so a missing legit submission is often a false-positive spam classification rather than a delivery bug.",
    },
    {
      check:
        "Tells the user where to look: the Spam submissions tab in the Forms UI (or the Submissions API with `?state=spam`), and that a spam submission can be marked verified.",
    },
    {
      check:
        "Notes that submissions caught by a honeypot field or a failed reCAPTCHA challenge are discarded entirely and never appear in either list.",
    },
    {
      check:
        "Does NOT tell the user to build a custom Netlify Function to capture the missing submissions, or to disable spam filtering wholesale as the first step.",
    },
    {
      check:
        "Does NOT propose reaching submissions by curling `https://api.netlify.com/...` with an invented endpoint shape, running `netlify api <method>`, or reading tokens off disk.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
