#!/usr/bin/env node
// ctx-receive.test.mjs — zero-dependency test suite for scripts/ctx-receive.mjs (AX-136).
//
// Builds a throwaway fixture: a fake docs checkout (agent-context/<grouping>/manifest.json
// + skill/**) and a fake consumer repo (.ctx-gen/config.json, state.json, skills/), then
// runs ctx-receive.mjs against it as a child process and asserts on stdout, the resulting
// skills/ tree, state.json, and the GITHUB_OUTPUT contract.
//
// Covers the docs#801 shape this fixes: a hand edit to skill/SKILL.md and
// skill/references/*.md that does NOT touch manifest.json must still import — the delta is
// treeDiffers(), never source_hash.
//
// Zero dependencies, Node 18+ (node:test, node:assert/strict, node:child_process).
//
// Usage: node scripts/ctx-receive.test.mjs   (also wired as `npm test`)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, 'ctx-receive.mjs');

const GROUPING = 'widgets';
const SKILL_NAME = 'netlify-widgets';
const SOURCE_HASH = 'a'.repeat(64);

const SKILL_MD = `---
name: ${SKILL_NAME}
description: A test skill for the widgets grouping.
---

# Widgets

Body content for the widgets skill.
`;

const REFERENCE_MD = `# Widgets reference

Some reference detail.
`;

function writeSkillTree(skillDir, { skillMd = SKILL_MD, referenceMd = REFERENCE_MD } = {}) {
  fs.mkdirSync(path.join(skillDir, 'references'), { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMd);
  fs.writeFileSync(path.join(skillDir, 'references', 'widgets.md'), referenceMd);
}

function writeManifest(manifestPath, { sourceHash = SOURCE_HASH, commit = 'docs-commit-1' } = {}) {
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generation: { source_hash: sourceHash },
        generated_from: { commit },
        changes: [{ affects: ['examples'] }],
      },
      null,
      2,
    ) + '\n',
  );
}

// Builds a fresh fixture: a fake docs checkout (docsDir) + a fake consumer repo (repoDir),
// wired together via config.json, matching the shape ctx-receive.mjs expects.
function buildFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-receive-test-'));
  const docsDir = path.join(root, 'docs');
  const repoDir = path.join(root, 'repo');

  const groupingDir = path.join(docsDir, 'agent-context', GROUPING);
  const skillSrc = path.join(groupingDir, 'skill');
  writeSkillTree(skillSrc);
  writeManifest(path.join(groupingDir, 'manifest.json'));

  const configPath = path.join(repoDir, '.ctx-gen', 'config.json');
  const statePath = path.join(repoDir, '.ctx-gen', 'state.json');
  const skillsDir = path.join(repoDir, 'skills');
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        source: { agentContextDir: 'agent-context' },
        importerVersion: 1,
        groupings: [{ grouping: GROUPING, skill: SKILL_NAME }],
      },
      null,
      2,
    ) + '\n',
  );
  fs.writeFileSync(statePath, '{}\n');

  return { root, docsDir, repoDir, configPath, statePath, skillsDir, groupingDir, skillSrc };
}

let runCount = 0;

