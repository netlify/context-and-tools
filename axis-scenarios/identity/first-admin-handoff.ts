import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Identity: first admin user is a dashboard handoff",
  prompt:
    "I'm adding an admin role to my Netlify Identity app and need a first admin account plus an admin-only area. How do I create that first admin?",
  judge: [
    {
      check:
        "Explains the FIRST admin user cannot be created through code alone — it must be set up via the Netlify dashboard.",
    },
    {
      check:
        "Gives the dashboard steps as a user handoff: Project configuration > Identity (e.g. `https://app.netlify.com/projects/<slug>/configuration/identity`), use **Invite users** to invite the admin email, then after they accept, open the user and add the `admin` role in the Roles field.",
    },
    {
      check:
        "Does NOT attempt to create the admin or assign the role programmatically by curling `https://api.netlify.com/...`, running `netlify api <method>`, or reading tokens from `~/Library/Preferences/netlify/config.json`.",
    },
    {
      check:
        "For SUBSEQUENT users, notes roles can be assigned in code via Identity event functions (e.g. `userSignup`) — and that roles live on server-controlled `app_metadata.roles`, never user-editable `user_metadata`.",
    },
    {
      check:
        "Uses `@netlify/identity` for any auth code — NOT the deprecated `netlify-identity-widget` or `gotrue-js`.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
