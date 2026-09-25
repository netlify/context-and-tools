#!/usr/bin/env node
// fetch-skill — Reference consumer for hosted, versioned skills (EX-3049, EX-3054).
//
// This deliberately needs no npm dependencies: it reads a release manifest,
// verifies every byte it installs, and can tell whether a local skills
// directory still agrees with that release. Tree hashing is imported from
// build-manifest so producers and consumers cannot silently diverge. It ships
// inside the @netlify/skills package as the `netlify-skills` command
// (bin/netlify-skills.mjs), and it is the implementation the Netlify CLI's
// init and sync lift.
//
// Two sources, same code path:
//   --source <dir>  a release on disk: a directory holding manifest.json and
//                   skills/<name>/… — the @netlify/skills package itself. This
//                   is the command's default, so `npx @netlify/skills@latest`
//                   installs from the package it just fetched, with no second
//                   network hop and no dependency on the hosted address.
//                   Pinning is picking the package version.
//   --host <url>    the hosted site: manifest.json and skills/<name>/… under
//                   that URL, or under v/<version>/ when --version is given.
//                   This is what the Netlify CLI and MCP read.
//
// Usage:
//   node scripts/fetch-skill.mjs (--source <dir> | --host <url> [--version <semver>])
//     (--skill <name> [--skill <name>...] | --all) --dest <dir>
//   node scripts/fetch-skill.mjs (--source <dir> | --host <url> [--version <semver>])
//     --check <dir> [--strict] [--json]
//   node scripts/fetch-skill.mjs (--source <dir> | --host <url> [--version <semver>])
//     --update <dir> [--all] [--reset] [--json]
//
// Options:
//   --source <dir>      Release directory to install from (manifest.json + skills/)
//   --host <url>        Hosted skills base URL
//   --version <semver>  With --host: a pinned release's manifest instead of latest
//   --skill <name>      Skill to download; repeatable. `functions` is accepted
//                       for `netlify-functions`, and prior names resolve.
//   --all               Every active skill (with --dest), or also add the
//                       missing ones (with --update). A literal `*` is accepted
//                       too, for people who reach for it (quote it in a shell).
//   --dest <dir>        Destination containing skill directories
//   --check <dir>       Classify the skill directories here, change nothing
//   --update <dir>      Apply the sync rules to the skill directories here
//   --strict            With --check: also fail on missing, unknown, modified
//   --reset             With --update: replace edited copies too
//   --json              Machine-readable output for --check / --update
//
// Classification of a local skill directory, using the manifest's per-skill
// `history` (every release the skill changed at, with its tree_hash):
//   current     hash equals the latest tree_hash
//   stale       hash equals an older entry: an unedited, outdated copy
//   modified    hash matches no entry: someone edited it locally
//   renamed     directory name is a prior_name of a current skill
//   deprecated  the manifest retired it
//   duplicate   directory name is not ours, but its content is a release of
//               one of our skills (someone copied it under another name)
//   unknown     not in the manifest at all: the user's own skill
// plus `missing`: active skills the manifest has that the directory lacks.
// Together these tell an orchestrator (Agent Runners) what is already in a
// repo before it injects anything, so it neither duplicates nor overwrites.
//
// Sync rules (--update), the same ones the Netlify CLI applies:
//   stale       → replace with latest
//   modified    → leave it and say so; --reset replaces anyway
//   renamed     → install under the new name, remove the old directory
//                 (a modified copy is left alone unless --reset)
//   deprecated  → delete
//   duplicate   → never touched (reported; the named copy is what sync manages)
//   unknown     → never touched
//   missing     → added only with --all, so a single-skill install stays one
//
// A skill is staged only after all of its files match the manifest. Replacing
// an existing directory uses same-parent renames, with rollback on failure.
//
// Name resolution comes from whichever manifest is fetched. A pinned
// `--version` manifest only knows the renames recorded at that tag, so
// checking against an old pin can report a since-renamed skill as `unknown`;
// check against latest to classify names, pin to verify bytes.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashTree } from './build-manifest.mjs';

