import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

export default {
  name: "Forms: React form with AJAX submission and build-time skeleton",
  prompt:
    "Add a contact form to this Next.js blog. It should be a client component, submit via AJAX (no full page navigation), and surface success/error state in the UI. Submissions need to show up in the Netlify Forms dashboard. Use the form name `contact`.",
  judge: [
    { check: "Adds a static skeleton at `public/__forms.html` containing a `<form name='contact' data-netlify='true' method='POST'>` with the same field names as the client component — without this, Netlify's build-time parser can't detect a JS-rendered form" },
    { check: "The skeleton's form `name` and field `name` attributes match the React component exactly (Netlify matches by name)" },
    { check: "React component is a client component (e.g. `'use client'`) and submits via `fetch` — not via the browser's default form POST" },
    { check: "AJAX fetch target is `'/__forms.html'` (or another non-routed path) — NOT `'/'`, which would be intercepted by Next.js routing and never reach the Netlify form receiver" },
    { check: "Submission body includes a `form-name` field with value `'contact'` (matches the skeleton's form name)" },
    { check: "Submission body is sent as `application/x-www-form-urlencoded` (encoded via URLSearchParams) OR as `FormData` with NO manually-set `Content-Type` header so the browser sets the multipart boundary" },
    { check: "Does NOT use `netlify-identity-widget`, `gotrue-js`, or any other deprecated package — this scenario is about Forms, not Identity" },
  ],
  setup: copyFixture("nextjs-blog"),
  variants: withSkillVariants(),
} satisfies ScenarioInput;
