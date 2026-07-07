import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: Language-based redirect conditions",
  prompt:
    "Add redirect rules to netlify.toml that serve localized content based on the visitor's browser language: visitors whose language is French (`fr`) should get the `/fr/` version of whatever path they requested, and German (`de`) visitors should get the `/de/` version. Keep the URL in the browser unchanged.",
  judge: [
    { check: "Adds a `[[redirects]]` rule with `conditions = { Language = ['fr'] }` that routes to the `/fr/` path (e.g. `from = '/*'`, `to = '/fr/:splat'`)" },
    { check: "Adds a `[[redirects]]` rule with `conditions = { Language = ['de'] }` that routes to the `/de/` path" },
    { check: "Language values are given as an array, matching the `conditions = { Language = [...] }` syntax" },
    { check: "Uses `status = 200` (a rewrite) so the browser URL stays unchanged, as requested" },
    { check: "Uses the `Language` condition key for the requirement — does NOT substitute a `Country` condition in its place, since the requirement is the visitor's language, not their country" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
