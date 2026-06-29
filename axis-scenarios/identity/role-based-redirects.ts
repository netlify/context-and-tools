import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Identity: role-gated /admin via netlify.toml redirects",
  prompt:
    "Gate the /admin section of my site so only logged-in Netlify Identity users with the `admin` role can reach it. Do it with netlify.toml redirect rules, not a function.",
  judge: [
    {
      check:
        "Adds a `[[redirects]]` rule in netlify.toml that serves the /admin path for admins using `conditions = { Role = [\"admin\"] }` (status 200 rewrite).",
    },
    {
      check:
        "Adds a following fallback `[[redirects]]` rule for the same /admin path that sends non-admins away (e.g. to `/` with status 302) — the admin rule comes first since rules are evaluated top-to-bottom.",
    },
    {
      check:
        "Uses the exact condition key `Role` (capital R) inside `conditions` — does NOT invent a different key like `role`, `roles`, or `app_metadata`.",
    },
    {
      check:
        "Notes the CDN reads the `nf_jwt` cookie to evaluate the Role condition. Passes vacuously if not mentioned.",
    },
    {
      check:
        "Implements the gate with redirect rules as asked — does NOT instead reach for a Netlify Function or edge function to do the role check.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
