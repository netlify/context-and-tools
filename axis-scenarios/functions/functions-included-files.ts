import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Footgun: only a function's code and its imported modules are bundled. A file
// read from disk at runtime (fs.readFile of a template/data file) is NOT in the
// deployed bundle unless declared via `included_files` -- so it works under
// `netlify dev` (reads the working tree) but ENOENTs in production. Grounded in
// netlify-functions/SKILL.md ("Reading Files at Runtime").
export default {
  name: "Functions: runtime file read works in dev but ENOENTs in production",
  prompt:
    "My Netlify function reads an HTML email template from disk at runtime with fs.readFileSync of netlify/functions/templates/welcome.html. It works when I run `netlify dev`, but once deployed to Netlify the function throws ENOENT (file not found). Why does it work locally but fail in production, and how do I fix it?",
  judge: [
    {
      check:
        "Correctly explains the root cause: only the function's own code and the modules it imports are bundled and deployed; a file opened from disk at runtime is NOT part of the deployed bundle unless explicitly included, so it is missing in production even though local dev reads it from the working tree.",
    },
    {
      check:
        "Gives the grounded fix: declare the file with `included_files` in netlify.toml (under a [functions] table or a per-function [functions.\"name\"] table) so it ships with the function bundle. Suggesting importing the data as a module for static files is an acceptable additional option.",
    },
    {
      check:
        "Does NOT claim that files read from disk at runtime are bundled automatically, and does NOT blame the ENOENT primarily on an unrelated cause (a deploy glitch, file permissions, a bad relative path alone) instead of the missing bundling.",
    },
    {
      check:
        "Does NOT invent a non-existent Netlify config field for this — `included_files` is the mechanism named.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
