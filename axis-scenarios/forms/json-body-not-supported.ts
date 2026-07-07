import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Forms: AJAX submission must be URL-encoded, not JSON",
  prompt:
    "Here's my Netlify contact form submit handler on a plain static site. It POSTs to \"/\" with JSON.stringify(data) and Content-Type application/json, but submissions never show up in the Netlify Forms dashboard. Fix it so submissions are recorded.",
  judge: [
    {
      check:
        "Identifies the root cause: Netlify Forms does not accept JSON — a body sent as `application/json` (via `JSON.stringify`) is not recorded as a submission.",
    },
    {
      check:
        "Changes the request to send `application/x-www-form-urlencoded` (encode the fields with `URLSearchParams`) or a raw `FormData` object — NOT JSON.",
    },
    {
      check:
        "Handles Content-Type correctly: if it keeps the URL-encoded path, sets `Content-Type: application/x-www-form-urlencoded`; if it switches to a raw `FormData` body, does NOT manually set a `Content-Type` header (so the browser adds the multipart boundary).",
    },
    {
      check:
        "Ensures the submitted body includes a `form-name` field (via a hidden input or appended to the body) so the submission maps to the registered form.",
    },
    {
      check:
        "Does NOT keep `JSON.stringify` / `Content-Type: application/json`, and does NOT route the submission through a custom Netlify Function to accept the JSON — the fix is the request encoding, not new server code.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
