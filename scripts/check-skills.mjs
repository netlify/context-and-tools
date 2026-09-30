#!/usr/bin/env node
// check-skills — verifies every skill reaches every generated surface.
//
// The build scripts (cursor, codex, agent-plugin, gemini-extension) only take
// `skills/netlify-*/` directories and only carry SKILL.md plus references/
// (Cursor: flat references/*.md only); anything else is dropped without a
// message. And skills/CLAUDE.md is hand-written, yet it is the source of
// Cursor's router rule and codex/AGENTS.md, so a skill missing from it is
// invisible to both. This fails the PR instead of letting either happen.
//
// Layout rules
//   - skills/ holds only CLAUDE.md and directories named netlify-<name>, each
//     containing SKILL.md.
//   - A skill dir holds only SKILL.md and optionally references/.
//   - references/ holds only regular *.md files (no subdirectories).
//   - No symlinks anywhere. .DS_Store is ignored at every level.
// Router rules (skills/CLAUDE.md)
//   - Every skill dir is referenced as `netlify-x/SKILL.md` (backticked, the
//     form build-codex-skills.sh recognizes).
//   - Every backticked `netlify-x/...` path resolves under skills/.
//
// Every problem is reported, then exit 1; otherwise one summary line, exit 0.
// With GITHUB_ACTIONS=true each problem is prefixed with ::error::.
//
// Zero dependencies, Node 18+.
//
// Usage:
//   node scripts/check-skills.mjs [--skills-dir <path>]
//
// Options:
//   --skills-dir <path>   Skills directory to check. Default: skills

import fs from 'node:fs';
import path from 'node:path';

const SKILL_NAME = /^netlify-[a-z0-9-]+$/;
const ROUTER_PATH = /`(netlify-[a-z0-9-]+\/[^`]*)`/g;

function parseArgs(argv) {
  const opts = { skillsDir: 'skills' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--skills-dir': opts.skillsDir = argv[++i]; break;
      default:
        fail(`unknown argument: ${arg}`);
    }
  }
  if (!opts.skillsDir) fail('--skills-dir requires a path');
  return opts;
}

function fail(msg) {
  console.error(`check-skills: ${msg}`);
  process.exit(1);
}

// Dirents (not stat) so a symlink is seen as a symlink, never followed.
function entries(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.name !== '.DS_Store');
}

function checkLayout(skillsDir, problems) {
  const skills = [];
  for (const top of entries(skillsDir)) {
    if (top.isSymbolicLink()) {
      problems.push(`${top.name} is a symlink — the build scripts' cp would follow or copy it inconsistently; replace it with real files`);
    } else if (top.isFile() && top.name === 'CLAUDE.md') {
      continue;
    } else if (!top.isDirectory() || !SKILL_NAME.test(top.name)) {
      problems.push(`${top.name} is not CLAUDE.md or a netlify-<name> skill directory — every build script skips it, so it reaches no surface`);
    } else {
      skills.push(top.name);
      checkSkill(skillsDir, top.name, problems);
    }
  }
  return skills;
}

function checkSkill(skillsDir, name, problems) {
  const dir = path.join(skillsDir, name);
  let hasSkillMd = false;
  for (const e of entries(dir)) {
    if (e.isSymbolicLink()) {
      problems.push(`${name}/${e.name} is a symlink — the build scripts' cp would follow or copy it inconsistently; replace it with real files`);
    } else if (e.name === 'SKILL.md' && e.isFile()) {
      hasSkillMd = true;
    } else if (e.name === 'references' && e.isDirectory()) {
      checkReferences(dir, name, problems);
    } else {
      problems.push(`${name}/${e.name} is not SKILL.md or references/ — the build scripts only carry those, so Cursor, Codex, and the agent plugin drop it`);
    }
  }
  if (!hasSkillMd) {
    problems.push(`${name} has no SKILL.md — the build scripts skip it, so it reaches no surface`);
  }
}

function checkReferences(dir, name, problems) {
  for (const e of entries(path.join(dir, 'references'))) {
    const rel = `${name}/references/${e.name}`;
    if (e.isSymbolicLink()) {
      problems.push(`${rel} is a symlink — the build scripts' cp would follow or copy it inconsistently; replace it with a real file`);
    } else if (e.isDirectory()) {
      problems.push(`${rel} is a subdirectory — Cursor only carries flat references/*.md, so its contents are dropped; flatten it`);
    } else if (!e.isFile() || !e.name.endsWith('.md')) {
      problems.push(`${rel} is not a .md file — Cursor only carries flat references/*.md, so it is dropped`);
    }
  }
}

function checkRouter(skillsDir, skills, problems) {
  const router = path.join(skillsDir, 'CLAUDE.md');
  if (!fs.existsSync(router)) {
    problems.push(`${router} is missing — Cursor's router rule and codex/AGENTS.md are built from it, so no skill is listed there`);
    return;
  }
  const text = fs.readFileSync(router, 'utf8');
  for (const name of skills) {
    if (!text.includes(`\`${name}/SKILL.md\``)) {
      problems.push(`${name} is not referenced in ${router} — Cursor's router rule and codex/AGENTS.md will not list it; add a line pointing at \`${name}/SKILL.md\``);
    }
  }
  for (const [, ref] of text.matchAll(ROUTER_PATH)) {
    if (!fs.existsSync(path.join(skillsDir, ref))) {
      problems.push(`${router} references \`${ref}\`, which does not exist — the router in Cursor and codex/AGENTS.md points at a missing file; fix or remove the line`);
    }
  }
}

function main() {
  const { skillsDir } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
    fail(`${skillsDir} is not a directory`);
  }

  const problems = [];
  const skills = checkLayout(skillsDir, problems);
  checkRouter(skillsDir, skills, problems);

  if (problems.length > 0) {
    const prefix = process.env.GITHUB_ACTIONS === 'true' ? '::error::' : '';
    for (const p of problems) console.error(`${prefix}${p}`);
    process.exit(1);
  }
  console.log(`check-skills: ${skills.length} skills OK`);
}

main();
