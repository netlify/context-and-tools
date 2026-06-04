import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: storage choice for dynamic data",
  prompt:
    "I'm building a Netlify site and need to store user-generated posts and comments — records that will grow over time and need to be queried and joined. What should I use, and how do I get started? Make any necessary code or config changes to wire it up minimally.",
  judge: [
    { check: "Recommends Netlify Database (the GA managed Postgres product) for this use case" },
    { check: "Does NOT recommend Netlify Blobs as the primary store for these records — Blobs is for files/assets only" },
    { check: "Does NOT recommend an external Postgres provider (Neon directly, Supabase, RDS, etc.) when Netlify Database is suitable" },
    { check: "Installs or references the @netlify/database package (NOT the deprecated @netlify/neon legacy extension)" },
    { check: "Does not suggest manually wiring a NETLIFY_DB_URL / DATABASE_URL connection string — provisioning is automatic at deploy time" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