// Runs ctx-receive.mjs against a fixture as a child process. Returns stdout plus the parsed
// GITHUB_OUTPUT contract (`changed` as an array, `changed_count` as a number).
function run(fixture, extraArgs = [], { docsCommit = 'docs-commit-1' } = {}) {
  runCount += 1;
  const outputPath = path.join(fixture.root, `github-output-${runCount}`);
  fs.writeFileSync(outputPath, '');

  const args = [
    SCRIPT,
    '--docs', fixture.docsDir,
    '--docs-commit', docsCommit,
    '--config', fixture.configPath,
    '--state', fixture.statePath,
    '--skills-dir', fixture.skillsDir,
    ...extraArgs,
  ];
  const stdout = execFileSync('node', args, {
    env: { ...process.env, GITHUB_OUTPUT: outputPath },
    encoding: 'utf8',
  });

  const raw = fs.readFileSync(outputPath, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  const changedLine = lines.find((l) => l.startsWith('changed='));
  const countLine = lines.find((l) => l.startsWith('changed_count='));
  assert.ok(changedLine, `GITHUB_OUTPUT missing changed= line:\n${raw}`);
  assert.ok(countLine, `GITHUB_OUTPUT missing changed_count= line:\n${raw}`);
  const changed = changedLine.slice('changed='.length).split(',').filter(Boolean);
  const changedCount = Number(countLine.slice('changed_count='.length));
  const stateLine = lines.find((l) => l.startsWith('state_changed='));
  assert.ok(stateLine, `GITHUB_OUTPUT missing state_changed= line:\n${raw}`);
  const stateChanged = stateLine.slice('state_changed='.length) === 'true';

  return { stdout, raw, changed, changedCount, stateChanged };
}

function readState(fixture) {
  return JSON.parse(fs.readFileSync(fixture.statePath, 'utf8'));
}

function readSkillBytes(fixture, ...segments) {
  return fs.readFileSync(path.join(fixture.skillsDir, SKILL_NAME, ...segments));
}

test('ctx-receive: byte-diff import delta', async (t) => {
  const fixture = buildFixture();

  await t.test('first import: grouping imported, bytes match source, state written', () => {
    const result = run(fixture);

    assert.match(result.stdout, /\[import\] widgets .*first import/);
    assert.deepEqual(result.changed, [GROUPING]);
    assert.equal(result.changedCount, 1);

    assert.deepEqual(
      readSkillBytes(fixture, 'SKILL.md'),
      fs.readFileSync(path.join(fixture.skillSrc, 'SKILL.md')),
    );
    assert.deepEqual(
      readSkillBytes(fixture, 'references', 'widgets.md'),
      fs.readFileSync(path.join(fixture.skillSrc, 'references', 'widgets.md')),
    );

    const state = readState(fixture);
    assert.equal(state[GROUPING].sourceHash, SOURCE_HASH);
    assert.equal(state[GROUPING].docsCommit, 'docs-commit-1');
    assert.equal(state[GROUPING].importerVersion, 1);
    assert.deepEqual(state[GROUPING].affects, ['examples']);
    assert.equal(state.lastImportedCommit, 'docs-commit-1');
  });

  const stateAfterFirstImport = readState(fixture);

  await t.test('identical re-dispatch, same commit: nothing moves', () => {
    const result = run(fixture);

    assert.match(result.stdout, /\[skip\] widgets: surface identical/);
    assert.deepEqual(result.changed, []);
    assert.equal(result.changedCount, 0);
    assert.equal(result.stateChanged, false);
    assert.deepEqual(readState(fixture), stateAfterFirstImport);
  });

  // The ordering key is the whole point of the split: per-grouping entries are
  // provenance and may lag, but position advances on every run. Without this,
  // the monotonicity guard reads a stale commit and can't order a later
  // dispatch against it.
  await t.test('identical re-dispatch, newer commit: position advances, provenance does not', () => {
    const result = run(fixture, [], { docsCommit: 'docs-commit-2' });

    assert.deepEqual(result.changed, []);
    assert.equal(result.changedCount, 0);
    assert.equal(result.stateChanged, true, 'ordering-only advance must be reported so the workflow commits it');
    assert.match(result.stdout, /State advanced to docs-commit/);

    const state = readState(fixture);
    assert.equal(state.lastImportedCommit, 'docs-commit-2');
    assert.equal(
      state[GROUPING].docsCommit,
      'docs-commit-1',
      'per-grouping provenance stays at the commit that actually imported it',
    );
  });

  // Restore the ordering key so later assertions compare against a known state.
  run(fixture);

  // The docs#801 shape: SKILL.md and a references/*.md file are hand-edited upstream, but
  // manifest.json (and its generation.source_hash) is never touched.
  const editedSkillMd = SKILL_MD + '\n<!-- hand edit: docs#801 shape -->\n';
  const editedReferenceMd = `${REFERENCE_MD}\nHand-edited detail that never touched manifest.json.\n`;

  await t.test('hand edit, --dry-run: reports import, writes nothing', () => {
    writeSkillTree(fixture.skillSrc, { skillMd: editedSkillMd, referenceMd: editedReferenceMd });

    const result = run(fixture, ['--dry-run']);

    assert.match(result.stdout, /\[import\] widgets .*surface differs, source_hash unchanged/);
    assert.deepEqual(result.changed, [GROUPING]);
    assert.equal(result.changedCount, 1);

    // Dry-run reports the delta but must not touch skills/ or state.json.
    assert.notDeepEqual(readSkillBytes(fixture, 'SKILL.md'), Buffer.from(editedSkillMd));
    assert.deepEqual(readState(fixture), stateAfterFirstImport);
  });

  await t.test('hand edit propagates: grouping changed, edit lands in skills/, state updated', () => {
    const result = run(fixture);

    assert.match(result.stdout, /\[import\] widgets .*surface differs, source_hash unchanged/);
    assert.deepEqual(result.changed, [GROUPING]);
    assert.equal(result.changedCount, 1);

    assert.deepEqual(readSkillBytes(fixture, 'SKILL.md'), Buffer.from(editedSkillMd));
    assert.deepEqual(
      readSkillBytes(fixture, 'references', 'widgets.md'),
      Buffer.from(editedReferenceMd),
    );

    // Provenance is rewritten even though source_hash didn't move — it's informational only.
    const state = readState(fixture);
    assert.equal(state[GROUPING].sourceHash, SOURCE_HASH);
  });

  fs.rmSync(fixture.root, { recursive: true, force: true });
});
