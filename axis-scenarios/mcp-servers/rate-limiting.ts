import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Netlify Functions provide built-in declarative rate limiting via the
// `rateLimit` block in the function's `config` export (windowSize <= 180s,
// windowLimit, aggregateBy). Agents tend to hand-roll an in-memory counter,
// which doesn't hold across instances. Rate limits can't be set in netlify.toml.
// Grounded in netlify-mcp-servers/SKILL.md.
export default {
  name: "MCP Servers: rate-limit a public MCP endpoint an agent hits in a loop",
  prompt:
    "My MCP server is a public Netlify Function and an agent can call it in a tight loop. I want to cap how many requests it accepts per client. What's the right way to add rate limiting on Netlify?",
  judge: [
    {
      check:
        "Uses Netlify Functions' BUILT-IN declarative rate limiting via a `rateLimit` block in the function's `config` export -- does NOT hand-roll a request counter in module-level memory (which wouldn't hold across function instances anyway)",
    },
    {
      check:
        "Shows the `rateLimit` fields: `windowSize` (time window in seconds, capped at 180), `windowLimit` (max requests per window), and `aggregateBy` to group by `ip`, `domain`, or both",
    },
    {
      check:
        "States that function rate limits live only in the function's `config` export and CANNOT be defined in `netlify.toml`",
    },
    {
      check:
        "Notes over-limit requests get HTTP 429 by default (or `action: \"rewrite\"` with a `to` path). Passes vacuously if not raised -- it is a minor detail",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
