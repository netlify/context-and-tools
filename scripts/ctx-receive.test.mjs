#!/usr/bin/env node
// ctx-receive.test.mjs — zero-dependency test suite for scripts/ctx-receive.mjs (AX-136).
//
// Every subtest builds its own throwaway fixture: a fake docs checkout
// (agent-context/<grouping>/manifest.json + skill/**) and a fake consumer repo
// (.ctx-gen/config.json, state.json, skills/), runs ctx-receive.mjs against it as a child
// process, and asserts on stdout/stderr, exit status, the resulting skills/ tree, state.json,
// and the GITHUB_OUTPUT contract. Fixtures are never shared, so cases pass in any order.
//
// Covers the docs#801 shape this fixes: a hand edit to skill/SKILL.md and
// skill/references/*.md that does NOT touch manifest.json must still import — the delta is
// treeDiffers(), never source_hash. Also covers the inverse: context.md/system.md move
// upstream while skill/** is byte-identical → a [warn], fired once, never a failure.
//
// Zero dependencies, Node 18+ (node:test, node:assert/strict, node:child_process, node:crypto).
//
// Usage: node scripts/ctx-receive.test.mjs   (also wired as `npm test`)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, 'ctx-receive.mjs');

const GROUPING = 'widgets';
const SKILL_NAME = 'netlify-widgets';
const DEFAULT_GROUPINGS = [{ grouping: GROUPING, skill: SKILL_NAME }];
const SOURCE_HASH = 'a'.repeat(64);
// Kept distinct so a test can tell which one landed in state.json.
const DOCS_COMMIT = 'docs-commit-1';
const MANIFEST_COMMIT = 'manifest-commit-1';

function skillMdFor(skillName) {
  return `---
name: ${skillName}
description: A test skill for the ${skillName} grouping.
---

# ${skillName}

Body content for the ${skillName} skill.
`;
}

const SKILL_MD = skillMdFor(SKILL_NAME);

const REFERENCE_MD = `# Widgets reference

Some reference detail.
`;

// The docs-side intermediates the skill is generated from. Never imported; only hashed.
const CONTEXT_MD = `# Widgets context

Distilled docs the skill is generated from.
`;

const SYSTEM_MD = `# Widgets system

Generation instructions for the widgets skill.
`;

function writeIntermediates(groupingDir, { contextMd = CONTEXT_MD, systemMd = SYSTEM_MD } = {}) {
  fs.writeFileSync(path.join(groupingDir, 'context.md'), contextMd);
  fs.writeFileSync(path.join(groupingDir, 'system.md'), systemMd);
}

function removeIntermediates(groupingDir) {
  fs.rmSync(path.join(groupingDir, 'context.md'));
  fs.rmSync(path.join(groupingDir, 'system.md'));
}

// Mirrors hashIntermediates() in the script — the state.json field is a contract, so the
// scheme is pinned here rather than imported.
function expectedIntermediateHash({ contextMd = CONTEXT_MD, systemMd = SYSTEM_MD } = {}) {
  const hash = crypto.createHash('sha256');
  hash.update('context.md\0');
  hash.update(contextMd);
  hash.update('\0');
  hash.update('system.md\0');
  hash.update(systemMd);
  hash.update('\0');
  return hash.digest('hex');
}

function writeSkillTree(
  skillDir,
  { skillName = SKILL_NAME, skillMd = skillMdFor(skillName), referenceMd = REFERENCE_MD } = {},
) {
  fs.mkdirSync(path.join(skillDir, 'references'), { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMd);
  fs.writeFileSync(path.join(skillDir, 'references', 'widgets.md'), referenceMd);
}

function writeManifest(manifestPath, { sourceHash = SOURCE_HASH, commit = MANIFEST_COMMIT } = {}) {
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
// wired together via config.json, matching the shape ctx-receive.mjs expects. `groupings`
// is the config.json mapping list; every entry gets a manifest and a skill tree whose
// SKILL.md declares the mapped name, plus context.md/system.md intermediates. `groupingDir`
// and `skillSrc` point at the first entry — the one every single-grouping case edits.
function buildFixture(groupings = DEFAULT_GROUPINGS) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-receive-test-'));
  const docsDir = path.join(root, 'docs');
  const repoDir = path.join(root, 'repo');

  for (const { grouping, skill } of groupings) {
    const dir = path.join(docsDir, 'agent-context', grouping);
    writeSkillTree(path.join(dir, 'skill'), { skillName: skill });
    writeIntermediates(dir);
    writeManifest(path.join(dir, 'manifest.json'));
  }

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
        groupings,
      },
      null,
      2,
    ) + '\n',
  );
  fs.writeFileSync(statePath, '{}\n');

  const groupingDir = path.join(docsDir, 'agent-context', groupings[0].grouping);
  const skillSrc = path.join(groupingDir, 'skill');
  return { root, docsDir, configPath, statePath, skillsDir, groupingDir, skillSrc };
}

