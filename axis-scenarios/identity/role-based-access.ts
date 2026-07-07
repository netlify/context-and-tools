import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Identity: admin-only Netlify Function with role check",
  prompt:
    "Create a Netlify function at netlify/functions/admin-stats.ts mounted at /api/admin/stats that returns sensitive metrics. Only authenticated Netlify Identity users with the `admin` role should be able to call it — everyone else should get 401 or 403.",
  judge: [
    { check: "Resolves the authenticated user server-side by calling `getUser()` from '@netlify/identity' (which reads the request's `nf_jwt` cookie). Does NOT parse the Authorization header or decode the JWT by hand." },
    { check: "Returns 401 (or 403) when there is no signed-in user (`getUser()` returns null)" },
    { check: "Checks for the 'admin' role on the user object's server-controlled `user.app_metadata.roles`, NOT `user.user_metadata.roles` (which is user-editable and unsafe to authorize against)" },
    { check: "Returns 403 when the user is authenticated but missing the `admin` role" },
    { check: "Does NOT trust a `role` value coming from the request body, query string, or a header — server-derived from the user's session only" },
    { check: "Uses the modern Netlify function signature (default-export `(req, context)` returning a Response) and exposes the route at `/api/admin/stats` — either via `config.path` on the function or a `[[redirects]]` rule to that path" },
    { check: "Does NOT import the deprecated `netlify-identity-widget` or `gotrue-js` packages anywhere" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
