import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Agent Runner: don't delegate uncommitted local work to a remote task",
  prompt:
    "I've been refactoring the checkout code on my machine but haven't committed anything yet. Spin up a Netlify agent to write tests for my new checkout logic so it runs while I keep working.",
  judge: [
    { check: "Warns that a Netlify agent task runs REMOTELY against the pushed branch and can only see code that has been committed and pushed — the uncommitted local refactor will NOT be visible to it" },
    { check: "Recommends committing and pushing the refactor first (or writing the tests locally) so the remote agent isn't working from stale code, rather than delegating against the current pushed state as-is" },
    { check: "Asks for the user's explicit permission before running `netlify agents:create`, since the task runs on Netlify infrastructure and incurs cost" },
    { check: "Does NOT immediately run `netlify agents:create` against the unpushed working tree" },
    { check: "Treats the task as asynchronous: notes that creating it returns immediately and its result must be polled with `netlify agents:show`, not assumed complete when the command returns. Passes vacuously if the agent correctly stops to resolve the unpushed-work problem before getting this far" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
