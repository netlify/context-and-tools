import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Forms: use my own reCAPTCHA v2 keys on a Netlify form",
  prompt:
    "I already have my own Google reCAPTCHA v2 site key and secret. Wire up reCAPTCHA on my Netlify contact form to use MY keys instead of Netlify's managed ones.",
  judge: [
    {
      check:
        "Keeps the Netlify-integrated reCAPTCHA markup: `data-netlify-recaptcha=\"true\"` on the `<form>` plus a `<div data-netlify-recaptcha=\"true\"></div>` widget placeholder, on a `data-netlify=\"true\"` form with a unique `name` and POST method.",
    },
    {
      check:
        "Sets the user's own keys as Netlify environment variables — `SITE_RECAPTCHA_KEY` (the site key) and `SITE_RECAPTCHA_SECRET` (the secret) — which Netlify picks up automatically for verification.",
    },
    {
      check:
        "Keeps the secret server-side as an environment variable and does NOT hardcode `SITE_RECAPTCHA_SECRET` (or the site key/secret) in client-side HTML/JS.",
    },
    {
      check:
        "Does NOT load Google's own reCAPTCHA script or hand-render the widget with `grecaptcha`, and does NOT build a custom Netlify Function to verify the reCAPTCHA token — Netlify still handles verification using the provided keys.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
