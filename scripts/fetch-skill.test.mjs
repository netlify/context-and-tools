import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildManifest, hashTree } from './build-manifest.mjs';

const script = fileURLToPath(new URL('./fetch-skill.mjs', import.meta.url));
let fixture;
let dist;
let host;
let server;
let tamperPath = null;
let listenError = null;

function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

function copyManifestFiles(manifest, target) {
  for (const skill of manifest.skills.filter(({ status }) => status === 'active')) {
    for (const file of Object.keys(skill.files)) {
      const relative = path.join('skills', skill.name, ...file.split('/'));
      write(path.join(target, relative), fs.readFileSync(path.join(fixture, relative)));
    }
  }
}

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: fixture });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

before(async () => {
  fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'fetch-skill-test-'));
  dist = path.join(fixture, 'dist');
  write(path.join(fixture, 'package.json'), '{"version":"1.0.0"}\n');
  write(path.join(fixture, 'skills/netlify-alpha/SKILL.md'), '---\nname: netlify-alpha\ndescription: Alpha\n---\nalpha\n');
  write(path.join(fixture, 'skills/netlify-alpha/references/info.md'), 'reference\n');
  write(path.join(fixture, 'skills/netlify-beta/SKILL.md'), '---\nname: netlify-beta\ndescription: Beta\n---\nbeta\n');
  write(path.join(fixture, 'skill-registry.json'), JSON.stringify({
    skills: { 'netlify-alpha': { prior_names: ['old-alpha'] } },
    deprecated: { retired: { since: '1.0.0', replaced_by: 'netlify-alpha', description: 'Retired' } },
  }));
  const manifest = buildManifest({
    history: false,
    root: fixture,
    version: '1.0.0',
    commit: 'abc123',
    publishedAt: '2026-01-01T00:00:00Z',
  });
  // Give alpha a past: the content it had at 0.9.0, so a local copy of that
  // content classifies as stale (have 0.9.0) rather than modified.
  write(path.join(fixture, 'old/netlify-alpha/SKILL.md'), '---\nname: netlify-alpha\ndescription: Alpha\n---\nalpha, first draft\n');
  const alpha = manifest.skills.find(({ name }) => name === 'netlify-alpha');
  alpha.history.unshift({ version: '0.9.0', tree_hash: hashTree(path.join(fixture, 'old/netlify-alpha')) });
  write(path.join(dist, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  write(path.join(dist, 'v/1.0.0/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  copyManifestFiles(manifest, dist);
  copyManifestFiles(manifest, path.join(dist, 'v/1.0.0'));

  server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === tamperPath) {
      response.writeHead(200).end('tampered');
      return;
    }
    const file = path.join(dist, ...pathname.split('/').filter(Boolean));
    if (!file.startsWith(`${dist}${path.sep}`) || !fs.lstatSync(file, { throwIfNoEntry: false })?.isFile()) {
      response.writeHead(404).end('missing');
      return;
    }
    response.writeHead(200).end(fs.readFileSync(file));
  });
  await new Promise((resolve) => {
    server.once('error', (error) => {
      listenError = error;
      resolve();
    });
    server.listen(0, '127.0.0.1', resolve);
  });
  if (listenError) return;
  host = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  if (server.listening) server.close();
  fs.rmSync(fixture, { recursive: true, force: true });
});

test('downloads verified files, resolves prior names, and supports pinned versions', async (t) => {
  if (listenError) return t.skip(`localhost unavailable: ${listenError.code}`);
  const dest = path.join(fixture, 'download');
  const latest = await run(['--host', host, '--skill', 'old-alpha', '--dest', dest]);
  assert.equal(latest.code, 0, latest.stderr);
  assert.match(latest.stdout, /old-alpha is now netlify-alpha/);
  assert.match(latest.stdout, /installed netlify-alpha/);
  assert.equal(fs.readFileSync(path.join(dest, 'netlify-alpha/references/info.md'), 'utf8'), 'reference\n');

  const pinned = await run(['--host', host, '--version', '1.0.0', '--skill', 'netlify-beta', '--dest', dest]);
  assert.equal(pinned.code, 0, pinned.stderr);
  assert.match(pinned.stdout, /installed netlify-beta/);
});

