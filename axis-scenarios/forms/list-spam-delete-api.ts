import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Forms: list forms, fetch spam, and delete submissions via the API",
  prompt:
    "Write a server-side maintenance script for my Netlify site. It should (1) list all the forms on the site, (2) pull the spam submissions for each form, and (3) delete the ones that are obviously junk. The site id and a personal access token are in env vars.",
  judge: [
    {
      check:
        "Lists a site's forms via `GET /api/v1/sites/{site_id}/forms` — the documented list-forms endpoint — rather than an invented endpoint shape.",
    },
    {
      check:
        "Fetches spam submissions via `GET /api/v1/forms/{form_id}/submissions?state=spam` (the documented spam surface), NOT the plain submissions list.",
    },
    {
      check:
        "Deletes a submission via `DELETE /api/v1/submissions/{id}` — the documented delete-submission endpoint.",
    },
    {
      check:
        "Authenticates every request with an `Authorization: Bearer <token>` header using a personal access token read from an environment variable — NOT hardcoded and NOT read out of `~/Library/Preferences/netlify/config.json` or another on-disk credential store.",
    },
    {
      check:
        "Runs server-side (a Netlify Function or a Node script) and keeps the token and authenticated requests out of client-side/browser code.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
