import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Forms: sync ALL submissions — paginate the Submissions API",
  prompt:
    "Write a server-side script that pulls EVERY submission from my Netlify form so I can back them all up. This form has thousands of submissions. The form id and a personal access token are in env vars.",
  judge: [
    {
      check:
        "Calls the documented Submissions API surface — `GET /api/v1/forms/{form_id}/submissions` — with an `Authorization: Bearer <token>` header, reading the token from an env var (not hardcoded, not read off disk).",
    },
    {
      check:
        "Does NOT assume a single request returns every submission — the Netlify API paginates responses over 100 items (100 per page by default), so one call only yields the first page.",
    },
    {
      check:
        "Pages through all results — increments `?page=` (optionally with `?per_page=`) and/or follows the `Link` response header's `rel=\"next\"` URL — looping until there are no more pages (no `next` link, or a short/empty page).",
    },
    {
      check:
        "Runs server-side (a Netlify Function or a Node script) and keeps the token out of client/browser code.",
    },
    {
      check:
        "Does NOT use an invented endpoint shape, `netlify api <method>` as a recovery hatch, or read the token from `~/Library/Preferences/netlify/config.json`.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
