import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: per-redirect headers on a proxy vs global headers",
  prompt:
    "Update netlify.toml for two things. (1) Proxy `/api/*` to `https://api.example.com/:splat` (200 rewrite) and attach an `X-Forwarded-Host = 'myapp.example.com'` header to that proxied request. (2) Send `X-Frame-Options = 'DENY'` on every page served from the site.",
  judge: [
    { check: "Adds a proxy redirect: `from = '/api/*'`, `to = 'https://api.example.com/:splat'`, `status = 200`" },
    { check: "Attaches the proxy header via a `[redirects.headers]` sub-table on that redirect (e.g. `X-Forwarded-Host = 'myapp.example.com'`)" },
    { check: "Adds the site-wide header via a separate top-level `[[headers]]` block with `for = '/*'` and `X-Frame-Options = 'DENY'` under `[headers.values]`" },
    { check: "Does NOT put the proxy-specific `X-Forwarded-Host` in the global `[[headers]]` block — it belongs on the redirect rule" },
    { check: "Does NOT attach the global `X-Frame-Options` via the redirect's `[redirects.headers]` — site-wide static headers belong in `[[headers]]`" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
