import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Forms: read submissions via the documented Submissions API",
  prompt:
    "Write a small server-side script that fetches my Netlify form's submissions so I can sync them to our CRM. The form id is in an env var.",
  judge: [
    {
      check:
        "Calls the documented Submissions API surface — `GET /api/v1/forms/{form_id}/submissions` — rather than an invented endpoint shape.",
    },
    {
      check:
        "Authenticates with an `Authorization: Bearer <token>` header using a personal access token.",
    },
    {
      check:
        "Reads the personal access token from an environment variable (e.g. `Netlify.env.get(...)` / `process.env` on a server) — NOT hardcoded in source.",
    },
    {
      check:
        "Runs server-side (a Netlify Function or a Node script) and does NOT put the token or the authenticated request in client-side/browser code where it would leak.",
    },
    {
      check:
        "Does NOT read the token out of `~/Library/Preferences/netlify/config.json` or another on-disk credential store — it comes from the configured env var.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
