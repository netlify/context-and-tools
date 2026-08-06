#!/usr/bin/env bash
set -euo pipefail

# Builds the Agent Plugins spec-compliant package under agent-plugin/.
# Spec: https://agent-plugins.org/specification (v1.0.0)
#
# Source of truth is skills/. This script mirrors skills/ into
# agent-plugin/skills/ so the package stays a self-contained, spec-compliant
# plugin directory. The hand-authored files at the plugin root
# (plugin.json, mcp.json, README.md, LICENSE, CHANGELOG.md) are NOT touched.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
PLUGIN_DIR="$REPO_ROOT/agent-plugin"
OUTPUT_DIR="$PLUGIN_DIR/skills"

# Clean and recreate only the generated skills/ tree (fixed location per spec).
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# --- Copy skills (each immediate child of skills/ with a SKILL.md) ---
count=0
for skill_dir in "$SKILLS_DIR"/netlify-*/; do
  [ -f "$skill_dir/SKILL.md" ] || continue

  skill_name=$(basename "$skill_dir")
  dest="$OUTPUT_DIR/$skill_name"
  mkdir -p "$dest"

  cp "$skill_dir/SKILL.md" "$dest/SKILL.md"

  if [ -d "$skill_dir/references" ]; then
    cp -r "$skill_dir/references" "$dest/references"
  fi

  count=$((count + 1))
done

echo "Copied $count skills to $OUTPUT_DIR"
