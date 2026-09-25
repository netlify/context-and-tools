#!/usr/bin/env node
// build-manifest — Publish the verifiable skill index (EX-3049, EX-3054).
//
// A manifest binds every hosted skill file to its bytes and records enough
// provenance for consumers to explain where generated skills came from.
//
// tree_hash (schema_version 1) covers the same three things the receiver's
// byte comparison does — path, executable bit, content — and is defined so
// any language can reproduce it without matching a JSON serializer:
//
//   for each file, in byte-order-sorted relative POSIX path order:
//     mode = "100755" if the executable bit is set, else "100644"
//     line = path + "\0" + mode + "\0" + lowercase-hex-sha256-of-bytes + "\n"
//   tree_hash = "sha256:" + hex(sha256(concat(lines)))
//
// The manifest's `executable` array lists the paths with the bit set so a
// client can recompute the hash from `files` alone. Changing this formula is
// a schema_version bump.
//
// Per-skill version and history. Skills change independently, so each entry
// carries its own `version` — the release in which its files last changed —
// and a `history`: every release at which the skill changed, with the
// tree_hash it had from then on. Both are derived, never hand-maintained:
// git's tree object for `skills/<name>` is compared across release tags to
// find the change points, and each change point's tree_hash is computed from
// the blobs at that tag. A skill that differs from the newest tag (i.e. is
// being released now) gets a final entry at the manifest's version.
//
// History lets a client tell an outdated copy (hash matches an entry) from an
// edited one (matches none). Pinning is `HOST/v/<skill version>/skills/<name>/…`.
// This needs the tags: a shallow clone must fetch them, or pass --no-history
// for a local preview in which every skill is stamped with the manifest version.
//
// Usage:
//   node scripts/build-manifest.mjs [options]
//
// Options:
//   --root <dir>          Tree to inspect (default: .)
//   --out <file>|-        Output file, or stdout (default: -)
//   --version <semver>    Override package.json version
//   --commit <sha>        Override the tree's git commit
//   --published-at <iso>  Override the publication time
//   --no-history          Skip per-skill version derivation from git tags

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function fail(message) {
  console.error(`build-manifest: ${message}`);
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listFiles(dir) {
  const rootStat = fs.lstatSync(dir, { throwIfNoEntry: false });
  if (!rootStat?.isDirectory()) {
    throw new Error(`${dir}: not a directory (symlinked or missing skill trees are not supported)`);
  }

  const files = [];
  (function walk(current, prefix) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(absolute, relative);
      else if (entry.isFile()) files.push(relative);
      else throw new Error(`${absolute}: symlinks and other non-regular entries are not supported in skill trees`);
    }
  })(dir, '');
  return files.sort();
}

