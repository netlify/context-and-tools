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
// relative-path set, file bytes, and the executable bit (the only mode bit
// git tracks; cpSync copies modes, so the gate must see them), computed by
// treeDiffers() below. A missing destination, or one that exists but is not
// a directory, counts as changed and is replaced. Symlinks and other
// non-regular entries in either tree are unsupported and fail the run loudly:
// cpSync would copy them, but the gate can't compare them. manifest
// .generation.source_hash, docsCommit, and affects are still written to
// state.json on import, but purely as provenance — they are never consulted
// to decide skip vs. import. A grouping with no `skill/SKILL.md` is skipped
// only if it was never imported; once imported, its disappearance fails the
// run rather than leaving a stale skill behind.
//
// Intermediates: `agent-context/<grouping>/context.md` and `system.md` are
// the docs-side inputs the skill is generated from. They are never imported;
// their sha256 is remembered in state.json (intermediateHash) as provenance.
// If it moves while `skill/**` stays byte-identical, the run warns once and
// imports nothing — it never fails. The receiver can't tell "forgot to
// regenerate" from "regeneration was a no-op", which is why this is a
// warning; the real check belongs in docs CI.
//
// Accepted edge: a regeneration whose output is byte-identical to what's
// already imported imports nothing and leaves the entry's source_hash alone,
// so state.json provenance can lag the newest source_hash. Harmless, and it guarantees
// changed_count > 0 always implies a real git diff — previously, re-importing
// byte-identical content could make the workflow's `git commit` fail on an
// empty stage.
//
// Ordering vs. provenance: the per-grouping entries are a provenance LOG and
// are allowed to lag (an unchanged source_hash writes no entry, so two
// groupings can legitimately record different commits). The top-level
// `lastImportedCommit` is the ordering AUTHORITY and is written on EVERY
// non-dry run, no-op included, so a consumer can always answer "what did we
// last import?" without aggregating per-grouping entries. Deriving position
// from provenance is what breaks when entries legitimately disagree — see
// scripts/ctx-ordering-guard.mjs and the "Monotonicity guard" step in
// .github/workflows/ctx-pipeline-receive.yml, which read this key rather than
// reconciling docsCommit across entries. The receiver itself never validates
// ordering — it records position. The guard runs before it and is what
// rejects an older commit, so a manual `--docs-commit` on an older SHA run
// outside the workflow WILL move the key backwards.
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
// When GITHUB_OUTPUT is set, writes `changed=<csv>`, `changed_count=<n>` and
// `state_changed=<true|false>`.

import crypto from 'node:crypto';
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

// sha256 over the grouping's intermediates — context.md then system.md, the
// docs-side inputs the skill is generated from. The receiver never imports
// them; it only remembers their hash so "intermediate edited, skill not
// regenerated" is visible instead of silent. Each file contributes
// `${name}\0` + bytes + `\0` only if it exists as a regular file; null when
// neither does.
function hashIntermediates(groupingDir) {
  const hash = crypto.createHash('sha256');
  let found = false;
  for (const name of ['context.md', 'system.md']) {
    const file = path.join(groupingDir, name);
    if (!fs.lstatSync(file, { throwIfNoEntry: false })?.isFile()) continue;
    hash.update(`${name}\0`);
    hash.update(fs.readFileSync(file));
    hash.update('\0');
    found = true;
  }
  return found ? hash.digest('hex') : null;
}

// For log lines: a hash → its first 12 chars, null → "none".
function shortHash(hash) {
  return typeof hash === 'string' ? hash.slice(0, 12) : 'none';
}

// Relative POSIX-style paths of every regular file under `dir`, recursive,
// sorted. Empty directories are not represented — only files matter for the
// delta. Anything that is neither a regular file nor a directory fails
// loudly: cpSync would copy it, but the delta can't compare it, so ignoring
// it here would skip a new or retargeted symlink forever. (readdirSync with
// withFileTypes reports a symlink as a symlink, never as its target.) The
// root gets the same treatment: existsSync on `skill/SKILL.md` happily
// follows a symlinked `skill/`, so the check has to happen here.
function listFiles(dir) {
  const rootStat = fs.lstatSync(dir, { throwIfNoEntry: false });
  if (!rootStat?.isDirectory()) {
    fail(`${dir}: not a directory (symlinked or missing skill trees are not supported)`);
  }

  const out = [];
  (function walk(current, prefix) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(abs, rel);
      } else if (entry.isFile()) {
        out.push(rel);
      } else {
        fail(`${abs}: symlinks and other non-regular entries are not supported in skill trees`);
      }
    }
  })(dir, '');
  return out.sort();
}

