#!/usr/bin/env node
// ctx-receive — Stage 2 of the Context Pipeline (AX-97), receiving side.
//
// Deterministic distribution. Given a checkout of netlify/docs, this imports
// each grouping's already-generated, already-validated skill from
// `agent-context/<grouping>/skill/` into `skills/<name>/`, byte for byte. No
// model call, no content rewrite: docs owns authoring + AXIS testing upstream,
// so a faithful copy is enough (test-where-the-mutation-happens). If we ever
// start transforming content here, that is when this repo earns its own AXIS.
//
// Delta: a grouping is "changed" iff `agent-context/<grouping>/skill/**` (in
// the docs checkout) differs from `skills/<skill>/**` in this repo — the
// relative-path set plus file bytes, computed by treeDiffers() below. A
// missing destination directory counts as changed. manifest.generation
// .source_hash, docsCommit, and importerVersion are still written to
// state.json on import, but purely as provenance — they are never consulted
// to decide skip vs. import.
//
// Accepted edge: a regeneration whose output is byte-identical to what's
// already imported imports nothing and writes no per-grouping state entry, so
// per-grouping provenance can lag the newest source_hash. Harmless, and it
// guarantees changed_count > 0 always implies a real git diff — previously,
// re-importing byte-identical content could make the workflow's `git commit`
// fail on an empty stage.
//
// Ordering vs. provenance: the per-grouping entries above are a provenance
// LOG and are allowed to lag. The top-level `lastImportedCommit` is the
// ordering AUTHORITY and is written on EVERY non-dry run, no-op included, so
// a consumer can always answer "what did we last import?" without aggregating
// per-grouping entries. Deriving position from provenance is what breaks when
// entries legitimately disagree — see the monotonicity guard in
// .github/workflows/ctx-pipeline-receive.yml, which must read this key rather
// than reconciling docsCommit across entries.
//
// Zero dependencies, Node 18+ (uses fs.cpSync / fs.rmSync).
//
// Usage:
//   node scripts/ctx-receive.mjs --docs <docs-checkout> [options]
//
// Options:
//   --docs <path>          Path to a netlify/docs checkout (required)
//   --docs-commit <sha>    Commit the docs checkout resolves to (provenance)
//   --config <path>        Default: .ctx-gen/config.json
//   --state <path>         Default: .ctx-gen/state.json
//   --skills-dir <path>    Default: skills
//   --dry-run              Report what would change; write nothing
//
// When GITHUB_OUTPUT is set, writes `changed=<csv>` and `changed_count=<n>`.

import fs from 'node:fs';
import path from 'node:path';

// Reserved top-level key in state.json: the ordering authority. Never a
// grouping name — see the collision check in main().
const ORDERING_KEY = 'lastImportedCommit';

function parseArgs(argv) {
  const opts = {
    docs: null,
    docsCommit: null,
    config: '.ctx-gen/config.json',
    state: '.ctx-gen/state.json',
    skillsDir: 'skills',
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--docs': opts.docs = argv[++i]; break;
      case '--docs-commit': opts.docsCommit = argv[++i]; break;
      case '--config': opts.config = argv[++i]; break;
      case '--state': opts.state = argv[++i]; break;
      case '--skills-dir': opts.skillsDir = argv[++i]; break;
      case '--dry-run': opts.dryRun = true; break;
      default:
        fail(`unknown argument: ${arg}`);
    }
  }
  if (!opts.docs) fail('--docs <path> is required');
  return opts;
}

function fail(msg) {
  console.error(`ctx-receive: ${msg}`);
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Minimal frontmatter reader — we only need `name` to defend against mapping
// drift. Not a general YAML parser.
function readSkillName(skillMdPath) {
  const text = fs.readFileSync(skillMdPath, 'utf8');
  if (!text.startsWith('---\n')) fail(`${skillMdPath}: missing YAML frontmatter`);
  const end = text.indexOf('\n---', 4);
  if (end === -1) fail(`${skillMdPath}: unterminated frontmatter`);
  const block = text.slice(4, end);
  for (const line of block.split('\n')) {
    const m = line.match(/^name:\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, '');
  }
  fail(`${skillMdPath}: frontmatter has no name`);
}

function unionAffects(changes) {
  const set = new Set();
  for (const c of changes || []) for (const a of c.affects || []) set.add(a);
  return [...set].sort();
}

// Relative POSIX-style paths of every regular file under `dir`, recursive,
// sorted. Symlinks and empty directories are not represented — only files
// matter for the delta.
function listFiles(dir) {
  const out = [];
  (function walk(current, prefix) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(abs, rel);
      } else if (entry.isFile()) {
        out.push(rel);
      }
    }
  })(dir, '');
  return out.sort();
}

