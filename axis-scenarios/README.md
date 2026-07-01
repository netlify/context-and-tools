# AXIS scenarios

This directory holds the [AXIS](https://axis.run) test scenarios that validate the Netlify skills in `skills/`. AXIS is synthetic testing for **agent experience**: given a scenario (a prompt plus a grading rubric), it runs a real coding agent, captures the transcript, and scores how well the agent accomplished the task.

We use it to catch regressions in the skills before they ship — for example, a skill edit that makes an agent reach for a raw API call, hand-roll a Netlify shim, or pick the wrong primitive.

## Running it locally

AXIS runs **locally only, by design** (see [Why it's local-only](#why-its-local-only)). From the repo root:

```bash
npm install        # installs @netlify/axis (a devDependency)
npx axis run       # runs the scenarios against the configured agents, scores them, and writes a report
```

Reports are written to `.axis/reports/<timestamp>/` (gitignored). To read them:

```bash
npx axis reports          # list local reports
npx axis reports latest   # view the most recent report
```

### Prerequisites

`axis.config.json` lists the agents under test and the judge:

```json
{
  "scenarios": "./axis-scenarios",
  "agents": ["codex", "claude-code", "gemini"],
  "judging": { "agents": ["codex"] }
}
```

Each agent you want to run must have its CLI installed and authenticated locally (Codex, Claude Code, Gemini). While iterating you can narrow a run to a subset of agents or scenarios — see `npx axis run --help`.

## Why it's local-only

A few deliberate choices that are **not** gaps:

- **Not wired into CI (for now).** Runs are non-deterministic (LLM agents plus LLM judging) and slow, so we run them locally against the changes we care about rather than gating every PR. CI only validates skill formatting and rebuilds the `cursor/` and `codex/` mirrors.
- **Single self-judge.** `judging.agents: ["codex"]` grades the runs for the moment. (AXIS can use a separate judge model; we haven't split it out yet.)
- **Scores drift between runs.** Because both the agent and the judge are non-deterministic, repeat runs won't produce identical scores. Read the judged checks and the transcript, not just the number. `npx axis baseline …` can record a baseline for rough regression comparison, but treat it as a signal, not a hard threshold.

`.axis/` (gitignored) holds your local run history across branches; nothing about a run is committed.

## Writing a scenario

A scenario is a `.ts` file under `axis-scenarios/<domain>/` with a default export:

```ts
import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Functions: scheduled function",
  prompt: "Create a Netlify function that runs every day at midnight…",
  judge: [
    { check: "Exports `config` with a `schedule` cron expression" },
    { check: "Does NOT hand-roll a cron library or external scheduler" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
```

Key pieces:

- **`prompt`** — what the agent is asked to do. Ground it in something the skill actually documents.
- **`judge`** — an array of `{ check }` rubric items the judge grades the transcript against. Prefer checks that test documented *constraints and restraint* (e.g. "does NOT set `config.region` speculatively"), not just "did it use feature X".
- **`variants: withSkillVariants()`** — the standard pair: a `no-context` run (no skills loaded) and a `with-skill` run (all of `skills/` loaded). This is how we measure whether loading the skill changes the agent's behavior. Use `withSkillVariantsStrict(stricterJudge)` when the skill is meant to push the agent toward a *narrower recommended* answer than the baseline. Both helpers live in [`helpers/variants.ts`](helpers/variants.ts).
- **`setup: copyFixture("name")`** *(optional)* — stages `axis-fixtures/<name>/**` into the agent's workspace. Use it when the prompt references an existing project ("add X to this app"). Keep fixtures minimal. Helper in [`helpers/setup.ts`](helpers/setup.ts).
- **`skip: true`** *(avoid)* — disables a scenario. Don't land a bare skip; remove the scenario instead, or leave a comment explaining why and linking a tracking issue.

### Source of truth

Scenarios validate `skills/` — the source of truth. Never write a scenario or judge check against the generated `codex/` or `cursor/` output, and never assert platform behavior the skill doesn't document; if a judge needs a fact, the skill should teach it.

## Scoring

AXIS grades each run across four dimensions — Goal Achievement, Environment, Service, and Agent — and rolls them into a single AXIS score. Full reference: **https://axis.run**.
