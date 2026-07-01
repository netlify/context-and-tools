import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: local-only apply / reset workflow",
  prompt:
    "Working on a Netlify Database project locally. I just generated a new migration that I haven't shipped anywhere. I want to (1) apply it to my local dev database so I can test it under `netlify dev`, and if it's wrong (2) throw away that unapplied migration and start over, and separately (3) occasionally wipe my local database entirely and replay everything from scratch. Explain which command does which, and clear up whether `netlify dev` applies migrations for me.",
  judge: [
    { check: "Applies the migration to the local dev DB with `netlify database migrations apply` (NOT `drizzle-kit migrate`, NOT `drizzle-kit push`)" },
    { check: "Clarifies that `netlify dev` does NOT apply pending migrations automatically — the user must run `netlify database migrations apply` themselves" },
    { check: "Uses `netlify database migrations reset` to delete the unapplied migration file(s), and explains it only removes migrations that have NOT yet been applied (it cannot undo an applied migration)" },
    { check: "Uses `netlify database reset` to wipe the local development database (drop schemas/tables) so all migrations replay from scratch — and distinguishes it from `migrations reset`" },
    { check: "Makes clear that all three commands act on the LOCAL development database only and never touch a preview branch or production" },
    { check: "Does NOT suggest hand-deleting migration files or hand-editing Drizzle's snapshot/journal to discard an unapplied migration" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
