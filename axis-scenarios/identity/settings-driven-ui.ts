import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Identity: settings-driven login UI with getSettings()",
  prompt:
    "Render my Netlify Identity login UI based on the project's actual settings: only show the signup form when signups are enabled, and only show an OAuth button for providers that are turned on. Use Netlify Identity.",
  judge: [
    {
      check:
        "Uses `@netlify/identity` — NOT the deprecated `netlify-identity-widget` or `gotrue-js`.",
    },
    {
      check:
        "Calls `getSettings()` to read the instance configuration at runtime rather than hardcoding which providers/forms to show.",
    },
    {
      check:
        "Gates the signup form on `settings.disableSignup` (hides the form when signups are disabled).",
    },
    {
      check:
        "Renders OAuth buttons by iterating `settings.providers` (a Record of provider -> boolean) and only showing a button when the provider's value is true — does NOT hardcode the provider list.",
    },
    {
      check:
        "Reads only documented fields off the returned settings object (e.g. `disableSignup`, `providers`, `autoconfirm`) and does NOT invent settings fields.",
    },
    {
      check:
        "Does NOT hardcode an Identity / GoTrue endpoint URL or admin token in the client code.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
