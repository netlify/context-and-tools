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
// Delta: each grouping is keyed on `manifest.generation.source_hash` plus the
// importer version. Unchanged source_hash → skip. So repeated dispatches of the
// same docs commit are no-ops, and only real content changes open a PR.
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

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const config = readJson(opts.config);
  const agentContextDir = config.source?.agentContextDir || 'agent-context';
  const importerVersion = config.importerVersion ?? 1;

  const state = fs.existsSync(opts.state) ? readJson(opts.state) : {};
  const changed = [];

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

    const prev = state[grouping];
    if (prev && prev.sourceHash === sourceHash && prev.importerVersion === importerVersion) {
      console.log(`[skip] ${grouping}: unchanged (source_hash ${sourceHash.slice(0, 12)})`);
      continue;
    }

    const skillSrc = path.join(groupingDir, 'skill');
    if (!fs.existsSync(path.join(skillSrc, 'SKILL.md'))) {
      fail(`${grouping}: changed but ${skillSrc}/SKILL.md is missing`);
    }

    // Defend against mapping drift: the generated skill must own the name we map to.
    const declaredName = readSkillName(path.join(skillSrc, 'SKILL.md'));
    if (declaredName !== skill) {
      fail(`${grouping}: mapping says skill "${skill}" but generated SKILL.md declares name "${declaredName}"`);
    }

    const dest = path.join(opts.skillsDir, skill);
    const affects = unionAffects(manifest.changes);
    const reason = prev ? `source_hash ${prev.sourceHash.slice(0, 12)} → ${sourceHash.slice(0, 12)}` : 'first import';
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

  if (!opts.dryRun && changed.length) {
    fs.writeFileSync(opts.state, JSON.stringify(state, null, 2) + '\n');
  }

  console.log(changed.length ? `\nChanged: ${changed.join(', ')}` : '\nNo changes.');

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `changed=${changed.join(',')}\nchanged_count=${changed.length}\n`,
    );
  }
}

main();
