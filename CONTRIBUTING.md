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

| Prefix | Use for | Release effect |
|---|---|---|
| `feat:` | A new skill or a new capability in a skill | **minor** (1.3.2 → 1.4.0) |
| `fix:` | Correcting wrong or broken guidance | **patch** (1.3.2 → 1.3.3) |
| `fix(context):` | The Context Pipeline's automated skill sync PRs from `netlify/docs` (titled by the receiver) | **patch** — every merged import is released |
| `feat!:` / `BREAKING CHANGE:` | Removing/renaming a skill, or other breaking change | **major** (1.3.2 → 2.0.0) |
| `docs:` | Clarifying existing guidance (no behavior change) | none — appears in the changelog only |
| `chore:` `ci:` `test:` `refactor:` | Tooling, CI, evals, internal cleanup | none |

Renaming or retiring a skill also needs an entry in `skill-registry.json` (prior names for a rename, a `deprecated` entry for a retirement) so the hosted manifest can tell syncing clients what happened to the old name.

> **Heads-up on `docs:`** — for a skills repo, clarifying a skill is often the real work, but `docs:` does **not** cut a release. If a change adds a capability, use `feat:`; if it corrects something wrong, use `fix:`. Reserve `docs:` for pure clarifications you don't need a release for.

PRs **squash-merge** with the PR title as the whole commit message (the body is discarded), so the title's type is what release-please reads: a `chore:` title never cuts a release, `fix:` and `feat:` do. Commits inside your branch don't matter for versioning.

## How releases happen

Releases are automated with [release-please](https://github.com/googleapis/release-please) — you never tag or write release notes by hand:

1. Merges to `main` accumulate in a standing **"Release PR"** that bumps the version and updates `CHANGELOG.md`.
2. Merge that Release PR when you want to ship. It tags the release, stamps the version into `package.json` and every plugin manifest, updates `CHANGELOG.md`, and publishes a GitHub Release.
3. The tag is then published automatically by `.github/workflows/publish.yml`: the hosted site (`https://netlify-skills.netlify.app`, with the `manifest.json` clients sync against), and the `@netlify/skills` npm package (the whole set, the manifest, and the `netlify-skills` command). Everything is built from the tag, so a failed or partial publish can be re-run from the Actions tab with the tag name and nothing else.

The release number covers the whole set (that is what npm and the plugin manifests carry). Each skill in the manifest also has its own `version`: the release in which its files last changed, derived from git tags at publish time, so a consumer can pin or compare one skill without caring about the rest. The hosted site keeps every past release at `v/<version>/`, rebuilt from git tags on each publish, so a pin never disappears.
