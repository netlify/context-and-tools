#!/usr/bin/env node
// check-skills.test.mjs — zero-dependency test suite for scripts/check-skills.mjs.
//
// Builds a minimal valid skills tree in a temp dir (two skills, a router that
// lists both, one reference file), breaks one thing per test, then runs the
// check as a child process and asserts on exit status and stderr. The real
// repo skills/ is also run once as the passing baseline.
//
// Zero dependencies, Node 18+ (node:test, node:assert/strict, node:child_process).
//
// Usage: node scripts/check-skills.test.mjs   (also wired as `npm test`)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, 'check-skills.mjs');
const REPO_SKILLS = path.join(__dirname, '..', 'skills');

const ROUTER = [
  '- `netlify-alpha/SKILL.md` — alpha',
  '- `netlify-beta/SKILL.md` — beta, see `netlify-beta/references/guide.md`',
  '',
].join('\n');

function write(root, rel, content = 'x\n') {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function makeSkills() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-skills-'));
  write(root, 'CLAUDE.md', ROUTER);
  write(root, 'netlify-alpha/SKILL.md');
  write(root, 'netlify-beta/SKILL.md');
  write(root, 'netlify-beta/references/guide.md');
  return root;
}

function run(dir, env = {}) {
  const base = { ...process.env };
  delete base.GITHUB_ACTIONS;
  return spawnSync(process.execPath, [SCRIPT, '--skills-dir', dir], {
    encoding: 'utf8',
    env: { ...base, ...env },
  });
}

test('the real repo skills/ passes', () => {
  const r = run(REPO_SKILLS);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /skills OK/);
});

test('a valid fixture passes', () => {
  const r = run(makeSkills());
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /2 skills OK/);
});

test('a skill dir missing from the router fails and is named', () => {
  const root = makeSkills();
  write(root, 'netlify-gamma/SKILL.md');
  const r = run(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /netlify-gamma is not referenced/);
});

test('the router referencing a nonexistent skill fails and names it', () => {
  const root = makeSkills();
  write(root, 'CLAUDE.md', `${ROUTER}- \`netlify-ghost/SKILL.md\` — gone\n`);
  const r = run(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /netlify-ghost\/SKILL\.md/);
});

test('the router referencing a nonexistent references path fails', () => {
  const root = makeSkills();
  write(root, 'CLAUDE.md', `${ROUTER}- see \`netlify-alpha/references/missing.md\`\n`);
  const r = run(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /netlify-alpha\/references\/missing\.md/);
});

test('an extra entry in a skill dir fails', () => {
  const root = makeSkills();
  write(root, 'netlify-alpha/scripts/run.sh');
  const r = run(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /netlify-alpha\/scripts is not SKILL\.md or references/);
});

test('a subdirectory under references/ fails', () => {
  const root = makeSkills();
  write(root, 'netlify-beta/references/nested/deep.md');
  const r = run(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /netlify-beta\/references\/nested is a subdirectory/);
});

test('a non-.md file under references/ fails', () => {
  const root = makeSkills();
  write(root, 'netlify-beta/references/data.json');
  const r = run(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /netlify-beta\/references\/data\.json is not a \.md file/);
});

test('a top-level skill dir not named netlify-* fails', () => {
  const root = makeSkills();
  write(root, 'other-skill/SKILL.md');
  const r = run(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /other-skill is not CLAUDE\.md or a netlify-<name>/);
});

test('a netlify-* dir with no SKILL.md fails, and its router gap is reported too', () => {
  const root = makeSkills();
  write(root, 'netlify-empty/references/a.md');
  const r = run(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /netlify-empty has no SKILL\.md/);
  assert.match(r.stderr, /netlify-empty is not referenced/);
});

test('a symlink inside a skill dir fails', () => {
  const root = makeSkills();
  fs.symlinkSync(path.join(root, 'netlify-alpha', 'SKILL.md'), path.join(root, 'netlify-alpha', 'link.md'));
  const r = run(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /netlify-alpha\/link\.md is a symlink/);
});

test('a missing skills/CLAUDE.md fails', () => {
  const root = makeSkills();
  fs.rmSync(path.join(root, 'CLAUDE.md'));
  const r = run(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /CLAUDE\.md is missing/);
});

test('.DS_Store files are ignored at every level', () => {
  const root = makeSkills();
  write(root, '.DS_Store');
  write(root, 'netlify-alpha/.DS_Store');
  write(root, 'netlify-beta/references/.DS_Store');
  const r = run(root);
  assert.equal(r.status, 0, r.stderr);
});

test('two problems in one fixture are both reported in one run', () => {
  const root = makeSkills();
  write(root, 'netlify-gamma/SKILL.md');
  write(root, 'netlify-alpha/scripts/run.sh');
  const r = run(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /netlify-gamma is not referenced/);
  assert.match(r.stderr, /netlify-alpha\/scripts is not SKILL\.md or references/);
});

test('on Actions each problem is prefixed with ::error::', () => {
  const root = makeSkills();
  write(root, 'netlify-gamma/SKILL.md');
  const r = run(root, { GITHUB_ACTIONS: 'true' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^::error::netlify-gamma is not referenced/m);
});
