import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

export default {
  name: "Config: static headers and edge function routing",
  prompt:
    "Update netlify.toml to (1) add a long immutable cache header for everything under /assets/*, and (2) wire an existing edge function `netlify/edge-functions/auth.ts` to run on /admin/* but skip /admin/public/*.",
  judge: [
    { check: "Adds a `[[headers]]` block with `for = '/assets/*'` and a `[headers.values]` table including `Cache-Control = 'public, max-age=31536000, immutable'` (or equivalent immutable long-lived header)" },
    { check: "Adds an `[[edge_functions]]` entry with `function = 'auth'` and `path = '/admin/*'`" },
    { check: "Excludes the public subpath via `excludedPath = '/admin/public/*'` (string or array) on the same edge_functions entry" },
    { check: "Does NOT try to attach the edge function via `[[redirects]]` or `[[headers]]` — edge function routing goes in `[[edge_functions]]`" },
    { check: "Does NOT add the same Cache-Control via a redirect rule with `to` — static file headers belong in `[[headers]]`" },
    { check: "Function name in the config matches the file basename ('auth' for `auth.ts`)" },
  ],
  setup: copyFixture("edge-auth-site"),
  variants: withSkillVariants(),
} satisfies ScenarioInput;
