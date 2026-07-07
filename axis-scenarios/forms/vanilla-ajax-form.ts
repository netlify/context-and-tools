import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Forms: vanilla-JS AJAX contact form on a plain static site",
  prompt:
    "I have a plain static HTML site — no framework, no SSR, just files I deploy. Add a contact form (name, email, message) that submits via AJAX so the page doesn't reload, and shows a success message inline. Submissions must show up in the Netlify Forms dashboard. Use the form name `contact`.",
  judge: [
    {
      check:
        "Puts a real `<form name=\"contact\" method=\"POST\" data-netlify=\"true\">` in the static HTML — since this is plain static HTML (not a JS-rendered form), Netlify's build-time parser detects the form directly from the served HTML.",
    },
    {
      check:
        "Adds a JS submit handler that calls `e.preventDefault()` and submits via `fetch` (AJAX) instead of the browser's default form navigation, then surfaces success inline.",
    },
    {
      check:
        "The AJAX `fetch` POSTs to `\"/\"` — the correct target for a plain static (non-SSR) site. The skeleton-file path (e.g. `/__forms.html`) is only needed for JS-rendered/SSR apps where `fetch('/')` would be intercepted by the SSR catch-all.",
    },
    {
      check:
        "Sends the body as `application/x-www-form-urlencoded` (encoded with `URLSearchParams`) — NOT `JSON.stringify` with `Content-Type: application/json`, which Netlify Forms does not record.",
    },
    {
      check:
        "The submitted body includes a `form-name` field with value `contact` (via a hidden input or appended to the body) so the submission maps to the registered form.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
