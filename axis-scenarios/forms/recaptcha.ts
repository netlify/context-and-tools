import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Forms: add Netlify-managed reCAPTCHA to a contact form",
  prompt:
    "Create a contact form as an HTML page for my Netlify site — it collects name, email, and message — with Netlify-managed reCAPTCHA so bots can't spam it.",
  judge: [
    {
      check:
        "Adds `data-netlify-recaptcha=\"true\"` to the `<form>` element.",
    },
    {
      check:
        "Adds a widget placeholder `<div data-netlify-recaptcha=\"true\"></div>` where the reCAPTCHA should render — so the attribute appears on BOTH the form and the widget div.",
    },
    {
      check:
        "Keeps the form's `data-netlify=\"true\"` and a unique `name`, with POST method.",
    },
    {
      check:
        "Does NOT add a custom reCAPTCHA site key / secret key in client code or load Google's own reCAPTCHA script — Netlify provisions and verifies the reCAPTCHA itself.",
    },
    {
      check:
        "Does NOT route the submission through a custom Netlify Function to verify the captcha token.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