// True iff `srcDir` and `destDir` differ: a different relative-path set of
// files, or any shared-path file with different bytes. A missing `destDir`
// counts as different (e.g. first import).
function treeDiffers(srcDir, destDir) {
  if (!fs.existsSync(destDir)) return true;

  const srcFiles = listFiles(srcDir);
  const destFiles = listFiles(destDir);
  if (srcFiles.length !== destFiles.length) return true;

  for (let i = 0; i < srcFiles.length; i++) {
    if (srcFiles[i] !== destFiles[i]) return true;
    const a = fs.readFileSync(path.join(srcDir, srcFiles[i]));
    const b = fs.readFileSync(path.join(destDir, destFiles[i]));
    if (!a.equals(b)) return true;
  }
  return false;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const config = readJson(opts.config);
  const agentContextDir = config.source?.agentContextDir || 'agent-context';
  const importerVersion = config.importerVersion ?? 1;

  const state = fs.existsSync(opts.state) ? readJson(opts.state) : {};
  const changed = [];

  // `lastImportedCommit` is a reserved top-level key, not a grouping entry.
  // Fail loudly rather than let a grouping of that name shadow the ordering
  // authority.
  if (config.groupings.some(({ grouping }) => grouping === ORDERING_KEY)) {
    fail(`"${ORDERING_KEY}" is reserved for the ordering key and can't be a grouping name`);
  }

  for (const { grouping, skill } of config.groupings) {
    const groupingDir = path.join(opts.docs, agentContextDir, grouping);
    const manifestPath = path.join(groupingDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      // Forward-compatible: we may list a grouping before docs onboards it.
      console.log(`[skip] ${grouping}: no manifest at ${manifestPath}`);
      continue;
    }

    const manifest = readJson(manifestPath);
    const sourceHash = manifest.generation?.source_hash;
    if (!sourceHash) fail(`${manifestPath}: missing generation.source_hash`);

    const skillSrc = path.join(groupingDir, 'skill');
    if (!fs.existsSync(path.join(skillSrc, 'SKILL.md'))) {
      fail(`${grouping}: ${skillSrc}/SKILL.md is missing`);
    }

    const prev = state[grouping];
    const dest = path.join(opts.skillsDir, skill);

    if (!treeDiffers(skillSrc, dest)) {
      console.log(`[skip] ${grouping}: surface identical (source_hash ${sourceHash.slice(0, 12)})`);
      continue;
    }

    // Defend against mapping drift: the generated skill must own the name we map to.
    const declaredName = readSkillName(path.join(skillSrc, 'SKILL.md'));
    if (declaredName !== skill) {
      fail(`${grouping}: mapping says skill "${skill}" but generated SKILL.md declares name "${declaredName}"`);
    }

    const affects = unionAffects(manifest.changes);
    // Factual, not inferential: this only states what changed and what
    // didn't. An unchanged source_hash with a differing surface can mean an
    // upstream hand edit (docs#801 shape) or local drift in skills/ — either
    // way, the import below restores parity with the source.
    const prevSourceHash = typeof prev?.sourceHash === 'string' ? prev.sourceHash : null;
    const reason = !prev
      ? 'first import'
      : prevSourceHash === sourceHash
        ? `surface differs, source_hash unchanged at ${sourceHash.slice(0, 12)}`
        : `source_hash ${prevSourceHash ? prevSourceHash.slice(0, 12) : '<unknown>'} → ${sourceHash.slice(0, 12)}`;
    console.log(`[import] ${grouping} → ${dest} (${reason}; affects: ${affects.join(', ') || 'n/a'})`);

    if (!opts.dryRun) {
      // Mirror the whole skill tree so upstream deletions propagate.
      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(skillSrc, dest, { recursive: true });
      state[grouping] = {
        sourceHash,
        docsCommit: opts.docsCommit || manifest.generated_from?.commit || null,
        importerVersion,
        affects,
      };
    }
    changed.push(grouping);
  }

  // The ordering key advances on every run, imports or not — that's what makes
  // it usable for ordering. Only write when we were actually told which commit
  // we're importing; inventing one from a manifest would record a position we
  // can't defend.
  if (!opts.dryRun && opts.docsCommit) state[ORDERING_KEY] = opts.docsCommit;

  const nextState = JSON.stringify(state, null, 2) + '\n';
  const stateChanged =
    !opts.dryRun && (!fs.existsSync(opts.state) || fs.readFileSync(opts.state, 'utf8') !== nextState);
  if (stateChanged) fs.writeFileSync(opts.state, nextState);

  console.log(changed.length ? `\nChanged: ${changed.join(', ')}` : '\nNo changes.');
  if (stateChanged && !changed.length) {
    console.log(`State advanced to ${opts.docsCommit.slice(0, 12)} with no skill changes.`);
  }

  if (process.env.GITHUB_OUTPUT) {
    // `state_changed` exists so the workflow can commit an ordering-only
    // advance. Gating the commit on changed_count alone would write the key
    // and then discard it, leaving the guard reading a stale position.
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `changed=${changed.join(',')}\nchanged_count=${changed.length}\nstate_changed=${stateChanged}\n`,
    );
  }
}

main();
