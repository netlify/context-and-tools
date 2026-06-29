import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Access control: disambiguate Secure Access from app-readable Identity",
  prompt:
    "I turned on Secure Access for my Netlify site and added Google as a provider. Now how do I read the logged-in user's email in my app code?",
  judge: [
    {
      check:
        "Recognizes that site-access controls and app identity are separate layers: basic password protection admits any visitor who has the shared password, team-login protection limits site access to Netlify team members, and neither, by itself, gives app code a logged-in end user or issues an `nf_jwt`",
    },
    {
      check:
        "Explains that reading the current user's email in app code requires Netlify Identity (a separate, app-level layer) — enable Identity and use `@netlify/identity` (e.g. `getUser()`) — rather than reading it from the Secure Access session",
    },
    {
      check:
        "Clarifies the Google ambiguity: Google as a Team/Org SAML IdP signs in Netlify team members (no `nf_jwt`, no Identity user record), which is different from Google as a Netlify Identity OAuth provider (signs in app end users and issues `nf_jwt`)",
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