function removeFixture(fixture) {
  fs.rmSync(fixture.root, { recursive: true, force: true });
}

// Spawns ctx-receive.mjs against a fixture with a fresh GITHUB_OUTPUT file (one per fixture
// root; truncated on every invocation). Never throws on a non-zero exit — run() and
// runExpectFailure() decide what status they expect. `docsCommit: null` omits the
// --docs-commit flag entirely; `env` is merged over process.env.
function invoke(fixture, { docsCommit = DOCS_COMMIT, args = [], env = {} } = {}) {
  const outputPath = path.join(fixture.root, 'github-output');
  fs.writeFileSync(outputPath, '');

  const argv = [
    SCRIPT,
    '--docs', fixture.docsDir,
    ...(docsCommit ? ['--docs-commit', docsCommit] : []),
    '--config', fixture.configPath,
    '--state', fixture.statePath,
    '--skills-dir', fixture.skillsDir,
    ...args,
  ];
  const { status, stdout, stderr } = spawnSync('node', argv, {
    env: { ...process.env, ...env, GITHUB_OUTPUT: outputPath },
    encoding: 'utf8',
  });
  return { status, stdout, stderr, outputPath };
}

function describeRun({ status, stdout, stderr }) {
  return `exit ${status}\nstdout:\n${stdout}\nstderr:\n${stderr}`;
}