function fail(message) {
  console.error(`fetch-skill: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = {
    source: null, host: null, version: null, skills: [], all: false, dest: null,
    check: null, update: null, strict: false, reset: false, json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--source': opts.source = argv[++i]; break;
      case '--host': opts.host = argv[++i]; break;
      case '--version': opts.version = argv[++i]; break;
      case '--skill': opts.skills.push(argv[++i]); break;
      case '--all': case '*': opts.all = true; break;
      case '--dest': opts.dest = argv[++i]; break;
      case '--check': opts.check = argv[++i]; break;
      case '--update': opts.update = argv[++i]; break;
      case '--strict': opts.strict = true; break;
      case '--reset': opts.reset = true; break;
      case '--json': opts.json = true; break;
      default: fail(`unknown argument: ${arg}`);
    }
    if (argv[i] === undefined) fail(`${arg} requires a value`);
  }
  if (!opts.host && !opts.source) fail('one of --source <dir> or --host <url> is required');
  if (opts.host && opts.source) fail('--source and --host are mutually exclusive');
  if (opts.host) {
    try { opts.host = new URL(opts.host).toString().replace(/\/$/, ''); }
    catch { fail(`invalid --host URL: ${opts.host}`); }
  } else {
    opts.source = path.resolve(opts.source);
    if (!fs.lstatSync(path.join(opts.source, 'manifest.json'), { throwIfNoEntry: false })?.isFile()) {
      fail(`--source ${opts.source}: no manifest.json there (a release directory holds manifest.json and skills/)`);
    }
    if (opts.version) fail('--version applies to --host only; with --source, the release is the directory itself');
  }

  const modes = [opts.skills.length || opts.dest !== null ? 'download' : null, opts.check !== null ? 'check' : null, opts.update !== null ? 'update' : null]
    .filter(Boolean);
  if (modes.length > 1) fail('--skill/--dest, --check, and --update are mutually exclusive');
  if (!modes.length) {
    if (opts.all) fail('--all needs --dest (install every skill) or --update (also add missing ones)');
    fail('one of --skill <name> with --dest, --all with --dest, --check <dir>, or --update <dir> is required');
  }
  opts.mode = modes[0];
  if (opts.mode === 'download') {
    if (!opts.dest) fail('--dest <dir> is required when downloading');
    if (!opts.skills.length && !opts.all) fail('at least one --skill <name>, or --all, is required');
    if (opts.skills.length && opts.all) fail('--all cannot be combined with --skill');
    if (opts.json) fail('--json is only valid with --check or --update');
    if (opts.strict || opts.reset) fail('--strict and --reset do not apply to downloads');
  }
  if (opts.mode === 'check') {
    if (opts.all || opts.reset) fail('--all and --reset do not apply to --check');
  }
  if (opts.mode === 'update') {
    if (opts.strict) fail('--strict applies to --check only');
  }
  return opts;
}

function urlPath(base, ...parts) {
  return `${base}/${parts.map((part) => encodeURIComponent(part)).join('/')}`;
}

async function fetchBytes(url) {
  let response;
  try { response = await fetch(url); }
  catch (error) { fail(`${url}: ${error.message}`); }
  if (!response.ok) fail(`${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

// Where manifest and skill files come from; see the header.
function makeSource(opts) {
  if (opts.source) {
    const read = (relativeParts) => {
      const file = path.join(opts.source, ...relativeParts);
      try { return fs.readFileSync(file); }
      catch (error) { fail(`${file}: ${error.code === 'ENOENT' ? 'missing from the release directory' : error.message}`); }
    };
    return {
      label: opts.source,
      manifest: async () => read(['manifest.json']),
      file: async (skill, relative) => read(['skills', skill, ...relative.split('/')]),
    };
  }
  const prefix = opts.version ? ['v', opts.version] : [];
  return {
    label: urlPath(opts.host, ...prefix, 'manifest.json'),
    manifest: () => fetchBytes(urlPath(opts.host, ...prefix, 'manifest.json')),
    file: (skill, relative) => fetchBytes(urlPath(opts.host, ...prefix, 'skills', skill, ...relative.split('/'))),
  };
}

async function fetchManifest(source) {
  const bytes = await source.manifest();
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { fail(`${source.label}: invalid JSON`); }
}

// A skill name becomes a directory name under --dest, so the manifest (which
// may come from a URL) must not be able to name `..`, a path, or anything a
// filesystem would treat as special. One segment, ASCII word characters,
// dots and dashes, not starting with a dot.
const SKILL_NAME = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;

function checkSkillName(name, what) {
  if (typeof name !== 'string' || !SKILL_NAME.test(name) || name === '.' || name === '..') {
    fail(`manifest: invalid ${what} ${JSON.stringify(name)}`);
  }
}

function indexes(manifest) {
  if (!Array.isArray(manifest.skills)) fail('manifest has no skills array');
  const exact = new Map();
  const prior = new Map();
  for (const skill of manifest.skills) {
    checkSkillName(skill?.name, 'skill name');
    if (exact.has(skill.name)) fail(`manifest: duplicate skill name ${JSON.stringify(skill.name)}`);
    exact.set(skill.name, skill);
    for (const name of skill.prior_names || []) {
      checkSkillName(name, `prior name of ${skill.name}`);
      if (exact.has(name) || prior.has(name)) fail(`manifest: name ${JSON.stringify(name)} appears more than once`);
      prior.set(name, skill);
    }
  }
  for (const name of exact.keys()) if (prior.has(name)) fail(`manifest: name ${JSON.stringify(name)} is both a skill and a prior name`);
  return { exact, prior };
}

// Manifests published before `history` existed still classify: their single
// known hash is the latest one.
function historyOf(skill) {
  return Array.isArray(skill.history) && skill.history.length
    ? skill.history
    : [{ version: skill.version ?? null, tree_hash: skill.tree_hash }];
}

function safeFile(file) {
  return typeof file === 'string' && file.length > 0 && !file.includes('\\') &&
    !path.posix.isAbsolute(file) && file.split('/').every((part) => part && part !== '.' && part !== '..');
}

function replaceDirectory(staged, target) {
  const old = `${target}.fetch-old-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  const exists = fs.lstatSync(target, { throwIfNoEntry: false });
  if (exists) fs.renameSync(target, old);
  try {
    fs.renameSync(staged, target);
  } catch (error) {
    if (exists) fs.renameSync(old, target);
    throw error;
  }
  if (exists) fs.rmSync(old, { recursive: true, force: true });
}

// Resolve a requested name to an active manifest entry, or fail. Accepts the
// exact name, a prior name, or the name without its `netlify-` prefix
// (`functions` for `netlify-functions`) as long as that is unambiguous.
function resolveSkill(requested, { exact, prior }) {
  let skill = exact.get(requested) || prior.get(requested);
  const shortened = !skill && !requested.startsWith('netlify-') && exact.get(`netlify-${requested}`);
  if (shortened) skill = shortened;
  if (!skill) fail(`unknown skill: ${requested}`);
  if (skill.status === 'deprecated') {
    const replacement = skill.deprecated?.replaced_by;
    fail(`${requested} is deprecated${replacement ? `; use ${replacement}` : ''}`);
  }
  if (!shortened && requested !== skill.name) console.log(`${requested} is now ${skill.name}`);
  return skill;
}

// Read every file of `skill` from the source, verify, and swap it into
// `<dest>/<name>`. Verification runs for the local source too: a truncated
// or tampered package install should fail here, not land in a skills dir.
async function installSkill(opts, source, skill) {
  const files = Object.keys(skill.files || {}).sort();
  const downloaded = [];
  for (const file of files) {
    if (!safeFile(file)) fail(`${skill.name}: unsafe manifest file path: ${file}`);
    const bytes = await source.file(skill.name, file);
    const actual = `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
    if (actual !== skill.files[file]) fail(`${skill.name}/${file}: hash mismatch`);
    downloaded.push([file, bytes]);
  }

  fs.mkdirSync(opts.dest, { recursive: true });
  const staged = fs.mkdtempSync(path.join(opts.dest, `.fetch-${skill.name}-`));
  try {
    const executable = new Set(skill.executable || []);
    for (const [file, bytes] of downloaded) {
      const output = path.join(staged, ...file.split('/'));
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, bytes, { mode: executable.has(file) ? 0o755 : 0o644 });
    }
    replaceDirectory(staged, path.join(opts.dest, skill.name));
  } catch (error) {
    fs.rmSync(staged, { recursive: true, force: true });
    fail(`${skill.name}: could not install: ${error.message}`);
  }
  return files.length;
}

async function download(opts, source, manifest) {
  const index = indexes(manifest);
  const wanted = opts.all
    ? manifest.skills.filter(({ status }) => status === 'active')
    : opts.skills.map((requested) => resolveSkill(requested, index));
  const seen = new Set();
  for (const skill of wanted) {
    if (seen.has(skill.name)) fail(`skill requested more than once after name resolution: ${skill.name}`);
    seen.add(skill.name);
  }
  for (const skill of wanted) {
    const count = await installSkill(opts, source, skill);
    console.log(`installed ${skill.name} ${skill.version} (${count} files)`);
  }
}

// One record per local skill directory (see the header for the statuses),
// plus the active manifest skills that are missing locally.
function classify(root, manifest) {
  const { exact, prior } = indexes(manifest);
  const rootStat = fs.lstatSync(root, { throwIfNoEntry: false });
  if (!rootStat?.isDirectory()) fail(`${root}: not a directory`);

  const records = [];
  const presentActive = new Set();
  const entries = fs.readdirSync(root, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!fs.lstatSync(path.join(root, entry.name, 'SKILL.md'), { throwIfNoEntry: false })?.isFile()) continue;
    const known = exact.get(entry.name);
    const renamed = prior.get(entry.name);
    if (known?.status === 'deprecated') {
      records.push({ name: entry.name, status: 'deprecated', replaced_by: known.deprecated?.replaced_by || null });
      continue;
    }
    const target = known?.status === 'active' ? known : renamed?.status === 'active' ? renamed : null;
    const treeHash = hashTree(path.join(root, entry.name));
    if (!target) {
      const twin = manifest.skills.find((skill) => skill.status === 'active' && historyOf(skill).some((item) => item.tree_hash === treeHash));
      if (twin) {
        const at = historyOf(twin).find((item) => item.tree_hash === treeHash);
        records.push({ name: entry.name, status: 'duplicate', current_name: twin.name, version: twin.version, have: at.version });
      } else {
        records.push({ name: entry.name, status: 'unknown' });
      }
      continue;
    }
    const match = historyOf(target).find((item) => item.tree_hash === treeHash);
    if (target === renamed) {
      records.push({ name: entry.name, status: 'renamed', current_name: target.name, version: target.version, have: match?.version ?? null, modified: !match });
      continue;
    }
    presentActive.add(target.name);
    if (treeHash === target.tree_hash) records.push({ name: entry.name, status: 'current', version: target.version });
    else if (match) records.push({ name: entry.name, status: 'stale', version: target.version, have: match.version });
    else records.push({ name: entry.name, status: 'modified', version: target.version, have: null });
  }

  const missing = manifest.skills
    .filter((skill) => skill.status === 'active' && !presentActive.has(skill.name))
    .map((skill) => skill.name).sort();
  const summary = { current: 0, stale: 0, modified: 0, renamed: 0, deprecated: 0, duplicate: 0, unknown: 0, missing: missing.length };
  for (const record of records) summary[record.status]++;
  return { skills: records, missing, summary };
}

