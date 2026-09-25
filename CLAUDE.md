# Netlify Context and Tools

This repository contains public Netlify skills — factual platform reference for AI agents working with Netlify projects.

## Repository Structure

- `context/` — Steering guides (e.g., POWER.md for Kiro deployments)
- `.claude-plugin/` — Plugin marketplace config for Claude Code installation (VS Code agent plugins share this format and auto-detect `.claude-plugin/plugin.json`; no VS-Code-specific mirror is generated)
- `.grok-plugin/` — Plugin manifest for Grok Build (same plugin format as Claude Code; hand-authored, not generated)
- `.mcp.json` — Netlify MCP server config bundled with the Claude Code and Grok Build plugins (hosted HTTP endpoint; OAuth at runtime)
- `gemini-extension.json` — Gemini CLI extension manifest. `name`, `version` (stamped by release-please), and `mcpServers` are hand-authored; the `skills` array is auto-generated from `skills/` (do NOT edit it directly). Gemini CLI itself auto-discovers skills from the `skills/` directory, so the array is informational (gallery listing, readers)
- `skills/` — Netlify platform skills (source of truth for all agent formats)
- `agent-plugin/` — [Agent Plugins](https://agent-plugins.org) spec-compliant package (`plugin.json` + `mcp.json` + `skills/`). Root manifests are hand-authored; `agent-plugin/skills/` is auto-generated (do NOT edit directly)
- `cursor/rules/` — Auto-generated Cursor `.mdc` rule files (do NOT edit directly)
- `codex/` — Auto-generated Codex skills and `AGENTS.md` router (do NOT edit directly)
- `scripts/build-cursor-rules.sh` — Converts `skills/` → `cursor/rules/`
- `scripts/build-codex-skills.sh` — Copies `skills/` → `codex/` and generates `AGENTS.md`
- `scripts/build-agent-plugin.sh` — Mirrors `skills/` → `agent-plugin/skills/`
- `scripts/build-gemini-extension.sh` — Rewrites the `skills` array in `gemini-extension.json` from `skills/*/SKILL.md` (sorted; requires `jq`)
- `scripts/build-manifest.mjs` — Generates `manifest.json` (skill names, statuses, per-skill `version` and `history` derived from git tags, prior names, per-file hashes, `tree_hash`, docs provenance) from `skills/`, `.ctx-gen/`, and `skill-registry.json`
- `scripts/build-hosted.mjs` — Materializes every release tag into `dist/` (`manifest.json`, `skills/`, `versions.json`, `v/<version>/…`) for the hosted site
- `scripts/fetch-skill.mjs` — Zero-dependency reference client: install skills (`--skill`/`--all`) from a release directory (`--source`) or the hosted site (`--host`) with hash verification; `--check` a local skills dir against the manifest; `--update` applies the sync rules (stale → replace, modified → keep unless `--reset`, renamed → migrate, deprecated → delete)
- `bin/netlify-skills.mjs` — The `netlify-skills` command shipped in `@netlify/skills` (`npx @netlify/skills@latest add|check|update`); installs from the package's own bundled release by default, `--host` for the hosted manifest; thin wrapper over `fetch-skill.mjs`
- `skill-registry.json` — Hand-maintained prior names and deprecations that the manifest cannot derive from `skills/`
- `netlify.toml` — Hosted-site config (publish dir, cache headers); deployed by `.github/workflows/publish.yml`, not by a Git-connected build
- `.github/workflows/publish.yml` — Publishes a release tag to the hosted Netlify site and to npm (`@netlify/skills`); called from `release-please.yml`, re-runnable by hand with a tag
- `.github/workflows/build-generated-outputs.yml` — Rebuilds `cursor/`, `codex/`, `agent-plugin/skills/`, and the `gemini-extension.json` skill list from `skills/` and commits them in a single step (on push to main and on PRs), so the generated outputs always stay in parity with `skills/`

## Skills

The `skills/` directory contains skills covering Netlify platform primitives. See `skills/CLAUDE.md` for a guide on when to use each skill.

## Cursor Rules

The `cursor/rules/` directory is **auto-generated** from `skills/` and must never be edited directly. A GitHub Actions workflow rebuilds these files whenever `skills/` changes — committing them on same-repo PRs and on push to `main` (fork PRs are verified, not auto-committed). To rebuild locally:

```bash
bash scripts/build-cursor-rules.sh
```

## Contributing

Skills should be factual and platform-focused — not opinionated about frameworks, ORMs, or workflow preferences. They help any agent work correctly with Netlify primitives.

Each skill follows the standard SKILL.md format with YAML frontmatter (`name` and `description`). Keep SKILL.md files under 500 lines. Use `references/` subdirectories for detailed content.

**Renaming or retiring a skill:** add the old name to `skill-registry.json` (`prior_names` on the successor, or a `deprecated` entry when there is no successor). The hosted manifest reads it so syncing clients can map or delete the old copy.

**Important:** Always edit files in `skills/`. Never edit files in `cursor/rules/`, `codex/`, or `agent-plugin/skills/`, or the `skills` array in `gemini-extension.json` — they are overwritten by CI.

**Don't commit contributor-only skills.** `npx skills add netlify/context-and-tools` discovers any `SKILL.md` in the repo (including `.claude/skills/`) and installs it for users. Contributor tooling comes in as a plugin instead: `.claude/settings.json` enables Anthropic's `skill-creator` plugin, and Claude Code prompts you to install it when you trust this folder. Use it when creating or editing a skill.
