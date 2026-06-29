import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Forms: email notification with custom subject",
  prompt:
    "When someone submits my Netlify contact form, I want an email notification sent to our team with a clear, fixed subject line. Set that up.",
  judge: [
    {
      check:
        "Directs the user to configure the email notification in the Netlify UI under Project configuration > Notifications — it's a dashboard setting, not code.",
    },
    {
      check:
        "For the custom subject, adds a hidden input `<input type=\"hidden\" name=\"subject\" value=\"...\" />` to the form.",
    },
    {
      check:
        "Does NOT build a custom Netlify Function that sends the email (e.g. via SendGrid, nodemailer, or a Slack webhook) — notification delivery is configured in the UI.",
    },
    {
      check:
        "Does NOT hardcode the recipient email address or any SMTP credentials in client-side markup.",
    },
    {
      check:
        "Keeps the form's `data-netlify=\"true\"` and a unique `name`. Passes vacuously if the answer only adjusts notification setup on an existing form.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
