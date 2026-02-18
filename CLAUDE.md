# Netlify Context and Tools

This repository contains public Netlify skills — factual platform reference for AI agents working with Netlify projects.

## Repository Structure

- `context/` — Steering guides (e.g., POWER.md for Kiro deployments)
- `.claude-plugin/` — Plugin marketplace config for Claude Code installation
- `skills/` — Netlify platform skills (source of truth for all agent formats)
- `cursor/rules/` — Auto-generated Cursor `.mdc` rule files (do NOT edit directly)
- `scripts/build-cursor-rules.sh` — Converts `skills/` → `cursor/rules/`
- `.github/workflows/build-cursor-rules.yml` — Runs the build on push to main and PRs

## Skills

The `skills/` directory contains skills covering Netlify platform primitives. See `skills/CLAUDE.md` for a guide on when to use each skill.

## Cursor Rules

The `cursor/rules/` directory is **auto-generated** from `skills/` and must never be edited directly. A GitHub Actions workflow rebuilds these files whenever `skills/` changes on `main`. To rebuild locally:

```bash
bash scripts/build-cursor-rules.sh
```

## Contributing

Skills should be factual and platform-focused — not opinionated about frameworks, ORMs, or workflow preferences. They help any agent work correctly with Netlify primitives.

Each skill follows the standard SKILL.md format with YAML frontmatter (`name` and `description`). Keep SKILL.md files under 500 lines. Use `references/` subdirectories for detailed content.

**Important:** Always edit files in `skills/`. Never edit files in `cursor/rules/` — they are overwritten by CI.