// Returns { files, executable }: `files` maps relative path → "sha256:<hex>"
// with keys in sorted order; `executable` is the sorted subset of paths with
// the executable bit set (the only mode bit git tracks).
export function hashFiles(dir) {
  const files = {};
  const executable = [];
  for (const relative of listFiles(dir)) {
    const absolute = path.join(dir, ...relative.split('/'));
    const bytes = fs.readFileSync(absolute);
    files[relative] = `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
    if (fs.statSync(absolute).mode & 0o111) executable.push(relative);
  }
  return { files, executable };
}

export function hashFilesMap(files, executable = []) {
  const exec = new Set(executable);
  const hash = crypto.createHash('sha256');
  for (const relative of Object.keys(files).sort()) {
    const mode = exec.has(relative) ? '100755' : '100644';
    hash.update(`${relative}\0${mode}\0${files[relative].replace(/^sha256:/, '')}\n`);
  }
  return `sha256:${hash.digest('hex')}`;
}

export function hashTree(dir) {
  const { files, executable } = hashFiles(dir);
  return hashFilesMap(files, executable);
}

function git(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  return match ? match.slice(1).map(Number) : null;
}

export function compareVersions(a, b) {
  const av = parseVersion(a);
  const bv = parseVersion(b);
  for (let i = 0; i < 3; i++) if (av[i] !== bv[i]) return av[i] - bv[i];
  return 0;
}

// Release tags (vMAJOR.MINOR.PATCH only), ascending.
export function releaseTags(repo) {
  return git(repo, ['tag', '--list', 'v*'])
    .split('\n')
    .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag))
    .sort((a, b) => compareVersions(a.slice(1), b.slice(1)));
}

// Map of skill name → git tree object id for `skills/<name>` at `ref`.
// Empty when the ref has no skills/ directory.
// `git ls-tree -z` records: "<mode> <type> <oid>\t<path>\0". NUL-delimited so
// a path with a space, quote, tab or non-ASCII byte comes through verbatim
// instead of C-quoted or split, which would silently mis-hash a tree.
function lsTree(repo, args) {
  const out = execFileSync('git', ['-C', repo, 'ls-tree', '-z', ...args], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  const entries = [];
  let start = 0;
  while (start < out.length) {
    const end = out.indexOf(0, start);
    if (end === -1) break;
    const record = out.subarray(start, end);
    const tab = record.indexOf(0x09);
    const [mode, type, oid] = record.subarray(0, tab).toString().split(' ');
    entries.push({ mode, type, oid, path: record.subarray(tab + 1).toString('utf8') });
    start = end + 1;
  }
  return entries;
}

export function skillTrees(repo, ref) {
  let entries;
  try {
    entries = lsTree(repo, [ref, '--', 'skills/']);
  } catch {
    return new Map();
  }
  const trees = new Map();
  for (const { type, oid, path: entryPath } of entries) {
    if (type === 'tree' && entryPath.startsWith('skills/netlify-')) trees.set(entryPath.slice('skills/'.length), oid);
  }
  return trees;
}

// tree_hash of `skills/<name>` as committed at `ref`, computed from git
// objects alone (no checkout): ls-tree gives mode + blob per file, cat-file
// gives the bytes. Same formula as hashTree on a working directory.
export function treeHashAt(repo, ref, name) {
  const prefix = `skills/${name}/`;
  const entries = lsTree(repo, ['-r', ref, '--', `skills/${name}`])
    .filter(({ type, path: entryPath }) => type === 'blob' && entryPath.startsWith(prefix))
    .map(({ mode, oid, path: entryPath }) => ({ mode, oid, relative: entryPath.slice(prefix.length) }));
  const blobs = execFileSync('git', ['-C', repo, 'cat-file', '--batch'], {
    input: entries.map(({ oid }) => oid).join('\n') + '\n',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
  const files = {};
  const executable = [];
  let offset = 0;
  for (const { mode, relative } of entries) {
    const headerEnd = blobs.indexOf(0x0a, offset);
    const [, , size] = blobs.subarray(offset, headerEnd).toString().split(' ');
    const start = headerEnd + 1;
    const end = start + Number(size);
    files[relative] = `sha256:${crypto.createHash('sha256').update(blobs.subarray(start, end)).digest('hex')}`;
    if (mode === '100755') executable.push(relative);
    offset = end + 1;
  }
  const sorted = Object.fromEntries(Object.keys(files).sort().map((key) => [files[key] && key, files[key]]));
  return hashFilesMap(sorted, executable.sort());
}

// History of one skill: every release at which its tree changed, ascending,
// each with the tree_hash it had from then on. `tags` are the release tags
// before the head (ascending, each resolved to its skill trees); the head is
// appended as `headVersion` when it differs from the newest tag. A skill
// removed and re-added counts as changed when it reappears. `hashAt` is
// injectable for tests; the default reads git objects.
export function skillHistory({ name, headOid, headTreeHash, headVersion, tags, hashAt }) {
  const changes = [];
  let previous;
  for (const { version, trees } of tags) {
    const oid = trees.get(name);
    if (oid !== undefined && oid !== previous) changes.push(version);
    previous = oid;
  }
  const history = changes.map((version) => ({ version, tree_hash: hashAt(version, name) }));
  if (headOid !== previous) history.push({ version: headVersion, tree_hash: headTreeHash });
  return history;
}

// Release tags strictly before `version`, resolved to skill trees.
export function tagsBefore(repo, version) {
  return releaseTags(repo)
    .filter((tag) => compareVersions(tag.slice(1), version) < 0)
    .map((tag) => ({ version: tag.slice(1), trees: skillTrees(repo, tag) }));
}

function readFrontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') throw new Error(`${file}: missing YAML frontmatter`);
  const end = lines.indexOf('---', 1);
  if (end === -1) throw new Error(`${file}: unterminated frontmatter`);

  const values = {};
  for (const line of lines.slice(1, end)) {
    const match = line.match(/^(name|description):\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    const quoted = value.match(/^(['"])(.*)\1$/);
    if (quoted) value = quoted[2];
    values[match[1]] = value;
  }
  if (!values.name) throw new Error(`${file}: frontmatter has no name`);
  if (!values.description) throw new Error(`${file}: frontmatter has no description`);
  return values;
}

function optionalJson(file) {
  return fs.existsSync(file) ? readJson(file) : null;
}

function registryData(root, discovered) {
  const registry = optionalJson(path.join(root, 'skill-registry.json')) || {};
  const skills = registry.skills || {};
  const deprecated = registry.deprecated || {};
  const priorBySkill = new Map();
  const occupied = new Map([...discovered].map((name) => [name, `skill ${JSON.stringify(name)}`]));

  for (const [name, entry] of Object.entries(skills)) {
    if (!discovered.has(name)) throw new Error(`skill-registry.json: skill ${JSON.stringify(name)} is not a discovered skill`);
    const priorNames = entry?.prior_names || [];
    if (!Array.isArray(priorNames)) throw new Error(`skill-registry.json: prior_names for ${JSON.stringify(name)} must be an array`);
    for (const prior of priorNames) {
      if (typeof prior !== 'string' || !prior) throw new Error(`skill-registry.json: prior name for ${JSON.stringify(name)} must be a non-empty string`);
      if (occupied.has(prior)) throw new Error(`skill-registry.json: name ${JSON.stringify(prior)} appears more than once (${occupied.get(prior)} and prior name)`);
      occupied.set(prior, `prior name of ${JSON.stringify(name)}`);
    }
    priorBySkill.set(name, [...priorNames]);
  }

  for (const [name, entry] of Object.entries(deprecated)) {
    if (occupied.has(name)) throw new Error(`skill-registry.json: name ${JSON.stringify(name)} appears more than once (${occupied.get(name)} and deprecated name)`);
    occupied.set(name, 'deprecated name');
    if (!entry || typeof entry.since !== 'string' || typeof entry.description !== 'string' || !entry.description) {
      throw new Error(`skill-registry.json: deprecated ${JSON.stringify(name)} requires since and description`);
    }
  }
  return { priorBySkill, deprecated };
}

function provenanceData(root) {
  const config = optionalJson(path.join(root, '.ctx-gen', 'config.json'));
  const state = optionalJson(path.join(root, '.ctx-gen', 'state.json'));
  const bySkill = new Map();
  if (!config || !state) return bySkill;
  for (const mapping of config.groupings || []) {
    const entry = state[mapping.grouping];
    if (!entry) continue;
    bySkill.set(mapping.skill, {
      grouping: mapping.grouping,
      docs_commit: entry.docsCommit,
      source_hash: entry.sourceHash,
    });
  }
  return bySkill;
}

// `history`: `false` stamps every skill with the manifest version and a
// one-entry history (no git); `{ repo, headRef, tags, hashAt? }` derives from
// those (hashAt(version, name) may be a memoized treeHashAt when many
// manifests are built from one repo); omitted derives from git at `root` with
// HEAD and every earlier release tag.
export function buildManifest({ root = '.', version, commit, publishedAt, history } = {}) {
  root = path.resolve(root);
  if (version === undefined) version = readJson(path.join(root, 'package.json')).version;
  if (history === undefined) {
    if (!releaseTags(root).length) {
      throw new Error(`${root}: no release tags found; per-skill versions need full git history (fetch-depth: 0), or pass --no-history`);
    }
    history = { repo: root, headRef: 'HEAD', tags: tagsBefore(root, version) };
  }
  const headTrees = history ? skillTrees(history.repo, history.headRef) : null;
  const hashAt = history ? (history.hashAt || ((tagVersion, name) => treeHashAt(history.repo, `v${tagVersion}`, name))) : null;
  if (commit === undefined) {
    try {
      commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    } catch {
      throw new Error(`${root}: unable to resolve git commit; pass --commit`);
    }
  }
  if (publishedAt === undefined) publishedAt = new Date().toISOString();

  // Same rule as the cursor/codex/agent-plugin/gemini generators: a skill is
  // `skills/netlify-*/` with a SKILL.md. Anything else under skills/ (the
  // router, a stray folder) is not published.
  const skillsDir = path.join(root, 'skills');
  const discovered = new Set();
  if (fs.existsSync(skillsDir)) {
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith('netlify-')) continue;
      const skillMd = path.join(skillsDir, entry.name, 'SKILL.md');
      if (fs.lstatSync(skillMd, { throwIfNoEntry: false })?.isFile()) discovered.add(entry.name);
    }
  }

  const { priorBySkill, deprecated } = registryData(root, discovered);
  const provenance = provenanceData(root);
  const entries = [];
  for (const name of discovered) {
    const dir = path.join(skillsDir, name);
    const frontmatter = readFrontmatter(path.join(dir, 'SKILL.md'));
    if (frontmatter.name !== name) {
      throw new Error(`${path.join(dir, 'SKILL.md')}: directory name ${JSON.stringify(name)} does not match frontmatter name ${JSON.stringify(frontmatter.name)}`);
    }
    const { files, executable } = hashFiles(dir);
    const treeHash = hashFilesMap(files, executable);
    const skillHist = history
      ? skillHistory({ name, headOid: headTrees.get(name), headTreeHash: treeHash, headVersion: version, tags: history.tags, hashAt })
      : [{ version, tree_hash: treeHash }];
    const entry = {
      name,
      status: 'active',
      version: skillHist[skillHist.length - 1].version,
      prior_names: priorBySkill.get(name) || [],
      description: frontmatter.description,
      tree_hash: treeHash,
      files,
      executable,
      history: skillHist,
    };
    if (provenance.has(name)) entry.provenance = provenance.get(name);
    entries.push(entry);
  }
  for (const [name, data] of Object.entries(deprecated)) {
    const deprecatedInfo = { since: data.since };
    if (data.replaced_by !== undefined) deprecatedInfo.replaced_by = data.replaced_by;
    entries.push({
      name,
      status: 'deprecated',
      version: null,
      prior_names: [],
      description: data.description,
      tree_hash: null,
      files: {},
      executable: [],
      history: [],
      deprecated: deprecatedInfo,
    });
  }
  entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

  return {
    schema_version: 1,
    version,
    published_at: publishedAt,
    source: { repo: 'netlify/context-and-tools', commit },
    skills: entries,
  };
}

function parseArgs(argv) {
  const options = { root: '.', out: '-' };
  for (let i = 0; i < argv.length; i++) {
    const argument = argv[i];
    const value = () => {
      const next = argv[++i];
      if (next === undefined || next.startsWith('--')) throw new Error(`${argument} requires a value`);
      return next;
    };
    switch (argument) {
      case '--root': options.root = value(); break;
      case '--out': options.out = value(); break;
      case '--version': options.version = value(); break;
      case '--commit': options.commit = value(); break;
      case '--published-at': options.publishedAt = value(); break;
      case '--no-history': options.history = false; break;
      default: throw new Error(`unknown argument: ${argument}`);
    }
  }
  return options;
}

function main() {
  try {
    const { out, ...options } = parseArgs(process.argv.slice(2));
    const output = `${JSON.stringify(buildManifest(options), null, 2)}\n`;
    if (out === '-') process.stdout.write(output);
    else {
      fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
      fs.writeFileSync(out, output);
    }
  } catch (error) {
    fail(error.message);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
