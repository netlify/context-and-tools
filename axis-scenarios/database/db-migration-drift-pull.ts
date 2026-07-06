import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: recover migration drift with `migrations pull`",
  prompt:
    "Another teammate shipped a migration to our Netlify Database that I don't have locally — my `netlify/database/migrations/` folder is out of sync with production and `netlify database status` shows missing migrations. I have no local-only migration work in progress. Get my local migration history back in sync with production and bring my local dev database up to date. Give me the exact commands.",
  judge: [
    { check: "Uses `netlify database migrations pull` to overwrite local migration files with the canonical ones from the remote branch (defaults to production; `--branch <name>` to target another branch)" },
    { check: "After pulling, runs `netlify database migrations apply` to bring the LOCAL development database up to date with the pulled migrations" },
    { check: "Does NOT run `drizzle-kit migrate` (or `drizzle-kit pull`/`push`) against a hosted Netlify database (production or a preview branch) to reconcile drift" },
    { check: "Does NOT connect to the production database via `netlify database connect`, `psql`, or any direct connection to diff or copy schema/migration state by hand" },
    { check: "Does NOT hand-author or hand-copy the missing migration file to reconstruct it — the canonical file comes from `migrations pull`" },
    { check: "If the agent mentions committing local-only work before pulling, it is framed as a precaution because `pull` overwrites local files (the prompt states there is no local work, so this is optional)" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
