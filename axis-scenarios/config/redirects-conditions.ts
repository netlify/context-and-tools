import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: named param, country condition, and forced rewrite",
  prompt:
    "Add three rules to netlify.toml. (1) `/users/:id` should rewrite (200, URL unchanged) to `/api/users/:id`. (2) Visitors from France (country FR) hitting any path should be rewritten to the `/fr/` equivalent of that path. (3) `/app/*` is a client-rendered section: even though some real static files exist under /app, always serve `/app/index.html` so the client router takes over.",
  judge: [
    { check: "Rule 1 uses a named path parameter: `from = '/users/:id'`, `to = '/api/users/:id'`, `status = 200` — NOT a `/users/*` splat" },
    { check: "Rule 2 uses `conditions` with `Country = ['FR']` and rewrites to the `/fr/` path (e.g. `to = '/fr/:splat'`, status 200)" },
    { check: "Rule 3 sets `force = true` on the `/app/*` → `/app/index.html` rewrite — force is required precisely because real static files exist under /app and must be overridden" },
    { check: "Does NOT add `force = true` to rule 1 or rule 2, where there is no existing-file conflict to override" },
    { check: "Does NOT confuse the named param `:id` with a splat `:splat` — `:id` captures one path segment, the splat captures the remainder" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
