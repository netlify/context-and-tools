#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
OUTPUT_DIR="$REPO_ROOT/cursor/rules"

# Clean and recreate output directory
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Convert a SKILL.md to a Cursor .mdc rule file
convert_skill() {
  local skill_file="$1"
  local output_name="$2"

  # Extract description from YAML frontmatter
  local description
  description=$(awk '/^---$/{n++; next} n==1 && /^description:/{sub(/^description: */, ""); print}' "$skill_file")

  # Extract body (everything after the closing --- of frontmatter)
  local body
  body=$(awk 'BEGIN{n=0} /^---$/{n++; next} n>=2{print}' "$skill_file")

  cat > "$OUTPUT_DIR/$output_name.mdc" <<EOF
---
description: ${description}
alwaysApply: false
---
${body}
EOF
}

# Convert a reference markdown file to a Cursor .mdc rule file
convert_reference() {
  local ref_file="$1"
  local skill_name="$2"
  local ref_basename
  ref_basename=$(basename "$ref_file" .md)
  local output_name="${skill_name}-${ref_basename}"

  # Use the first heading as a basis for the description
  local title
  title=$(awk '/^# /{sub(/^# */, ""); print; exit}' "$ref_file")

  cat > "$OUTPUT_DIR/$output_name.mdc" <<EOF
---
description: ${title}. Reference for the ${skill_name} skill.
alwaysApply: false
---
$(cat "$ref_file")
EOF
}

# --- Convert skills ---
for skill_dir in "$SKILLS_DIR"/netlify-*/; do
  skill_file="$skill_dir/SKILL.md"
  [ -f "$skill_file" ] || continue

  skill_name=$(basename "$skill_dir")
  convert_skill "$skill_file" "$skill_name"

  # Convert any reference files
  if [ -d "$skill_dir/references" ]; then
    for ref_file in "$skill_dir"/references/*.md; do
      [ -f "$ref_file" ] || continue
      convert_reference "$ref_file" "$skill_name"
    done
  fi
done

# --- Convert the CLAUDE.md router ---
if [ -f "$SKILLS_DIR/CLAUDE.md" ]; then
  cat > "$OUTPUT_DIR/netlify-skills-router.mdc" <<EOF
---
description: Router for Netlify platform skills. Determines which Netlify skill to consult based on the task at hand.
alwaysApply: true
---
$(cat "$SKILLS_DIR/CLAUDE.md")
EOF
fi

echo "Built $(ls -1 "$OUTPUT_DIR"/*.mdc 2>/dev/null | wc -l | tr -d ' ') Cursor rules in $OUTPUT_DIR"
