import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Forms: static HTML contact form with honeypot",
  prompt:
    "Add a contact form to a plain static HTML site so submissions show up in the Netlify Forms dashboard. The form should collect name, email, and message; have a honeypot field to deter bots; and redirect to /thanks on successful submission. No JavaScript or framework — just HTML.",
  judge: [
    { check: "The `<form>` element has `name='contact'` (or another single explicit name) and `data-netlify='true'` so Netlify's build-time parser registers it" },
    { check: "Form uses `method='POST'`" },
    { check: "Adds a honeypot via `netlify-honeypot='<field-name>'` on the form AND a corresponding hidden input with that name" },
    { check: "Includes input fields for name, email, and message with `name=` attributes (Netlify identifies fields by `name`)" },
    { check: "Sets `action='/thanks'` (NOT `/thanks.html` — Netlify serves the page at the clean URL) so the browser navigates there on success" },
    { check: "Does NOT use AJAX / `fetch` to submit — this is a plain HTML form, so the browser's default POST is what triggers Netlify Forms" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
