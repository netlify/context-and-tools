import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: slow first query is a scale-to-zero cold start, not a bug",
  prompt: `Our Netlify site uses Netlify Database. On our staging preview and on low-traffic pages, the very first database query after the app has been idle for a while takes noticeably longer (a second or two), then everything is fast again for subsequent requests.

A teammate suggested adding a scheduled function that runs a \`SELECT 1\` against the database every minute to keep it warm. Is that the right fix, and what's actually going on?`,
  judge: [
    { check: "Identifies the cause as scale-to-zero / autosuspend: Netlify Database suspends the database compute after it sits idle and restarts it on the next query, so the first query after idle is a slower cold-start wake-up — expected behavior, not a bug, a misconfiguration, or a connection leak" },
    { check: "Tells the user the keep-alive pinger (a scheduled function / cron that queries the DB on an interval just to keep it warm) is NOT the right fix — it defeats scale-to-zero and is an unnecessary workaround against a managed primitive" },
    { check: "Keeps the data layer on `getDatabase()` from '@netlify/database'; does NOT recommend switching drivers or standing up a separate external connection pooler to eliminate the latency" },
    { check: "Reassures that queries after the wake-up run at normal speed and that the first-query latency is inherent to scale-to-zero — no code change is needed to eliminate it (surfacing it as a capacity/plan question is the escalation, not a hack)" },
    { check: "Does NOT reach for side-channel workarounds (raw `psql`, curling api.netlify.com, `netlify api`, or reading auth tokens off disk) to keep the database warm or to diagnose it" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
