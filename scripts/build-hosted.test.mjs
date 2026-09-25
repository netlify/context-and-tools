import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./build-hosted.mjs', import.meta.url));

function git(repo, ...args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
}

function write(root, relative, contents) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

function fixture() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'build-hosted-test-'));
  git(repo, 'init', '-q');
  git(repo, 'config', 'user.name', 'Test');
  git(repo, 'config', 'user.email', 'test@example.com');
  write(repo, 'package.json', '{"version":"0.1.0"}\n');
  git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'empty release'); git(repo, 'tag', 'v0.1.0');

  write(repo, 'package.json', '{"version":"0.2.0"}\n');
  write(repo, 'skills/netlify-alpha/SKILL.md', '---\nname: netlify-alpha\ndescription: Alpha skill\n---\nAlpha\n');
  write(repo, 'skills/CLAUDE.md', 'not hosted\n');
  git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'one skill'); git(repo, 'tag', 'v0.2.0');

  write(repo, 'package.json', '{"version":"0.3.0"}\n');
  write(repo, 'skills/netlify-alpha/references/info.md', 'reference\n');
  write(repo, 'skills/netlify-beta/SKILL.md', '---\nname: netlify-beta\ndescription: "Beta skill"\n---\nBeta\n');
  write(repo, '.ctx-gen/config.json', JSON.stringify({ groupings: [{ grouping: 'beta-docs', skill: 'netlify-beta' }] }));
  write(repo, '.ctx-gen/state.json', JSON.stringify({ 'beta-docs': { docsCommit: 'abc', sourceHash: 'def' } }));
  git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'two skills'); git(repo, 'tag', 'v0.3.0');

  write(repo, 'package.json', '{"version":"0.4.0"}\n');
  write(repo, 'skills/netlify-beta/SKILL.md', '---\nname: netlify-beta\ndescription: "Beta skill"\n---\nBeta, revised\n');
  git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'beta only'); git(repo, 'tag', 'v0.4.0');
  return repo;
}

function run(repo, out, ...args) {
  return execFileSync(process.execPath, [script, '--repo', repo, '--out', out, ...args], { encoding: 'utf8' });
}

test('builds every eligible tag and makes the highest version latest', () => {
  const repo = fixture();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'build-hosted-out-'));
  run(repo, out);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, 'versions.json'))), {
    schema_version: 1, latest: '0.4.0', versions: ['0.2.0', '0.3.0', '0.4.0'],
  });
  assert.equal(fs.existsSync(path.join(out, 'v/0.1.0')), false);
  assert.equal(fs.existsSync(path.join(out, 'v/0.2.0/manifest.json')), true);
  const latest = fs.readFileSync(path.join(out, 'v/0.4.0/manifest.json'));
  assert.deepEqual(fs.readFileSync(path.join(out, 'manifest.json')), latest);
  assert.equal(fs.existsSync(path.join(out, 'skills/CLAUDE.md')), false);
  assert.equal(fs.existsSync(path.join(out, 'skills/netlify-alpha/references/info.md')), true);

  const skillVersion = (release, name) => JSON.parse(fs.readFileSync(path.join(out, `v/${release}/manifest.json`)))
    .skills.find((skill) => skill.name === name).version;
  assert.equal(skillVersion('0.2.0', 'netlify-alpha'), '0.2.0');
  assert.equal(skillVersion('0.3.0', 'netlify-alpha'), '0.3.0', 'alpha gained a reference in 0.3.0');
  assert.equal(skillVersion('0.3.0', 'netlify-beta'), '0.3.0');
  assert.equal(skillVersion('0.4.0', 'netlify-alpha'), '0.3.0', 'alpha did not change in 0.4.0');
  assert.equal(skillVersion('0.4.0', 'netlify-beta'), '0.4.0');

  for (const version of ['0.2.0', '0.3.0', '0.4.0']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(out, `v/${version}/manifest.json`)));
    assert.equal(manifest.source.commit, git(repo, 'rev-list', '-n', '1', `v${version}`));
    for (const skill of manifest.skills.filter(({ status }) => status === 'active')) {
      assert.deepEqual(Object.keys(skill.files).sort(), list(path.join(out, `v/${version}/skills/${skill.name}`)));
    }
  }
});

function list(root, current = root) {
  return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(current, entry.name);
    return entry.isDirectory() ? list(root, absolute) : [path.relative(root, absolute).split(path.sep).join('/')];
  }).sort();
}

test('supports pinned latest, minimum version, and deterministic output', () => {
  const repo = fixture();
  const one = fs.mkdtempSync(path.join(os.tmpdir(), 'build-hosted-one-'));
  const two = fs.mkdtempSync(path.join(os.tmpdir(), 'build-hosted-two-'));
  run(repo, one, '--latest', 'v0.2.0');
  assert.deepEqual(fs.readFileSync(path.join(one, 'manifest.json')), fs.readFileSync(path.join(one, 'v/0.2.0/manifest.json')));
  run(repo, two, '--latest', 'v0.2.0');
  assert.deepEqual(snapshot(one), snapshot(two));

  const minimum = fs.mkdtempSync(path.join(os.tmpdir(), 'build-hosted-min-'));
  run(repo, minimum, '--min-version', '0.4.0');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(minimum, 'versions.json'))).versions, ['0.4.0']);
  // Excluded older tags still feed the per-skill version history.
  const only = JSON.parse(fs.readFileSync(path.join(minimum, 'manifest.json')));
  assert.equal(only.skills.find(({ name }) => name === 'netlify-alpha').version, '0.3.0');
});

function snapshot(root) {
  return Object.fromEntries(list(root).map((relative) => [relative, fs.readFileSync(path.join(root, relative)).toString('base64')]));
}

test('rejects a latest tag that was not built', () => {
  const repo = fixture();
  const out = path.join(repo, 'out');
  assert.throws(() => run(repo, out, '--latest', 'v0.1.0'), /not one of the built tags/);
});

test('refuses to wipe anything it did not generate', () => {
  const repo = fixture();
  assert.throws(() => run(repo, repo), /refusing to wipe the repository/);
  assert.throws(() => run(repo, path.dirname(repo)), /refusing to wipe the repository/);
  assert.throws(() => run(repo, path.parse(repo).root), /filesystem root/);

  const foreign = fs.mkdtempSync(path.join(os.tmpdir(), 'build-hosted-foreign-'));
  fs.writeFileSync(path.join(foreign, 'precious.txt'), 'keep me\n');
  assert.throws(() => run(repo, foreign), /not generated by build-hosted/);
  assert.equal(fs.readFileSync(path.join(foreign, 'precious.txt'), 'utf8'), 'keep me\n');

  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'build-hosted-rerun-'));
  run(repo, out);
  fs.writeFileSync(path.join(out, 'stale.txt'), 'from a previous build\n');
  run(repo, out);
  assert.equal(fs.existsSync(path.join(out, 'stale.txt')), false);
  assert.equal(fs.existsSync(path.join(out, '.build-hosted')), true);
});