function describe(record) {
  switch (record.status) {
    case 'current': return `current (${record.version})`;
    case 'stale': return `stale (have ${record.have}, latest is ${record.version})`;
    case 'modified': return `modified (edited locally; latest is ${record.version})`;
    case 'renamed': return `renamed -> ${record.current_name}${record.modified ? ' (edited locally)' : ''}`;
    case 'deprecated': return `deprecated${record.replaced_by ? ` -> ${record.replaced_by}` : ''}`;
    case 'duplicate': return `duplicate of ${record.current_name} ${record.have}${record.have !== record.version ? ` (latest is ${record.version})` : ''}`;
    default: return record.status;
  }
}

function summaryLine(summary) {
  return `summary: ${Object.entries(summary).map(([key, value]) => `${key}=${value}`).join(' ')}`;
}

function check(opts, manifest) {
  const result = classify(opts.check, manifest);
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    for (const record of result.skills) console.log(`${record.name}: ${describe(record)}`);
    if (result.missing.length) console.log(`not installed (${result.missing.length}): ${result.missing.join(', ')}`);
    console.log(summaryLine(result.summary));
  }
  // Default: fail on anything --update would change. Strict: also fail when
  // the local set is not exactly the manifest's active set, untouched.
  const { summary } = result;
  if (summary.stale || summary.renamed || summary.deprecated) process.exitCode = 1;
  if (opts.strict && (summary.missing || summary.unknown || summary.modified)) process.exitCode = 1;
}

