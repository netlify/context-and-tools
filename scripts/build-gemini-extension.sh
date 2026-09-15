#!/usr/bin/env bash
set -euo pipefail

# Rewrites the "skills" array in gemini-extension.json from skills/.
#
# Gemini CLI itself auto-discovers agent skills from the skills/ directory at
# the extension root (its manifest schema has no skills field), so this array
# is informational: it's what the extension gallery crawler and human readers
# see. It used to be hand-maintained and drifted out of sync with skills/.
# Every other key — name, version (stamped by release-please via
# release-please-config.json), mcpServers — is left untouched.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
MANIFEST="$REPO_ROOT/gemini-extension.json"

command -v jq >/dev/null 2>&1 || { echo "jq is required" >&2; exit 1; }

# Each immediate child of skills/ with a SKILL.md, as a repo-relative path.
# LC_ALL=C so the order doesn't depend on the runner's locale collation.
skill_paths=()
while IFS= read -r skill_dir; do
  [ -f "$skill_dir/SKILL.md" ] || continue
  skill_paths+=("skills/$(basename "$skill_dir")")
done < <(find "$SKILLS_DIR" -mindepth 1 -maxdepth 1 -type d | LC_ALL=C sort)

tmp="$(mktemp)"
jq --indent 2 '.skills = $ARGS.positional' "$MANIFEST" --args "${skill_paths[@]}" > "$tmp"
mv "$tmp" "$MANIFEST"

echo "Listed ${#skill_paths[@]} skills in gemini-extension.json"
