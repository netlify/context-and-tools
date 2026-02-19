#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
OUTPUT_DIR="$REPO_ROOT/codex/skills"

# Clean and recreate output directory
rm -rf "$REPO_ROOT/codex"
mkdir -p "$OUTPUT_DIR"

# --- Copy skills ---
count=0
for skill_dir in "$SKILLS_DIR"/netlify-*/; do
  [ -f "$skill_dir/SKILL.md" ] || continue

  skill_name=$(basename "$skill_dir")
  dest="$OUTPUT_DIR/$skill_name"
  mkdir -p "$dest"

  # Copy SKILL.md
  cp "$skill_dir/SKILL.md" "$dest/SKILL.md"

  # Copy references/ if present
  if [ -d "$skill_dir/references" ]; then
    cp -r "$skill_dir/references" "$dest/references"
  fi

  count=$((count + 1))
done

# --- Generate AGENTS.md from skills/CLAUDE.md ---
if [ -f "$SKILLS_DIR/CLAUDE.md" ]; then
  sed -E \
    -e 's/`(netlify-[a-z-]+)\/SKILL\.md`/`$\1`/g' \
    -e 's/`(netlify-[a-z-]+)\/references\/`/`$\1`/g' \
    -e 's/`(netlify-[a-z-]+)\/(references\/[^`]*)`/`$\1\/\2`/g' \
    "$SKILLS_DIR/CLAUDE.md" > "$REPO_ROOT/codex/AGENTS.md"
fi

echo "Copied $count skills to $OUTPUT_DIR"
echo "Generated codex/AGENTS.md"