// Runs ctx-receive.mjs expecting exit 0. Returns stdout plus the parsed GITHUB_OUTPUT
// contract (`changed` as an array, `changed_count` as a number).
function run(fixture, opts) {
  const result = invoke(fixture, opts);
  assert.equal(result.status, 0, `ctx-receive failed: ${describeRun(result)}`);

  const raw = fs.readFileSync(result.outputPath, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  const changedLine = lines.find((l) => l.startsWith('changed='));
  const countLine = lines.find((l) => l.startsWith('changed_count='));
  assert.ok(changedLine, `GITHUB_OUTPUT missing changed= line:\n${raw}`);
  assert.ok(countLine, `GITHUB_OUTPUT missing changed_count= line:\n${raw}`);
  const changed = changedLine.slice('changed='.length).split(',').filter(Boolean);
  const changedCount = Number(countLine.slice('changed_count='.length));

  return { stdout: result.stdout, changed, changedCount };
}

// Runs ctx-receive.mjs expecting the fail() exit code. Returns { stdout, stderr }.
function runExpectFailure(fixture, opts) {
  const { status, stdout, stderr } = invoke(fixture, opts);
  assert.equal(status, 1, `expected ctx-receive to exit 1: ${describeRun({ status, stdout, stderr })}`);
  return { stdout, stderr };
}

function readState(fixture) {
  return JSON.parse(fs.readFileSync(fixture.statePath, 'utf8'));
}

function skillFile(fixture, ...segments) {
  return path.join(fixture.skillsDir, SKILL_NAME, ...segments);
}

function readSkillBytes(fixture, ...segments) {
  return fs.readFileSync(skillFile(fixture, ...segments));
}

// The docs#801 shape: SKILL.md and a references/*.md file are hand-edited upstream, but
// manifest.json (and its generation.source_hash) is never touched.
const editedSkillMd = SKILL_MD + '\n<!-- hand edit: docs#801 shape -->\n';
const editedReferenceMd = `${REFERENCE_MD}\nHand-edited detail that never touched manifest.json.\n`;

function handEditUpstream(fixture) {
  writeSkillTree(fixture.skillSrc, { skillMd: editedSkillMd, referenceMd: editedReferenceMd });
}

test('ctx-receive: byte-diff import delta', async (t) => {
  await t.test('first import: grouping imported, bytes match source, state written', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

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

    // Exact shape: per-grouping provenance plus the top-level ordering key
    // (lastImportedCommit, covered in ctx-receive-ordering.test.mjs), and
    // --docs-commit wins over the manifest's generated_from.commit.
    const state = readState(fixture);
    assert.match(state[GROUPING].intermediateHash, /^[0-9a-f]{64}$/);
    assert.deepEqual(state, {
      [GROUPING]: {
        sourceHash: SOURCE_HASH,
        docsCommit: DOCS_COMMIT,
        affects: ['examples'],
        intermediateHash: expectedIntermediateHash(),
      },
      lastImportedCommit: DOCS_COMMIT,
    });
  });

  await t.test('--docs-commit omitted: docsCommit falls back to the manifest commit', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    // An earlier version crashed on `.slice()` of null here; pin that it stays fixed.
    const result = run(fixture, { docsCommit: null });

    assert.match(result.stdout, /\[import\] widgets .*first import/);
    assert.equal(result.changedCount, 1);
    assert.equal(readState(fixture)[GROUPING].docsCommit, MANIFEST_COMMIT);
  });

  await t.test('identical re-dispatch: no changes reported, no import', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    run(fixture);
    const stateAfterFirstImport = readState(fixture);

    const result = run(fixture);

    assert.match(result.stdout, /\[skip\] widgets: surface identical/);
    assert.deepEqual(result.changed, []);
    assert.equal(result.changedCount, 0);
    assert.deepEqual(readState(fixture), stateAfterFirstImport);
  });

  await t.test('hand edit, --dry-run: reports import, writes nothing', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    run(fixture);
    const stateAfterFirstImport = readState(fixture);
    handEditUpstream(fixture);

    const result = run(fixture, { args: ['--dry-run'] });

    assert.match(result.stdout, /\[import\] widgets .*surface differs, source_hash unchanged/);
    assert.deepEqual(result.changed, [GROUPING]);
    assert.equal(result.changedCount, 1);

    // Dry-run reports the delta but must not touch skills/ or state.json.
    assert.deepEqual(readSkillBytes(fixture, 'SKILL.md'), Buffer.from(SKILL_MD));
    assert.deepEqual(readState(fixture), stateAfterFirstImport);
  });

  await t.test('hand edit propagates: grouping changed, edit lands in skills/, state updated', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    run(fixture);
    handEditUpstream(fixture);

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

  await t.test('path-set change: an added upstream file imports, and its removal propagates', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    run(fixture);

    const extraSrc = path.join(fixture.skillSrc, 'references', 'extra.md');
    fs.writeFileSync(extraSrc, '# Extra\n');
    const added = run(fixture);
    assert.match(added.stdout, /\[import\] widgets /);
    assert.equal(added.changedCount, 1);
    assert.deepEqual(readSkillBytes(fixture, 'references', 'extra.md'), Buffer.from('# Extra\n'));

    fs.rmSync(extraSrc);
    const removed = run(fixture);
    assert.match(removed.stdout, /\[import\] widgets /);
    assert.equal(removed.changedCount, 1);
    assert.equal(fs.existsSync(skillFile(fixture, 'references', 'extra.md')), false);
  });

  await t.test('missing skill/SKILL.md skips only that grouping', (t) => {
    const other = { grouping: 'gadgets', skill: 'netlify-gadgets' };
    const fixture = buildFixture([...DEFAULT_GROUPINGS, other]);
    t.after(() => removeFixture(fixture));

    fs.rmSync(path.join(fixture.docsDir, 'agent-context', other.grouping, 'skill', 'SKILL.md'));

    const result = run(fixture);

    assert.match(result.stdout, /\[skip\] gadgets: .*SKILL\.md is missing/);
    assert.match(result.stdout, /\[import\] widgets .*first import/);
    assert.deepEqual(result.changed, [GROUPING]);
    assert.equal(result.changedCount, 1);
    assert.equal(fs.existsSync(skillFile(fixture, 'SKILL.md')), true);
    assert.equal(fs.existsSync(path.join(fixture.skillsDir, other.skill)), false);
  });

  // The skip above is only for a grouping that was never imported. Once one has been, an
  // upstream deletion of SKILL.md must fail the run, not go green with a stale skills/<name>.
  await t.test('missing skill/SKILL.md after a prior import: fails, stale skill left untouched', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    run(fixture);
    fs.rmSync(path.join(fixture.skillSrc, 'SKILL.md'));

    const result = runExpectFailure(fixture);

    assert.match(result.stderr, /imported before/);
    assert.deepEqual(readSkillBytes(fixture, 'SKILL.md'), Buffer.from(SKILL_MD));
  });

  await t.test('missing skill/SKILL.md with skills/<name> on disk but no state entry: fails', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    writeSkillTree(path.join(fixture.skillsDir, SKILL_NAME));
    fs.rmSync(path.join(fixture.skillSrc, 'SKILL.md'));

    const result = runExpectFailure(fixture);

    assert.match(result.stderr, /imported before/);
  });

  await t.test('symlink in the source tree: run fails loudly', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    run(fixture);
    fs.symlinkSync('widgets.md', path.join(fixture.skillSrc, 'references', 'link.md'));

    const result = runExpectFailure(fixture);

    assert.match(result.stderr, /link\.md: symlinks and other non-regular entries are not supported/);
  });

  // The first-import path short-circuits on a missing destination; the source tree must
  // still be validated before that, or cpSync would copy the symlink into skills/.
  await t.test('symlink in the source tree on first import: fails, nothing copied', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    fs.symlinkSync('widgets.md', path.join(fixture.skillSrc, 'references', 'link.md'));

    const result = runExpectFailure(fixture);

    assert.match(result.stderr, /link\.md: .*not supported/);
    assert.equal(fs.existsSync(path.join(fixture.skillsDir, SKILL_NAME)), false);
  });

  await t.test('skill/ itself is a symlink: fails even though SKILL.md resolves', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    const realDir = path.join(fixture.root, 'real-skill');
    fs.renameSync(fixture.skillSrc, realDir);
    fs.symlinkSync(realDir, fixture.skillSrc, 'dir');

    const result = runExpectFailure(fixture);

    assert.match(result.stderr, /skill: not a directory .*not supported/);
    assert.equal(fs.existsSync(path.join(fixture.skillsDir, SKILL_NAME)), false);
  });

  await t.test('executable bit: a chmod upstream imports and the mode is copied', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    run(fixture);
    assert.equal(fs.statSync(skillFile(fixture, 'SKILL.md')).mode & 0o111, 0);

    fs.chmodSync(path.join(fixture.skillSrc, 'SKILL.md'), 0o755);
    const result = run(fixture);

    assert.match(result.stdout, /\[import\] widgets /);
    assert.equal(result.changedCount, 1);
    assert.notEqual(fs.statSync(skillFile(fixture, 'SKILL.md')).mode & 0o111, 0);
  });

  await t.test('destination is a regular file: replaced by the imported tree', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    fs.writeFileSync(path.join(fixture.skillsDir, SKILL_NAME), 'not a directory\n');

    const result = run(fixture);

    assert.match(result.stdout, /\[import\] widgets /);
    assert.equal(result.changedCount, 1);
    assert.equal(fs.statSync(path.join(fixture.skillsDir, SKILL_NAME)).isDirectory(), true);
    assert.deepEqual(readSkillBytes(fixture, 'SKILL.md'), Buffer.from(SKILL_MD));
  });

  // Intermediates moved upstream but skill/ did not: the skill may not have been
  // regenerated. Warn once, import nothing, never fail.
  const editedContextMd = `${CONTEXT_MD}\nEdited upstream without regenerating the skill.\n`;

  await t.test('intermediate drift, identical skill: warns once, imports nothing, hash updated', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    run(fixture);
    writeIntermediates(fixture.groupingDir, { contextMd: editedContextMd });

    const drift = run(fixture);
    assert.match(drift.stdout, /\[warn\] widgets: context\.md\/system\.md changed upstream/);
    assert.match(drift.stdout, /\[skip\] widgets: surface identical/);
    assert.deepEqual(drift.changed, []);
    assert.equal(drift.changedCount, 0);
    assert.equal(
      readState(fixture)[GROUPING].intermediateHash,
      expectedIntermediateHash({ contextMd: editedContextMd }),
    );

    // Nothing moved since: the warning must not repeat.
    const again = run(fixture);
    assert.doesNotMatch(again.stdout, /\[warn\]/);
    assert.equal(again.changedCount, 0);
  });

  await t.test('intermediate drift with a skill edit: imports, no warning, hash updated', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    run(fixture);
    writeIntermediates(fixture.groupingDir, { contextMd: editedContextMd });
    handEditUpstream(fixture);

    const result = run(fixture);

    assert.match(result.stdout, /\[import\] widgets /);
    assert.doesNotMatch(result.stdout, /\[warn\]/);
    assert.equal(result.changedCount, 1);
    assert.equal(
      readState(fixture)[GROUPING].intermediateHash,
      expectedIntermediateHash({ contextMd: editedContextMd }),
    );
  });

  await t.test('legacy state entry without intermediateHash: seeded silently, no warning', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    run(fixture);
    const legacy = readState(fixture);
    delete legacy[GROUPING].intermediateHash;
    fs.writeFileSync(fixture.statePath, JSON.stringify(legacy, null, 2) + '\n');

    const result = run(fixture);

    assert.doesNotMatch(result.stdout, /\[warn\]/);
    assert.equal(result.changedCount, 0);
    assert.equal(readState(fixture)[GROUPING].intermediateHash, expectedIntermediateHash());
  });

  await t.test('intermediate drift, --dry-run: warns, state file untouched', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    run(fixture);
    const stateBytes = fs.readFileSync(fixture.statePath);
    writeIntermediates(fixture.groupingDir, { systemMd: `${SYSTEM_MD}\nEdited.\n` });

    const result = run(fixture, { args: ['--dry-run'] });

    assert.match(result.stdout, /\[warn\] widgets: context\.md\/system\.md changed upstream/);
    assert.equal(result.changedCount, 0);
    assert.deepEqual(fs.readFileSync(fixture.statePath), stateBytes);
  });

  await t.test('intermediate drift under GITHUB_ACTIONS: also emits a run annotation', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    run(fixture);
    writeIntermediates(fixture.groupingDir, { contextMd: editedContextMd });

    const result = run(fixture, { env: { GITHUB_ACTIONS: 'true' } });

    assert.match(result.stdout, /\[warn\] widgets: /);
    assert.match(result.stdout, /::warning title=ctx-receive::widgets: context\.md\/system\.md changed upstream/);
  });

  // hashIntermediates() returns null when neither file exists; a stored hash moving to null
  // is drift too, and null → null is not a move.
  await t.test('both intermediates deleted upstream, identical skill: warns once, hash null', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    run(fixture);
    removeIntermediates(fixture.groupingDir);

    const drift = run(fixture);
    assert.match(
      drift.stdout,
      /\[warn\] widgets: context\.md\/system\.md changed upstream \([0-9a-f]{12} → none\)/,
    );
    assert.equal(drift.changedCount, 0);
    assert.equal(readState(fixture)[GROUPING].intermediateHash, null);

    const again = run(fixture);
    assert.doesNotMatch(again.stdout, /\[warn\]/);
    assert.equal(again.changedCount, 0);
  });

  await t.test('no intermediates from the start: imports with a null hash, never warns', (t) => {
    const fixture = buildFixture();
    t.after(() => removeFixture(fixture));

    removeIntermediates(fixture.groupingDir);

    const first = run(fixture);
    assert.match(first.stdout, /\[import\] widgets .*first import/);
    assert.equal(first.changedCount, 1);
    assert.equal(readState(fixture)[GROUPING].intermediateHash, null);

    const again = run(fixture);
    assert.doesNotMatch(again.stdout, /\[warn\]/);
    assert.equal(again.changedCount, 0);
  });
});