test('short names resolve to their netlify- skill, and a literal * means --all', async (t) => {
  if (listenError) return t.skip(`localhost unavailable: ${listenError.code}`);
  write(path.join(fixture, 'skills/netlify-gamma/SKILL.md'), '---\nname: netlify-gamma\ndescription: Gamma\n---\ngamma\n');
  const manifest = buildManifest({ history: false, root: fixture, version: '1.0.1', commit: 'def', publishedAt: '2026-01-02T00:00:00Z' });
  write(path.join(dist, 'v/1.0.1/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  copyManifestFiles(manifest, path.join(dist, 'v/1.0.1'));

  const dest = path.join(fixture, 'short');
  const short = await run(['--host', host, '--version', '1.0.1', '--skill', 'gamma', '--dest', dest]);
  assert.equal(short.code, 0, short.stderr);
  assert.equal(fs.existsSync(path.join(dest, 'netlify-gamma/SKILL.md')), true);
  const star = await run(['--host', host, '--version', '1.0.1', '*', '--dest', path.join(fixture, 'star')]);
  assert.equal(star.code, 0, star.stderr);
  assert.deepEqual(fs.readdirSync(path.join(fixture, 'star')).sort(), ['netlify-alpha', 'netlify-beta', 'netlify-gamma']);
  fs.rmSync(path.join(fixture, 'skills/netlify-gamma'), { recursive: true });
});

test('--source installs and syncs from a release directory, verifying bytes', async (t) => {
  const dest = path.join(fixture, 'from-source');
  const local = await run(['--source', dist, '--skill', 'netlify-alpha', '--dest', dest]);
  assert.equal(local.code, 0, local.stderr);
  assert.match(local.stdout, /installed netlify-alpha 1\.0\.0/);
  assert.equal(fs.readFileSync(path.join(dest, 'netlify-alpha/references/info.md'), 'utf8'), 'reference\n');

  const checked = await run(['--source', dist, '--check', dest, '--json']);
  assert.equal(JSON.parse(checked.stdout).skills[0].status, 'current');

  const versioned = await run(['--source', dist, '--version', '1.0.0', '--skill', 'netlify-beta', '--dest', dest]);
  assert.equal(versioned.code, 1);
  assert.match(versioned.stderr, /--version applies to --host only/);
  const both = await run(['--source', dist, '--host', host, '--skill', 'netlify-beta', '--dest', dest]);
  assert.equal(both.code, 1);
  assert.match(both.stderr, /mutually exclusive/);
  const nowhere = await run(['--source', path.join(fixture, 'skills'), '--skill', 'netlify-beta', '--dest', dest]);
  assert.equal(nowhere.code, 1);
  assert.match(nowhere.stderr, /no manifest\.json there/);

  // A corrupted release directory fails verification instead of installing.
  const corrupt = path.join(fixture, 'corrupt-release');
  fs.cpSync(dist, corrupt, { recursive: true });
  fs.appendFileSync(path.join(corrupt, 'skills/netlify-beta/SKILL.md'), 'oops\n');
  const bad = await run(['--source', corrupt, '--skill', 'netlify-beta', '--dest', dest]);
  assert.equal(bad.code, 1);
  assert.match(bad.stderr, /hash mismatch/);
  assert.equal(fs.existsSync(path.join(dest, 'netlify-beta')), false);
});

test('a manifest cannot name a path: traversal and duplicate names are refused before anything is written', async (t) => {
  if (listenError) return t.skip(`localhost unavailable: ${listenError.code}`);
  const good = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8'));
  const evil = path.join(fixture, 'evil');
  const dest = path.join(fixture, 'evil-dest');
  const cases = [
    ['../escape', /invalid skill name/],
    ['a/b', /invalid skill name/],
    ['.hidden', /invalid skill name/],
    ['..', /invalid skill name/],
  ];
  for (const [name, pattern] of cases) {
    const manifest = JSON.parse(JSON.stringify(good));
    manifest.skills[0].name = name;
    write(path.join(evil, 'manifest.json'), JSON.stringify(manifest));
    const result = await run(['--source', evil, '--all', '--dest', dest]);
    assert.equal(result.code, 1, name);
    assert.match(result.stderr, pattern);
    assert.equal(fs.existsSync(dest), false, `nothing written for ${name}`);
  }
  const priorEvil = JSON.parse(JSON.stringify(good));
  priorEvil.skills[0].prior_names = ['../x'];
  write(path.join(evil, 'manifest.json'), JSON.stringify(priorEvil));
  assert.match((await run(['--source', evil, '--check', fixture])).stderr, /invalid prior name/);
  const dupe = JSON.parse(JSON.stringify(good));
  dupe.skills.push({ ...dupe.skills[0] });
  write(path.join(evil, 'manifest.json'), JSON.stringify(dupe));
  assert.match((await run(['--source', evil, '--check', fixture])).stderr, /duplicate skill name/);
});

test('--update never overwrites an edited current-name copy while migrating its old name', async (t) => {
  if (listenError) return t.skip(`localhost unavailable: ${listenError.code}`);
  const local = path.join(fixture, 'rename-collision');
  fs.cpSync(path.join(fixture, 'old/netlify-alpha'), path.join(local, 'old-alpha'), { recursive: true });   // clean, renamed
  fs.cpSync(path.join(fixture, 'skills/netlify-alpha'), path.join(local, 'netlify-alpha'), { recursive: true });    // current name, edited
  fs.appendFileSync(path.join(local, 'netlify-alpha/SKILL.md'), 'my edits\n');

  const kept = await run(['--host', host, '--update', local, '--json']);
  assert.equal(kept.code, 0, kept.stderr);
  const actions = JSON.parse(kept.stdout).actions;
  assert.equal(actions.find(({ name }) => name === 'old-alpha').action, 'kept');
  assert.equal(actions.find(({ name }) => name === 'netlify-alpha').action, 'kept');
  assert.match(fs.readFileSync(path.join(local, 'netlify-alpha/SKILL.md'), 'utf8'), /my edits/, 'edited copy untouched');
  assert.equal(fs.existsSync(path.join(local, 'old-alpha')), true);

  // When the current copy is clean, the old directory is simply removed.
  fs.rmSync(path.join(local, 'netlify-alpha'), { recursive: true });
  fs.cpSync(path.join(fixture, 'skills/netlify-alpha'), path.join(local, 'netlify-alpha'), { recursive: true });
  const cleaned = await run(['--host', host, '--update', local, '--json']);
  assert.equal(JSON.parse(cleaned.stdout).actions.find(({ name }) => name === 'old-alpha').action, 'removed');
  assert.equal(fs.existsSync(path.join(local, 'old-alpha')), false);
});

test('a hash mismatch writes nothing for that skill', async (t) => {
  if (listenError) return t.skip(`localhost unavailable: ${listenError.code}`);
  const dest = path.join(fixture, 'tampered-download');
  tamperPath = '/skills/netlify-alpha/references/info.md';
  const result = await run(['--host', host, '--skill', 'netlify-alpha', '--dest', dest]);
  tamperPath = null;
  assert.equal(result.code, 1);
  assert.match(result.stderr, /hash mismatch/);
  assert.equal(fs.existsSync(path.join(dest, 'netlify-alpha')), false);
});

test('refuses deprecated skills and names the replacement', async (t) => {
  if (listenError) return t.skip(`localhost unavailable: ${listenError.code}`);
  const result = await run(['--host', host, '--skill', 'retired', '--dest', path.join(fixture, 'retired')]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /retired is deprecated; use netlify-alpha/);
});

test('--check classifies local skills, reports missing, and leaves unknown skills alone', async (t) => {
  if (listenError) return t.skip(`localhost unavailable: ${listenError.code}`);
  const local = path.join(fixture, 'local');
  fs.cpSync(path.join(fixture, 'skills/netlify-alpha'), path.join(local, 'netlify-alpha'), { recursive: true });
  fs.cpSync(path.join(fixture, 'skills/netlify-alpha'), path.join(local, 'old-alpha'), { recursive: true });
  write(path.join(local, 'retired/SKILL.md'), 'retired\n');
  write(path.join(local, 'mine/SKILL.md'), 'mine\n');
  const unknownBefore = fs.readFileSync(path.join(local, 'mine/SKILL.md'));

  const initial = await run(['--host', host, '--check', local, '--json']);
  assert.equal(initial.code, 1);
  const report = JSON.parse(initial.stdout);
  assert.deepEqual(report.skills.map(({ name, status }) => [name, status]), [
    ['mine', 'unknown'], ['netlify-alpha', 'current'], ['old-alpha', 'renamed'], ['retired', 'deprecated'],
  ]);
  assert.equal(report.skills[1].version, '1.0.0');
  assert.equal(report.skills[2].modified, false, 'renamed copy matches the current content');
  assert.deepEqual(report.missing, ['netlify-beta']);
  assert.deepEqual(fs.readFileSync(path.join(local, 'mine/SKILL.md')), unknownBefore);

  // An older release's content is stale and names the version you have.
  fs.rmSync(path.join(local, 'netlify-alpha'), { recursive: true });
  fs.cpSync(path.join(fixture, 'old/netlify-alpha'), path.join(local, 'netlify-alpha'), { recursive: true });
  const stale = await run(['--host', host, '--check', local, '--json']);
  assert.equal(stale.code, 1);
  assert.deepEqual(JSON.parse(stale.stdout).skills.find(({ name }) => name === 'netlify-alpha'), { name: 'netlify-alpha', status: 'stale', version: '1.0.0', have: '0.9.0' });
  const human = await run(['--host', host, '--check', local]);
  assert.match(human.stdout, /netlify-alpha: stale \(have 0\.9\.0, latest is 1\.0\.0\)/);

  // Content matching no release is a local edit: reported, but not a failure unless --strict.
  fs.appendFileSync(path.join(local, 'netlify-alpha/SKILL.md'), 'edited\n');
  fs.rmSync(path.join(local, 'old-alpha'), { recursive: true });
  fs.rmSync(path.join(local, 'retired'), { recursive: true });
  const modified = await run(['--host', host, '--check', local, '--json']);
  assert.equal(modified.code, 0, modified.stderr);
  assert.deepEqual(JSON.parse(modified.stdout).skills.find(({ name }) => name === 'netlify-alpha'), { name: 'netlify-alpha', status: 'modified', version: '1.0.0', have: null });
  const strict = await run(['--host', host, '--check', local, '--strict', '--json']);
  assert.equal(strict.code, 1);
});

test('a copy of our skill under another name is a duplicate, and update leaves it alone', async (t) => {
  if (listenError) return t.skip(`localhost unavailable: ${listenError.code}`);
  const local = path.join(fixture, 'dupes');
  fs.cpSync(path.join(fixture, 'skills/netlify-alpha'), path.join(local, 'netlify-alpha'), { recursive: true });
  fs.cpSync(path.join(fixture, 'old/netlify-alpha'), path.join(local, 'ar-functions-copy'), { recursive: true });
  const checked = await run(['--host', host, '--check', local, '--json']);
  const report = JSON.parse(checked.stdout);
  assert.deepEqual(report.skills.find(({ name }) => name === 'ar-functions-copy'),
    { name: 'ar-functions-copy', status: 'duplicate', current_name: 'netlify-alpha', version: '1.0.0', have: '0.9.0' });
  assert.equal(report.summary.duplicate, 1);
  const human = await run(['--host', host, '--check', local]);
  assert.match(human.stdout, /ar-functions-copy: duplicate of netlify-alpha 0\.9\.0 \(latest is 1\.0\.0\)/);
  const updated = await run(['--host', host, '--update', local, '--json']);
  assert.equal(JSON.parse(updated.stdout).actions.find(({ name }) => name === 'ar-functions-copy').action, 'ignored');
  assert.equal(fs.existsSync(path.join(local, 'ar-functions-copy/SKILL.md')), true);
});

test('--update applies the sync rules and --all adds what is missing', async (t) => {
  if (listenError) return t.skip(`localhost unavailable: ${listenError.code}`);
  const local = path.join(fixture, 'sync');
  fs.cpSync(path.join(fixture, 'old/netlify-alpha'), path.join(local, 'netlify-alpha'), { recursive: true });          // stale
  fs.cpSync(path.join(fixture, 'old/netlify-alpha'), path.join(local, 'old-alpha'), { recursive: true });      // renamed, unedited
  write(path.join(local, 'retired/SKILL.md'), 'retired\n');                                            // deprecated
  write(path.join(local, 'mine/SKILL.md'), 'mine\n');                                                  // unknown

  const first = await run(['--host', host, '--update', local, '--json']);
  assert.equal(first.code, 0, first.stderr);
  const report = JSON.parse(first.stdout);
  // alpha is installed under its current name too, so old-alpha is only removed, never migrated over it.
  assert.deepEqual(report.actions.map(({ name, action }) => [name, action]), [
    ['mine', 'ignored'], ['netlify-alpha', 'updated'], ['old-alpha', 'removed'], ['retired', 'removed'], ['netlify-beta', 'missing'],
  ]);
  assert.equal(fs.readFileSync(path.join(local, 'netlify-alpha/SKILL.md'), 'utf8'), fs.readFileSync(path.join(fixture, 'skills/netlify-alpha/SKILL.md'), 'utf8'));
  assert.equal(fs.existsSync(path.join(local, 'old-alpha')), false);
  assert.equal(fs.existsSync(path.join(local, 'retired')), false);
  assert.equal(fs.existsSync(path.join(local, 'mine/SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(local, 'netlify-beta')), false, 'missing skills are not added without --all');
  assert.deepEqual(report.summary, { current: 1, stale: 0, modified: 0, renamed: 0, deprecated: 0, duplicate: 0, unknown: 1, missing: 1 });

  // A local edit survives update, and --reset replaces it.
  fs.appendFileSync(path.join(local, 'netlify-alpha/SKILL.md'), 'my notes\n');
  const kept = await run(['--host', host, '--update', local, '--json']);
  assert.equal(JSON.parse(kept.stdout).actions.find(({ name }) => name === 'netlify-alpha').action, 'kept');
  assert.match(fs.readFileSync(path.join(local, 'netlify-alpha/SKILL.md'), 'utf8'), /my notes/);
  const reset = await run(['--host', host, '--update', local, '--reset', '--json']);
  assert.equal(JSON.parse(reset.stdout).actions.find(({ name }) => name === 'netlify-alpha').action, 'reset');
  assert.doesNotMatch(fs.readFileSync(path.join(local, 'netlify-alpha/SKILL.md'), 'utf8'), /my notes/);

  // A rename with no current-name copy installed migrates to the new name.
  const lone = path.join(fixture, 'lone-rename');
  fs.cpSync(path.join(fixture, 'old/netlify-alpha'), path.join(lone, 'old-alpha'), { recursive: true });
  const migrated = await run(['--host', host, '--update', lone, '--json']);
  assert.equal(JSON.parse(migrated.stdout).actions.find(({ name }) => name === 'old-alpha').action, 'renamed');
  assert.equal(fs.existsSync(path.join(lone, 'netlify-alpha/SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(lone, 'old-alpha')), false);

  const all = await run(['--host', host, '--update', local, '--all', '--json']);
  const added = JSON.parse(all.stdout);
  assert.equal(added.actions.find(({ name }) => name === 'netlify-beta').action, 'added');
  assert.deepEqual(added.missing, []);
  assert.equal(fs.existsSync(path.join(local, 'netlify-beta/SKILL.md')), true);
});

test('--all downloads every active skill', async (t) => {
  if (listenError) return t.skip(`localhost unavailable: ${listenError.code}`);
  const dest = path.join(fixture, 'everything');
  const result = await run(['--host', host, '--all', '--dest', dest]);
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(fs.readdirSync(dest).sort(), ['netlify-alpha', 'netlify-beta']);
  const conflict = await run(['--host', host, '--all', '--skill', 'netlify-alpha', '--dest', dest]);
  assert.equal(conflict.code, 1);
  assert.match(conflict.stderr, /--all cannot be combined with --skill/);
});

test('--strict also fails on missing and unknown skills, and passes on an exact match', async (t) => {
  if (listenError) return t.skip(`localhost unavailable: ${listenError.code}`);
  const local = path.join(fixture, 'strict');
  fs.cpSync(path.join(fixture, 'skills/netlify-alpha'), path.join(local, 'netlify-alpha'), { recursive: true });

  const missingBeta = await run(['--host', host, '--check', local, '--strict', '--json']);
  assert.equal(missingBeta.code, 1);
  assert.deepEqual(JSON.parse(missingBeta.stdout).missing, ['netlify-beta']);
  const lenient = await run(['--host', host, '--check', local, '--json']);
  assert.equal(lenient.code, 0);

  fs.cpSync(path.join(fixture, 'skills/netlify-beta'), path.join(local, 'netlify-beta'), { recursive: true });
  const exact = await run(['--host', host, '--check', local, '--strict', '--json']);
  assert.equal(exact.code, 0, exact.stderr);

  write(path.join(local, 'extra/SKILL.md'), 'extra\n');
  const unknown = await run(['--host', host, '--check', local, '--strict', '--json']);
  assert.equal(unknown.code, 1);
  assert.equal(JSON.parse(unknown.stdout).summary.unknown, 1);

  const misuse = await run(['--host', host, '--skill', 'netlify-alpha', '--dest', local, '--strict']);
  assert.equal(misuse.code, 1);
  assert.match(misuse.stderr, /--strict and --reset do not apply to downloads/);
});

test('netlify-skills command wraps add and check with defaults', async (t) => {
  if (listenError) return t.skip(`localhost unavailable: ${listenError.code}`);
  const bin = fileURLToPath(new URL('../bin/netlify-skills.mjs', import.meta.url));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'netlify-skills-bin-'));
  const runBin = (args, env = {}) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [bin, ...args], { cwd, env: { ...process.env, ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });

  // Default source: the package's own release (pointed at the fixture dist here).
  const added = await runBin(['add', 'netlify-alpha'], { NETLIFY_SKILLS_PACKAGE_ROOT: dist });
  assert.equal(added.code, 0, added.stderr);
  assert.equal(fs.existsSync(path.join(cwd, '.claude/skills/netlify-alpha/SKILL.md')), true, 'default dest is .claude/skills');
  assert.match(added.stdout, /installed netlify-alpha 1\.0\.0/);

  const checked = await runBin(['check', '--json'], { NETLIFY_SKILLS_HOST: host });
  assert.equal(checked.code, 0, checked.stderr);
  assert.equal(JSON.parse(checked.stdout).skills[0].status, 'current');

  const explicitHost = await runBin(['add', 'netlify-beta', '--dest', 'here', '--host', host]);
  assert.equal(explicitHost.code, 0, explicitHost.stderr);
  assert.equal(fs.existsSync(path.join(cwd, 'here/netlify-beta/SKILL.md')), true);

  const everything = await runBin(['add', '--all', '--dest', 'all'], { NETLIFY_SKILLS_HOST: host });
  assert.equal(everything.code, 0, everything.stderr);
  assert.deepEqual(fs.readdirSync(path.join(cwd, 'all')).sort(), ['netlify-alpha', 'netlify-beta']);

  fs.rmSync(path.join(cwd, '.claude/skills/netlify-alpha'), { recursive: true });
  fs.cpSync(path.join(fixture, 'old/netlify-alpha'), path.join(cwd, '.claude/skills/netlify-alpha'), { recursive: true });
  const updated = await runBin(['update', '--json'], { NETLIFY_SKILLS_HOST: host });
  assert.equal(updated.code, 0, updated.stderr);
  assert.equal(JSON.parse(updated.stdout).actions.find(({ name }) => name === 'netlify-alpha').action, 'updated');

  const misuse = await runBin(['add']);
  assert.equal(misuse.code, 1);
  assert.match(misuse.stderr, /add needs at least one skill name, or --all/);

  // --remote reconciles against the hosted manifest even when a bundled release exists.
  const remote = await runBin(['status', '--remote', '--json'], { NETLIFY_SKILLS_PACKAGE_ROOT: dist, NETLIFY_SKILLS_HOST: host });
  assert.equal(remote.code, 0, remote.stderr);
  assert.ok(JSON.parse(remote.stdout).summary);
  const clash = await runBin(['status', '--remote', '--host', host]);
  assert.equal(clash.code, 1);
  assert.match(clash.stderr, /one of --remote or --host/);

  // --version forces the hosted path even when a bundled release exists.
  const pinned = await runBin(['add', 'netlify-beta', '--dest', 'pinned', '--version', '1.0.0', '--host', host], { NETLIFY_SKILLS_PACKAGE_ROOT: dist });
  assert.equal(pinned.code, 0, pinned.stderr);
  assert.equal(fs.existsSync(path.join(cwd, 'pinned/netlify-beta/SKILL.md')), true);
  const status = await runBin(['status', '--json'], { NETLIFY_SKILLS_HOST: host });
  assert.equal(status.code, 0, status.stderr);
  assert.ok(JSON.parse(status.stdout).summary, 'status is an alias for check');

  const unknown = await runBin(['remove', 'netlify-alpha']);
  assert.equal(unknown.code, 1);
  assert.match(unknown.stderr, /unknown command: remove/);
});