// The only mode bit git tracks (100644 vs 100755).
function isExecutable(file) {
  return Boolean(fs.statSync(file).mode & 0o111);
}

// True iff `srcDir` and `destDir` differ: a different relative-path set of
// files, or any shared-path file with different bytes or a different
// executable bit. A missing `destDir` (e.g. first import), or one that is
// not a directory (a stray file or symlink at `skills/<name>`), counts as
// different — the caller's rmSync + cpSync then replaces it. The source tree
// is listed (and so validated) before that short-circuit: otherwise a first
// import would never see an unsupported entry, and cpSync would copy it.
function treeDiffers(srcDir, destDir) {
  const srcFiles = listFiles(srcDir);

  const destStat = fs.lstatSync(destDir, { throwIfNoEntry: false });
  if (!destStat?.isDirectory()) return true;

  const destFiles = listFiles(destDir);
  if (srcFiles.length !== destFiles.length) return true;

  for (let i = 0; i < srcFiles.length; i++) {
    if (srcFiles[i] !== destFiles[i]) return true;
    const src = path.join(srcDir, srcFiles[i]);
    const dest = path.join(destDir, destFiles[i]);
    if (!fs.readFileSync(src).equals(fs.readFileSync(dest))) return true;
    if (isExecutable(src) !== isExecutable(dest)) return true;
  }
  return false;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const config = readJson(opts.config);
  const agentContextDir = config.source?.agentContextDir || 'agent-context';

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
    const prev = state[grouping];
    const dest = path.join(opts.skillsDir, skill);

    if (!fs.existsSync(path.join(skillSrc, 'SKILL.md'))) {
      if (prev || fs.lstatSync(dest, { throwIfNoEntry: false })) {
        fail(`${grouping}: ${skillSrc}/SKILL.md is missing but this grouping was imported before (state entry or ${dest} exists) — refusing to leave a stale skill in place`);
      }
      // Never imported: same forward-compatibility as the manifest check —
      // one not-yet-onboarded grouping must not block the others.
      console.log(`[skip] ${grouping}: ${skillSrc}/SKILL.md is missing`);
      continue;
    }

    const intermediateHash = hashIntermediates(groupingDir);

    if (!treeDiffers(skillSrc, dest)) {
      if (prev) {
        if (!('intermediateHash' in prev)) {
          // Legacy entry, predates the field: seed silently (possibly with
          // null) — no baseline to compare.
          prev.intermediateHash = intermediateHash;
        } else if (prev.intermediateHash !== intermediateHash) {
          // null is a real value here: both intermediates deleted upstream
          // with the skill untouched is drift too.
          const msg = `${grouping}: context.md/system.md changed upstream (${shortHash(prev.intermediateHash)} → ${shortHash(intermediateHash)}) but skill/ is byte-identical — skill may not have been regenerated; nothing imported`;
          console.log(`[warn] ${msg}`);
          if (process.env.GITHUB_ACTIONS) console.log(`::warning title=ctx-receive::${msg}`);
          // Remember the new hash so this fires once per upstream change, not every run.
          prev.intermediateHash = intermediateHash;
        }
      }
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
        affects,
        intermediateHash,
      };
    }
    changed.push(grouping);
  }

  // The ordering key advances on every run, imports or not — that's what makes
  // it usable for ordering. Only write when we were actually told which commit
  // we're importing; inventing one from a manifest would record a position we
  // can't defend.
  const prevOrdering = state[ORDERING_KEY];
  if (!opts.dryRun && opts.docsCommit) state[ORDERING_KEY] = opts.docsCommit;

  // One write, after every mutation above — an import, a seeded / updated
  // intermediateHash with zero imports, or an ordering-only advance — and
  // only when the serialized state actually moved. The receive workflow
  // commits on `state_changed` too, so hash-only and ordering-only updates
  // persist instead of being discarded with the runner's checkout.
  const nextState = JSON.stringify(state, null, 2) + '\n';
  const stateChanged =
    !opts.dryRun && (!fs.existsSync(opts.state) || fs.readFileSync(opts.state, 'utf8') !== nextState);
  if (stateChanged) fs.writeFileSync(opts.state, nextState);

  console.log(changed.length ? `\nChanged: ${changed.join(', ')}` : '\nNo changes.');
  // Only when the position itself moved: a drift warning at the same commit
  // changes state (intermediateHash) without advancing it and must not claim
  // to. The docsCommit check also keeps `.slice()` off a null.
  if (stateChanged && !changed.length && opts.docsCommit && prevOrdering !== opts.docsCommit) {
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
