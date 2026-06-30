# Contributing

Thanks for improving the Netlify skills! This guide covers how to make changes and how releases work.

## What to edit

- **Edit `skills/` only** — it's the source of truth for every output format.
- **Never edit `cursor/rules/` or `codex/`.** They're auto-generated from `skills/` by CI: on same-repo PRs and on every push to `main`, the workflow rebuilds and commits them, so hand edits get overwritten. (Fork PRs can't be auto-committed — include the regenerated output, or leave it for a maintainer.) To preview the generated output locally: `bash scripts/build-cursor-rules.sh` and `bash scripts/build-codex-skills.sh`.
- `context/` holds steering guides (e.g. `POWER.md`); `.claude-plugin/`, `.grok-plugin/`, and `.mcp.json` configure plugin distribution.

## Skill format

Each skill is a `skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`) and a markdown body. Keep skills factual and platform-focused — "how does this Netlify feature work?", not workflow or framework opinions. Keep `SKILL.md` under 500 lines and put deeper content in a `references/` subdirectory.

## Testing skills with AXIS

Skill changes can be validated against representative agent scenarios with [AXIS](https://axis.run). From the repo root:

```bash
npx axis run
```

AXIS runs **locally only** — it's non-deterministic and intentionally not part of CI. See [`axis-scenarios/README.md`](axis-scenarios/README.md) for how to run it, read reports, and write scenarios.

## Commit and PR title conventions

We use [Conventional Commits](https://www.conventionalcommits.org/). A CI check (`lint-pr-title`) enforces that every **PR title** is conventional. An optional scope is allowed, e.g. `feat(netlify-database): add connection pooling guidance`.

| Prefix | Use for | Release effect (while in 0.x) |
|---|---|---|
| `feat:` | A new skill or a new capability in a skill | **minor** (0.8 → 0.9) |
| `fix:` | Correcting wrong or broken guidance | **patch** (0.8.0 → 0.8.1) |
| `feat!:` / `BREAKING CHANGE:` | Removing/renaming a skill, or other breaking change | **minor** (stays sub-1.0) |
| `docs:` | Clarifying existing guidance (no behavior change) | none — appears in the changelog only |
| `chore:` `ci:` `test:` `refactor:` | Tooling, CI, evals, internal cleanup | none |

> **Heads-up on `docs:`** — for a skills repo, clarifying a skill is often the real work, but `docs:` does **not** cut a release. If a change adds a capability, use `feat:`; if it corrects something wrong, use `fix:`. Reserve `docs:` for pure clarifications you don't need a release for.

PRs currently merge as **merge commits** (not squashed), so release-please reads the `feat:`/`fix:` commits *inside* your branch to decide the version bump — the PR title is enforced for consistency and changelog readability. Make sure your branch has at least one conventional commit for the change to be released. (If the repo later switches to squash-merge, the enforced PR title becomes the single release-driving commit.)

## How releases happen

Releases are automated with [release-please](https://github.com/googleapis/release-please) — you never tag or write release notes by hand:

1. Merges to `main` accumulate in a standing **"Release PR"** that bumps the version and updates `CHANGELOG.md`.
2. Merge that Release PR when you want to ship. It tags the release, updates `package.json` and `CHANGELOG.md`, and publishes a GitHub Release.

We're on a `0.x` line and will bump to `1.0.0` deliberately when the skill set is declared stable.
