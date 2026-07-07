import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: choosing 301 vs 302 vs 404 redirect status",
  prompt:
    "Add three redirect rules to netlify.toml. (1) `/old-pricing` has permanently moved to `/pricing`. (2) `/promo` should redirect to `/summer-sale`, but only temporarily — the campaign ends soon and we'll want `/promo` back later. (3) `/legacy-app/*` was removed entirely and should return a Not Found response. Pick the correct HTTP status for each.",
  judge: [
    { check: "Each rule is a `[[redirects]]` table with `from` and `to` keys in netlify.toml" },
    { check: "Rule 1 (`/old-pricing` → `/pricing`) uses `status = 301` — or omits `status`, since 301 is the default — for the permanent move" },
    { check: "Rule 2 (`/promo` → `/summer-sale`) uses `status = 302` for the explicitly temporary redirect" },
    { check: "Rule 3 (`/legacy-app/*`) uses `status = 404` for the removed section" },
    { check: "Does NOT use `status = 200` for any of these — 200 is a rewrite that keeps the browser URL unchanged, not a redirect that changes the address bar" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
