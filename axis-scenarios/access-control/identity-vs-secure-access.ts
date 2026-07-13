import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Access control: disambiguate Secure Access from app-readable Identity",
  prompt:
    "I turned on Secure Access for my Netlify site and added Google as a provider. Now how do I read the logged-in user's email in my app code?",
  judge: [
    {
      check:
        "Recognizes that site-access controls (Secure Access / Password Protection / team- or SSO-login) are a separate PERIMETER layer from app identity — the perimeter gates who can load the site but does not, by itself, give app code a logged-in end user or issue an `nf_jwt`. Enumerating the basic-password vs team-login variants is illustrative, not required for this SAML/Google prompt.",
    },
    {
      check:
        "Explains that reading the current user's email in app code requires Netlify Identity (a separate, app-level layer) — enable Identity and use `@netlify/identity` (e.g. `getUser()`) — rather than reading it from the Secure Access session",
    },
    {
      check:
        "Clarifies the Google ambiguity: Google configured at the site-access / SSO layer signs in Netlify team members (dashboard/team access — no `nf_jwt`, no Identity user record), which is different from Google as a Netlify Identity OAuth provider (signs in app end users and issues `nf_jwt`). Exact terminology like 'Team/Org SAML IdP' is not required as long as the two layers are correctly distinguished.",
    },
    {
      check:
        "Does NOT invent an API/header to fetch the Secure Access or SSO session from app code as a per-user identity, and does NOT claim the perimeter login is readable as the app's user",
    },
    {
      check:
        "Does NOT attempt to inspect access settings via undocumented means — no curling `https://api.netlify.com/...`, no reading tokens from disk",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
