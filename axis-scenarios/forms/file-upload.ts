import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Forms: job application form with resume upload",
  prompt:
    "Add a 'Careers' page to a static site with a job application form. Applicants submit name, email, role they're applying for, and a resume PDF. Submissions and the uploaded file should land in the Netlify Forms dashboard.",
  judge: [
    { check: "Form has `name='application'` (or another single explicit name), `data-netlify='true'`, and `method='POST'`" },
    { check: "Form declares `enctype='multipart/form-data'` — required for file uploads" },
    { check: "Includes a `<input type='file' name='resume' ...>` field — Netlify identifies the uploaded file by the input's `name`" },
    { check: "Collects the file with a single-file input — if the design were extended to several files, it uses a SEPARATE `<input type='file'>` per file (Netlify Forms accepts one file per input field), NOT one `multiple` input to gather several files into a single field. Passes vacuously when only the one resume file is collected." },
    { check: "Does NOT advertise a max file size larger than 8 MB — the 8 MB cap is the whole POST request body, and Netlify Forms rejects requests above it. Passes vacuously if no max is mentioned." },
    { check: "If the agent adds a hand-rolled JS submitter using FormData, it does NOT manually set a `Content-Type` header — the browser must add the multipart boundary. Passes vacuously if the form submits via plain HTML." },
    { check: "Does NOT route the upload through a custom Netlify Function in `netlify/functions/` — Netlify Forms ingests file uploads natively when the form has `data-netlify` set" },
    { check: "Does NOT include hardcoded secrets or admin email addresses in client-side HTML — recipient configuration belongs in the Netlify UI under Notifications" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
