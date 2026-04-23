---
name: netlify-agent-runner
description: Run AI agent tasks remotely on Netlify using Claude, Codex, or Gemini. Use when the user wants to run an AI agent on their site, get a second opinion from another model, or delegate development tasks to run remotely against their repo.
---

# Netlify Agent Runner

Run AI coding agents (Claude, Codex, Gemini) remotely on Netlify infrastructure to automate development tasks on your site.

## Prerequisites

- The project must be a **GitHub repository**
- The site must be **linked to a Netlify project** (via `netlify link` or `netlify init`)
- The Netlify CLI must be installed and authenticated

Agent tasks run against the **remote code** on GitHub, not local changes. By default they use the main (or master) branch. To target a different branch, use `-b` and make sure it has been pushed first.

## Creating Agent Tasks

```bash
# Run a prompt with the default agent
netlify agents:create "Add a contact form"

# Choose a specific agent: claude, codex, or gemini
netlify agents:create --prompt "Add dark mode" --agent claude
netlify agents:create -p "Update the README" -a codex
netlify agents:create -p "Write unit tests" -a gemini

# Target a specific branch
netlify agents:create -p "Fix the login bug" -a claude -b feature-branch

# Specify a project by name (if not in a linked directory)
netlify agents:create "Add tests" --project my-site-name

# Output result as JSON
netlify agents:create "Add a footer" --json
```

### Options

| Flag | Description |
|------|-------------|
| `-a, --agent <agent>` | Agent type: `claude`, `codex`, or `gemini` |
| `-p, --prompt <prompt>` | The prompt for the agent to execute |
| `-b, --branch <branch>` | Git branch to work on |
| `-m, --model <model>` | Model to use for the agent |
| `--project <project>` | Project ID or name |
| `--json` | Output result as JSON |

## Managing Agent Tasks

### List tasks

```bash
# List all tasks for the current site
netlify agents:list

# Filter by status
netlify agents:list --status running
netlify agents:list --status done
netlify agents:list --status error

# Output as JSON
netlify agents:list --json
```

Status values: `new`, `running`, `done`, `error`, `cancelled`.

### Show task details

```bash
netlify agents:show <task-id>
netlify agents:show <task-id> --json
```

### Stop a running task

```bash
netlify agents:stop <task-id>
```

## Using as an Agent

If you are an AI agent, you can use `netlify agents:create` to delegate work to a different model. This is useful for:

- **Cross-validation** — get a second opinion on your implementation from a different model
- **Edge case discovery** — another model may catch issues you missed
- **Alternative approaches** — see how a different model would solve the same problem
- **Parallel work** — delegate independent tasks while you continue on other work

**IMPORTANT:** Agent tasks incur cost for the user. You MUST ask the user for explicit permission before running any `netlify agents:create` command. Explain what you want to run, which agent you want to use, and why. Never run these commands without the user's approval.
