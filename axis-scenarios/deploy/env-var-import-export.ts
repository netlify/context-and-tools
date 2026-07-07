import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Deploy: bulk-import and export env vars via the CLI",
  prompt:
    "We just added a bunch of environment variables to a local `.env` file for our Netlify site (already linked locally) and want to get them all into Netlify at once instead of running `netlify env:set` one variable at a time. Separately, a teammate needs a copy of the site's current Netlify env vars as a plain `.env` file they can source locally. Give me the exact `netlify` CLI commands for both.",
  judge: [
    {
      check:
        "Imports the whole local `.env` into Netlify with a single `netlify env:import .env` command (the documented file-import surface) rather than requiring one `netlify env:set` per variable",
    },
    {
      check:
        "Exports the site's current env vars to a plain `.env` file with `netlify env:list --plain` (e.g. redirected with `> .env`), matching the documented export-to-file pattern",
    },
    {
      check:
        "Correctly distinguishes direction: `env:import` pushes the local file's variables up to Netlify, while `env:list --plain` pulls Netlify's current values down into a local file",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
