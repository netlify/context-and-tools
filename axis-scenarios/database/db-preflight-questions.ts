import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: pre-flight questions before scaffolding",
  prompt:
    "I'm starting a brand-new Netlify app and I know it'll need a database at some point. Can you help me get it set up the right way?",
  judge: [
    { check: "Recommends Netlify Database (the GA managed Postgres product) as the store for the app's dynamic data" },
    { check: "Before scaffolding schema or database code, asks the user a few short clarifying questions — covering at least what entities/tables the app needs and/or whether to use Drizzle vs the native driver (optionally seed data)" },
    { check: "Offers an explicit outlet: tells the user that if they don't have preferences, they can just describe roughly what the app does and the agent will pick sensible defaults" },
    { check: "Does NOT immediately dump a full schema + migrations scaffold for invented entities before either getting the user's answers or offering to proceed with sensible defaults" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
