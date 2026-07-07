import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Forms: file-upload submission limits (30-second timeout, 8 MB request)",
  prompt:
    "I'm adding a resume-upload form to my Netlify site using Netlify Forms (data-netlify). Some applicants upload large PDFs over slow office connections and report the upload hangs and never completes. Before I blame their network, are there Netlify Forms limits I should design around here?",
  judge: [
    {
      check:
        "Identifies the 30-second submission timeout — a form submission that can't complete within 30 seconds will fail — as a limit to design around, which slow uploads of large files can hit.",
    },
    {
      check:
        "Notes the 8 MB maximum request size (the entire POST request body), which a large PDF on a slow connection can exceed.",
    },
    {
      check:
        "If it addresses collecting multiple files, correctly states Netlify Forms accepts one file per input field (so several files need separate `<input type=\"file\">` fields). Passes vacuously if only the single resume file is discussed.",
    },
    {
      check:
        "Advises staying within these native Netlify Forms limits rather than routing the upload through a custom Netlify Function to bypass the timeout/size cap — Netlify Forms ingests file uploads natively when the form has `data-netlify` set. Passes vacuously if no such workaround is proposed.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
