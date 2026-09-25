import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildManifest, hashFiles, hashTree, skillHistory, treeHashAt } from './build-manifest.mjs';
import { execFileSync } from 'node:child_process';

const script = fileURLToPath(new URL('./build-manifest.mjs', import.meta.url));
const fixed = { version: '2.3.4', commit: 'abc123', publishedAt: '2026-09-10T16:10:00Z' };

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-test-'));
  fs.mkdirSync(path.join(root, 'skills', 'netlify-alpha', 'references'), { recursive: true });
  fs.mkdirSync(path.join(root, 'skills', 'netlify-zeta'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills', 'netlify-alpha', 'SKILL.md'), '---\nname: netlify-alpha\ndescription: "Alpha skill"\n---\nAlpha\n');
  fs.writeFileSync(path.join(root, 'skills', 'netlify-alpha', 'references', 'guide.md'), 'guide\n');
  fs.writeFileSync(path.join(root, 'skills', 'netlify-zeta', 'SKILL.md'), "---\nname: netlify-zeta\ndescription: 'Zeta skill'\n---\nZeta\n");
  return root;
}

test('builds sorted deterministic entries, hashes, and selective provenance', () => {
  const root = fixture();
  fs.mkdirSync(path.join(root, '.ctx-gen'));
  fs.writeFileSync(path.join(root, '.ctx-gen', 'config.json'), JSON.stringify({
    groupings: [{ grouping: 'one', skill: 'netlify-alpha' }, { grouping: 'two', skill: 'netlify-zeta' }],
  }));
  fs.writeFileSync(path.join(root, '.ctx-gen', 'state.json'), JSON.stringify({
    one: { docsCommit: 'docs-sha', sourceHash: 'source-sha' },
  }));

  const first = buildManifest({ history: false, root, ...fixed });
  const second = buildManifest({ history: false, root, ...fixed });
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual(first.skills.map(({ name }) => name), ['netlify-alpha', 'netlify-zeta']);
  assert.deepEqual(first.skills[0].provenance, {
    grouping: 'one', docs_commit: 'docs-sha', source_hash: 'source-sha',
  });
  assert.equal('provenance' in first.skills[1], false);
  assert.deepEqual(Object.keys(first.skills[0].files), ['SKILL.md', 'references/guide.md']);

  const independentlyHashed = {};
  for (const relative of ['SKILL.md', 'references/guide.md']) {
    const bytes = fs.readFileSync(path.join(root, 'skills', 'netlify-alpha', ...relative.split('/')));
    independentlyHashed[relative] = `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
  }
  const lines = Object.keys(independentlyHashed).sort()
    .map((relative) => `${relative}\u0000100644\u0000${independentlyHashed[relative].slice('sha256:'.length)}\n`)
    .join('');
  const expectedTree = `sha256:${crypto.createHash('sha256').update(lines).digest('hex')}`;
  assert.deepEqual(first.skills[0].files, independentlyHashed);
  assert.equal(first.skills[0].tree_hash, expectedTree);
  assert.deepEqual(hashFiles(path.join(root, 'skills', 'netlify-alpha')).files, independentlyHashed);
  assert.equal(hashTree(path.join(root, 'skills', 'netlify-alpha')), expectedTree);
});

test('missing provenance files are tolerated', () => {
  const manifest = buildManifest({ history: false, root: fixture(), ...fixed });
  assert.ok(manifest.skills.every((skill) => !('provenance' in skill)));
});

test('registry supplies prior names and interleaved deprecated entries', () => {
  const root = fixture();
  fs.writeFileSync(path.join(root, 'skill-registry.json'), JSON.stringify({
    skills: { 'netlify-alpha': { prior_names: ['old-alpha'] } },
    deprecated: {
      'netlify-beta': { since: '2.0.0', replaced_by: 'netlify-alpha', description: 'Use alpha.' },
    },
  }));
  const manifest = buildManifest({ history: false, root, ...fixed });
  assert.deepEqual(manifest.skills.map(({ name }) => name), ['netlify-alpha', 'netlify-beta', 'netlify-zeta']);
  assert.deepEqual(manifest.skills[0].prior_names, ['old-alpha']);
  assert.deepEqual(manifest.skills[1], {
    name: 'netlify-beta', status: 'deprecated', version: null, prior_names: [], description: 'Use alpha.',
    tree_hash: null, files: {}, executable: [], history: [], deprecated: { since: '2.0.0', replaced_by: 'netlify-alpha' },
  });
});

test('registry rejects unknown skill keys, discovered deprecations, and reused names', () => {
  for (const registry of [
    { skills: { missing: { prior_names: [] } } },
    { deprecated: { 'netlify-alpha': { since: '1.0.0', description: 'gone' } } },
    { skills: { 'netlify-alpha': { prior_names: ['netlify-zeta'] } } },
    { skills: { 'netlify-alpha': { prior_names: ['old'] }, 'netlify-zeta': { prior_names: ['old'] } } },
    { skills: { 'netlify-alpha': { prior_names: ['old'] } }, deprecated: { old: { since: '1.0.0', description: 'gone' } } },
  ]) {
    const root = fixture();
    fs.writeFileSync(path.join(root, 'skill-registry.json'), JSON.stringify(registry));
    assert.throws(() => buildManifest({ history: false, root, ...fixed }), /skill-registry\.json/);
  }
});

test('frontmatter name must match the directory', () => {
  const root = fixture();
  fs.writeFileSync(path.join(root, 'skills', 'netlify-alpha', 'SKILL.md'), '---\nname: other\ndescription: nope\n---\n');
  assert.throws(() => buildManifest({ history: false, root, ...fixed }), /alpha.*other/);
});

test('symlinks in skill trees fail loudly', () => {
  const root = fixture();
  fs.symlinkSync(path.join(root, 'skills', 'netlify-zeta', 'SKILL.md'), path.join(root, 'skills', 'netlify-alpha', 'linked.md'));
  assert.throws(() => buildManifest({ history: false, root, ...fixed }), /symlinks and other non-regular entries/);
});

test('CLI --out - emits the manifest', () => {
  const root = fixture();
  const result = spawnSync(process.execPath, [script, '--root', root, '--out', '-', '--version', fixed.version,
    '--commit', fixed.commit, '--published-at', fixed.publishedAt, '--no-history'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), buildManifest({ history: false, root, ...fixed }));
  assert.equal(result.stdout.endsWith('\n'), true);
});

// Hosted manifests under /v/<version>/ are regenerated by the current code on
// every publish, so clients can only trust a pinned tree_hash if the formula
// never moves within schema_version 1. This constant is that promise: if it
// fails, you changed the formula — bump schema_version and update it here.
test('tree_hash formula is frozen for schema_version 1', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'build-manifest-golden-'));
  fs.mkdirSync(path.join(root, 'skills', 'netlify-golden', 'references'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills', 'netlify-golden', 'SKILL.md'), '---\nname: netlify-golden\ndescription: Golden\n---\ngolden\n');
  fs.writeFileSync(path.join(root, 'skills', 'netlify-golden', 'references', 'a.md'), 'a\n');
  fs.writeFileSync(path.join(root, 'package.json'), '{"version":"1.0.0"}\n');
  const manifest = buildManifest({ history: false, root, version: '1.0.0', commit: 'c', publishedAt: '2026-01-01T00:00:00Z' });
  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.skills[0].tree_hash, 'sha256:2bfa72ee6eeb292f1e29629e9bd811307867a4f924ce20458891558491614e19');
});

test('the executable bit is part of tree_hash and listed in executable', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'build-manifest-exec-'));
  fs.mkdirSync(path.join(root, 'skills', 'netlify-tool', 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills', 'netlify-tool', 'SKILL.md'), '---\nname: netlify-tool\ndescription: Tool\n---\n');
  const script = path.join(root, 'skills', 'netlify-tool', 'scripts', 'run.sh');
  fs.writeFileSync(script, '#!/bin/sh\n');
  fs.writeFileSync(path.join(root, 'package.json'), '{"version":"1.0.0"}\n');
  const args = { root, version: '1.0.0', commit: 'c', publishedAt: '2026-01-01T00:00:00Z' };

  fs.chmodSync(script, 0o644);
  const plain = buildManifest({ history: false, ...args }).skills[0];
  fs.chmodSync(script, 0o755);
  const exec = buildManifest({ history: false, ...args }).skills[0];

  assert.deepEqual(plain.executable, []);
  assert.deepEqual(exec.executable, ['scripts/run.sh']);
  assert.deepEqual(plain.files, exec.files);
  assert.notEqual(plain.tree_hash, exec.tree_hash);
});

test('skill history lists every release the tree changed at, ending with the head when it moved', () => {
  const tags = [
    { version: '0.1.0', trees: new Map([['netlify-alpha', 'a1']]) },
    { version: '0.2.0', trees: new Map([['netlify-alpha', 'a1'], ['netlify-beta', 'b1']]) },
    { version: '0.3.0', trees: new Map([['netlify-alpha', 'a2'], ['netlify-beta', 'b1']]) },
    { version: '0.4.0', trees: new Map([['netlify-alpha', 'a2'], ['netlify-beta', 'b1']]) },
  ];
  const hashAt = (version, name) => `sha256:${name}@${version}`;
  const alpha = skillHistory({ name: 'netlify-alpha', headOid: 'a2', headTreeHash: 'sha256:head', headVersion: '0.5.0', tags, hashAt });
  assert.deepEqual(alpha, [
    { version: '0.1.0', tree_hash: 'sha256:netlify-alpha@0.1.0' },
    { version: '0.3.0', tree_hash: 'sha256:netlify-alpha@0.3.0' },
  ], 'unchanged since 0.3.0: no head entry');
  const beta = skillHistory({ name: 'netlify-beta', headOid: 'b2', headTreeHash: 'sha256:head', headVersion: '0.5.0', tags, hashAt });
  assert.deepEqual(beta.map(({ version }) => version), ['0.2.0', '0.5.0'], 'changing in this release');
  const gamma = skillHistory({ name: 'gamma', headOid: 'g1', headTreeHash: 'sha256:head', headVersion: '0.5.0', tags, hashAt });
  assert.deepEqual(gamma, [{ version: '0.5.0', tree_hash: 'sha256:head' }], 'brand new skill');

  const gap = [
    { version: '0.1.0', trees: new Map([['netlify-alpha', 'a1']]) },
    { version: '0.2.0', trees: new Map() },
    { version: '0.3.0', trees: new Map([['netlify-alpha', 'a1']]) },
  ];
  assert.deepEqual(
    skillHistory({ name: 'netlify-alpha', headOid: 'a1', headTreeHash: 'x', headVersion: '0.4.0', tags: gap, hashAt }).map(({ version }) => version),
    ['0.1.0', '0.3.0'], 'removed and re-added counts as changed when it reappears',
  );
});

test('treeHashAt matches hashTree for the same committed tree, including the executable bit', () => {
  const root = fixture();
  fs.mkdirSync(path.join(root, 'skills', 'netlify-alpha', 'scripts'), { recursive: true });
  const script = path.join(root, 'skills', 'netlify-alpha', 'scripts', 'run.sh');
  fs.writeFileSync(script, '#!/bin/sh\n');
  fs.chmodSync(script, 0o755);
  const g = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  g('init', '-q'); g('add', '.'); g('-c', 'user.name=t', '-c', 'user.email=t@e', 'commit', '-qm', 'x'); g('tag', 'v0.1.0');
  assert.equal(treeHashAt(root, 'v0.1.0', 'netlify-alpha'), hashTree(path.join(root, 'skills', 'netlify-alpha')));
  assert.equal(treeHashAt(root, 'v0.1.0', 'netlify-zeta'), hashTree(path.join(root, 'skills', 'netlify-zeta')));
});

test('treeHashAt survives filenames git would otherwise C-quote', () => {
  const root = fixture();
  const dir = path.join(root, 'skills', 'netlify-alpha', 'references');
  fs.mkdirSync(dir, { recursive: true });
  for (const name of ['with space.md', 'quo"te.md', 'ünïcode.md', 'back\\slash.md']) fs.writeFileSync(path.join(dir, name), `${name}\n`);
  const g = (...args) => execFileSync('git', ['-C', root, '-c', 'user.name=t', '-c', 'user.email=t@e', '-c', 'core.quotePath=true', ...args], { encoding: 'utf8' });
  g('init', '-q'); g('add', '.'); g('commit', '-qm', 'odd names'); g('tag', 'v0.1.0');
  assert.equal(treeHashAt(root, 'v0.1.0', 'netlify-alpha'), hashTree(path.join(root, 'skills', 'netlify-alpha')));
});

test('a manifest built from a tagged repo carries derived version and history per skill', () => {
  const root = fixture();
  const g = (...args) => execFileSync('git', ['-C', root, '-c', 'user.name=t', '-c', 'user.email=t@e', ...args], { encoding: 'utf8' });
  g('init', '-q'); g('add', '.'); g('commit', '-qm', 'one'); g('tag', 'v0.1.0');
  fs.appendFileSync(path.join(root, 'skills', 'netlify-alpha', 'SKILL.md'), 'more\n');
  g('add', '.'); g('commit', '-qm', 'two'); g('tag', 'v0.2.0');
  fs.appendFileSync(path.join(root, 'skills', 'netlify-alpha', 'SKILL.md'), 'again\n');
  g('add', '.'); g('commit', '-qm', 'three');

  const manifest = buildManifest({ root, ...fixed, version: '0.3.0' });
  const alpha = manifest.skills.find(({ name }) => name === 'netlify-alpha');
  const zeta = manifest.skills.find(({ name }) => name === 'netlify-zeta');
  assert.equal(alpha.version, '0.3.0', 'changed since the last tag → this release');
  assert.deepEqual(alpha.history.map(({ version }) => version), ['0.1.0', '0.2.0', '0.3.0']);
  assert.equal(alpha.history.at(-1).tree_hash, alpha.tree_hash);
  assert.equal(new Set(alpha.history.map(({ tree_hash }) => tree_hash)).size, 3, 'each change point has its own hash');
  assert.equal(zeta.version, '0.1.0', 'untouched since first tag');
  assert.deepEqual(zeta.history, [{ version: '0.1.0', tree_hash: zeta.tree_hash }]);
});

test('deriving per-skill versions without release tags fails with a clear message', () => {
  const root = fixture();
  execFileSync('git', ['-C', root, 'init', '-q']);
  execFileSync('git', ['-C', root, 'add', '.']);
  execFileSync('git', ['-C', root, '-c', 'user.name=t', '-c', 'user.email=t@e', 'commit', '-qm', 'x']);
  assert.throws(() => buildManifest({ root, ...fixed }), /no release tags found/);
  const noHistory = buildManifest({ root, ...fixed, history: false }).skills[0];
  assert.equal(noHistory.version, fixed.version);
  assert.deepEqual(noHistory.history, [{ version: fixed.version, tree_hash: noHistory.tree_hash }]);
});
