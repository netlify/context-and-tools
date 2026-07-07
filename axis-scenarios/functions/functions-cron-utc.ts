import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariantsStrict } from "../helpers/variants";

// Under-tested rule: scheduled function cron schedules are interpreted in UTC.
// Grounded in netlify-functions/SKILL.md (Scheduled Functions: "Run on a cron
// schedule (UTC timezone)"). A user-supplied local time must be converted to
// UTC rather than scheduled at the literal local hour.
const shared = [
  {
    check:
      "Creates a scheduled Netlify function at netlify/functions/daily-digest.ts using a modern default export async handler (not exports.handler or a named handler export)",
  },
  {
    check:
      "Configures the schedule in the exported config using config.schedule set to a cron expression (e.g. '0 13 * * *'), not a fixed shortcut like @daily that cannot target a specific hour",
  },
];

export default {
  name: "Functions: scheduled function cron timezone (UTC)",
  prompt:
    "Create a Netlify scheduled function at netlify/functions/daily-digest.ts that sends a daily digest email once a day at 9:00 AM in New York (US Eastern time). Set up the schedule.",
  // Baseline (no-context): may not know cron runs in UTC and could schedule the
  // literal local hour (9). A valid scheduled function is acceptable here.
  judge: [
    ...shared,
    {
      check:
        "Produces a valid scheduled function and does not fabricate an unsupported scheduling mechanism.",
    },
  ],
  // with-skill: expect awareness that the cron schedule is interpreted in UTC.
  variants: withSkillVariantsStrict([
    ...shared,
    {
      check:
        "Imports Config (and optionally Context) types from @netlify/functions",
    },
    {
      check:
        "Accounts for the cron schedule running in UTC: it explicitly notes the schedule is interpreted in UTC (not local/Eastern time) and converts 9:00 AM Eastern to the corresponding UTC time for the cron expression, rather than scheduling the cron for hour 9 as if it were local time.",
    },
    {
      check:
        "Does NOT claim Netlify scheduled functions support a timezone or offset configuration option that runs the cron in a non-UTC timezone.",
    },
  ]),
} satisfies ScenarioInput;