async function update(opts, source, manifest) {
  const { exact } = indexes(manifest);
  const before = classify(opts.update, manifest);
  const install = { ...opts, dest: opts.update };
  const actions = [];
  const act = (name, action, detail) => {
    actions.push({ name, action, ...(detail ? { detail } : {}) });
    if (!opts.json) console.log(`${name}: ${action}${detail ? ` (${detail})` : ''}`);
  };

  for (const record of before.skills) {
    const dir = path.join(opts.update, record.name);
    switch (record.status) {
      case 'current':
        act(record.name, 'current', record.version);
        break;
      case 'stale':
        await installSkill(install, source, exact.get(record.name));
        act(record.name, 'updated', `${record.have} -> ${record.version}`);
        break;
      case 'modified':
        if (opts.reset) {
          await installSkill(install, source, exact.get(record.name));
          act(record.name, 'reset', `edited copy replaced with ${record.version}`);
        } else {
          act(record.name, 'kept', `edited locally; pass --reset to replace with ${record.version}`);
        }
        break;
      case 'renamed': {
        // The current name may already be installed alongside the old one.
        // Then the old directory is only ever removed, never used to overwrite
        // the current one: the current copy's own record decides its fate,
        // and an edited current copy is kept unless --reset.
        const current = before.skills.find((other) => other.name === record.current_name);
        if (current && current.status === 'modified' && !opts.reset) {
          act(record.name, 'kept', `${record.current_name} is already installed and edited locally; pass --reset to migrate over it`);
        } else if (current) {
          fs.rmSync(dir, { recursive: true, force: true });
          act(record.name, 'removed', `superseded by ${record.current_name}, which is installed`);
        } else if (record.modified && !opts.reset) {
          act(record.name, 'kept', `edited locally; now called ${record.current_name}, pass --reset to migrate`);
        } else {
          await installSkill(install, source, exact.get(record.current_name));
          fs.rmSync(dir, { recursive: true, force: true });
          act(record.name, 'renamed', `-> ${record.current_name} ${record.version}`);
        }
        break;
      }
      case 'deprecated':
        fs.rmSync(dir, { recursive: true, force: true });
        act(record.name, 'removed', `deprecated${record.replaced_by ? `; use ${record.replaced_by}` : ''}`);
        break;
      case 'duplicate':
        act(record.name, 'ignored', `copy of ${record.current_name} ${record.have} under another name`);
        break;
      default:
        act(record.name, 'ignored', 'not a Netlify skill');
    }
  }
  for (const name of before.missing) {
    if (opts.all) {
      const skill = exact.get(name);
      await installSkill(install, source, skill);
      act(name, 'added', skill.version);
    } else {
      act(name, 'missing', 'not installed; pass --all to add');
    }
  }

  const after = classify(opts.update, manifest);
  if (opts.json) process.stdout.write(`${JSON.stringify({ actions, ...after }, null, 2)}\n`);
  else console.log(summaryLine(after.summary));
}

export async function run(argv) {
  const opts = parseArgs(argv);
  const source = makeSource(opts);
  const manifest = await fetchManifest(source);
  if (opts.mode === 'check') check(opts, manifest);
  else if (opts.mode === 'update') await update(opts, source, manifest);
  else await download(opts, source, manifest);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2)).catch((error) => fail(error.message));
}
