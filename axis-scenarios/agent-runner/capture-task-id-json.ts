import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Agent Runner: capture the task ID via --json for reliable polling",
  prompt:
    "Write a shell snippet that starts a Netlify agent task, then waits for it to finish before printing the result. It needs to run unattended in CI.",
  judge: [
    {
      check:
        "Creates the task with `netlify agents:create ... --json` so the task ID can be parsed reliably (e.g. piped through `jq`) instead of scraping human-readable output.",
    },
    {
      check:
        "Polls with `netlify agents:show <task-id>` (optionally `--json`) in a loop until the status is terminal — one of `done`, `error`, or `cancelled`.",
    },
    {
      check:
        "Treats `new` and `running` as non-terminal and keeps polling — there are no callbacks or webhooks signalling completion.",
    },
    {
      check:
        "Does NOT assume the task is finished right after `agents:create` returns — creation returns once the task is queued, not when the work is done.",
    },
    {
      check:
        "Polls only documented surfaces (`agents:show` / `agents:list`) — does NOT curl `https://api.netlify.com/...`, use `netlify api <method>`, or read tokens off disk.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
