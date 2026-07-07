import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Footgun: context.geo (and context.ip) are mocked under `netlify dev` — local
// values are placeholders, not real client geolocation, and can look "stuck" on
// a default. Simulate a location with `netlify dev --geo=mock --country=<code>`.
// Grounded in netlify-functions/SKILL.md (Context Object -> geo/ip local note).
export default {
  name: "Functions: context.geo returns the same value in local dev",
  prompt:
    "In my Netlify function I branch on context.geo.country.code to serve country-specific content. When I run `netlify dev`, the country code always comes back as the same value no matter what, so I can't tell if my logic works. Is my context.geo code broken, and how do I test different countries locally?",
  judge: [
    {
      check:
        "Explains that context.geo (and context.ip) return mocked/placeholder values under `netlify dev` — local geo is not real client geolocation, so a constant/default country locally does NOT mean the code is broken.",
    },
    {
      check:
        "Tells the user real geolocation is populated only for deployed functions (geo branching is exercised against production/deploy previews, not by the bare local dev value).",
    },
    {
      check:
        "Recommends simulating a location locally with the `netlify dev` geo flags — `--geo=mock` together with `--country=<code>` (e.g. --country=DE) — to make context.geo return a chosen country.",
    },
    {
      check:
        "Does NOT tell the user to rewrite context.geo with a different/undocumented API, and does NOT claim context.geo is broken or unusable.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
