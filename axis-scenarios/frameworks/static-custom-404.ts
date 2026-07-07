import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// A static site gets a custom 404 by placing `404.html` in the publish directory;
// Netlify serves it automatically for unmatched routes. Grounded in
// netlify-frameworks/SKILL.md ("Custom 404 Pages").
export default {
  name: "Frameworks: custom 404 page for a static site",
  prompt:
    "I deploy a plain static site to Netlify — hand-written HTML/CSS with the files in a `public/` publish directory. I want a custom branded 404 page to show whenever someone visits a URL that doesn't exist. What's the right way to set this up on Netlify?",
  judge: [
    {
      check:
        "Creates a `404.html` file at the root of the publish directory (e.g. `public/404.html`).",
    },
    {
      check:
        "Explains that Netlify automatically serves `404.html` for unmatched routes on a static site — no extra configuration is required.",
    },
    {
      check:
        "Does NOT tell the user they must add a `[[redirects]]` rule or a Netlify Function to serve the 404 — the static `404.html` is served automatically.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
