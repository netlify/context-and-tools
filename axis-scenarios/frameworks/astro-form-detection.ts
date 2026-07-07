import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Footgun: Netlify form detection parses prerendered HTML at deploy time, so a
// `data-netlify` form that only renders on an on-demand (SSR) Astro route is never
// registered. Grounded in netlify-frameworks/references/astro.md ("Form detection
// only scans prerendered HTML").
export default {
  name: "Frameworks: Netlify form on an on-demand Astro route",
  prompt:
    "My Astro site uses `output: 'server'` with the Netlify adapter. I want to add a Netlify contact form. The contact page is server-rendered on demand (it has `export const prerender = false`). Add the form and make sure Netlify actually registers it and captures submissions.",
  judge: [
    {
      check:
        "Explains that Netlify form detection only parses prerendered/static HTML at deploy time, so a `data-netlify` form that renders only on an on-demand (SSR / `prerender = false`) route is never registered and its submissions 404.",
    },
    {
      check:
        "Provides a working fix: put the detectable form on a prerendered page (e.g. mark the route `export const prerender = true`), OR add a static hidden detection form on a prerendered page and submit via AJAX — rather than relying on the on-demand-rendered form being detected.",
    },
    {
      check:
        "Keeps the required Netlify form markup (`name` + `data-netlify=\"true\"`, plus the hidden `form-name` field when using the AJAX pattern) so detection works once the form is in static HTML.",
    },
    {
      check:
        "Does NOT claim the SSR-rendered form will be auto-detected as-is with no change to how or where it is rendered.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
