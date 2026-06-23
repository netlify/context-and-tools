import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Identity: hand dashboard-only setup to the user",
  prompt:
    "I'm starting a brand-new Netlify site and want email/password plus 'Sign in with Google' using Netlify Identity. Set it up and tell me everything I need to do to get it working end to end.",
  judge: [
    { check: "Tells the user the Identity instance must be ENABLED in the Netlify dashboard first — there is no CLI command or public API to enable it — and points to Project configuration > Identity (e.g. `https://app.netlify.com/projects/<slug>/configuration/identity`)" },
    { check: "For Google OAuth, instructs enabling the Google provider under the dashboard's External providers, and notes the 'Use Netlify's app' option means no client_id / secret is needed (good for a prototype)" },
    { check: "Frames the dashboard steps as a handoff the user performs — ideally a checklist to complete between the draft deploy and the production deploy — rather than something the agent does or something deferred until after a failed prod deploy" },
    { check: "Does NOT attempt to enable Identity or add the provider programmatically: no curling `https://api.netlify.com/...`, no `netlify api <method>`, no reading tokens from `~/Library/Preferences/netlify/config.json`" },
    { check: "Uses `@netlify/identity` in any code it writes — NOT the deprecated `netlify-identity-widget` or `gotrue-js`" },
    { check: "Notes that email/password is always available (there is no 'Email provider' toggle) — only OAuth providers need enabling. Passes vacuously if email/password is simply treated as working without extra dashboard setup." },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
