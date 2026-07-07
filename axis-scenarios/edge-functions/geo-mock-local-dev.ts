import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: mock geolocation for local testing",
  prompt:
    "I have a Netlify edge function on `/` that reads `context.geo.country` and redirects visitors from Germany to `/de`. I'm developing locally in the United States. What command starts the Netlify local dev server and simulates a visitor from Germany so I can exercise the redirect? Scaffold the edge function too.",
  judge: [
    {
      check:
        "Scaffolds the edge function under netlify/edge-functions/, reading the country from `context.geo` (e.g. `context.geo.country.code`) — not from a request header",
    },
    {
      check:
        "To test locally, runs `netlify dev` with `--geo=mock` to enable mocked geolocation",
    },
    {
      check:
        "Passes the `--country` flag to set the simulated visitor country (e.g. `--country=DE` to simulate Germany)",
    },
    {
      check:
        "Uses the modern edge-function default-export (req, context) signature with config.path set to '/'",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
