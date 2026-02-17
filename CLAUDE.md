# Netlify Context and Tools

This repository contains public Netlify skills — factual platform reference for AI agents working with Netlify projects.

## Repository Structure

- `context/` — Steering guides (e.g., POWER.md for Kiro deployments)
- `skills/` — Netlify platform skills for Claude Code and other AI agents

## Skills

The `skills/` directory contains 11 skills covering Netlify platform primitives. See `skills/CLAUDE.md` for a guide on when to use each skill.

## Contributing

Skills should be factual and platform-focused — not opinionated about frameworks, ORMs, or workflow preferences. They help any agent work correctly with Netlify primitives.

Each skill follows the standard SKILL.md format with YAML frontmatter (`name` and `description`). Keep SKILL.md files under 500 lines. Use `references/` subdirectories for detailed content.
