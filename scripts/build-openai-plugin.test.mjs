import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { beforeEach, test } from 'node:test';
import { buildOpenaiPlugin, validatePackage } from './build-openai-plugin.mjs';

let repo;

function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

function writeJson(file, value) {
  write(file, `${JSON.stringify(value, null, 2)}\n`);
}

function overlay(overrides = {}) {
  return {
    name: 'netlify',
    extensions: { 'com.openai': { interface: {
      displayName: 'Netlify',
      shortDescription: 'Build and deploy on Netlify',
      longDescription: 'Long description.',
      developerName: 'Netlify',
      websiteURL: 'https://www.netlify.com',
      supportURL: 'https://www.netlify.com/support/',
      privacyPolicyURL: 'https://www.netlify.com/privacy/',
      termsOfServiceURL: 'https://www.netlify.com/legal/terms-of-use/',
      brandColor: '#05BDBA',
      composerIcon: './assets/icon.png',
      logo: './assets/logo.png',
      screenshots: ['./assets/screenshot-1.png'],
      ...overrides,
    } } },
  };
}

beforeEach(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), 'build-openai-plugin-test-'));
  writeJson(path.join(repo, 'agent-plugin/plugin.json'), {
    $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
    name: 'netlify-skills',
    version: '1.2.3',
    description: 'Netlify skills',
  });
  writeJson(path.join(repo, 'agent-plugin/mcp.json'), {
    mcpServers: { netlify: { type: 'streamable-http', url: 'https://netlify-mcp.netlify.app/mcp' } },
  });
  write(path.join(repo, 'agent-plugin/skills/netlify-alpha/SKILL.md'), '---\nname: netlify-alpha\ndescription: Alpha\n---\n');
  writeJson(path.join(repo, 'openai/plugin.json'), overlay());
  for (const name of ['icon.png', 'logo.png', 'screenshot-1.png']) write(path.join(repo, 'openai/assets', name), 'png');
  write(path.join(repo, 'openai/assets/.gitkeep'), '');
});

test('builds a zip with the merged manifest, skills, and assets at its root', () => {
  const out = path.join(repo, 'build/openai');
  const { dir, zip } = buildOpenaiPlugin({ out, repo });

  assert.equal(zip, path.join(out, 'netlify-1.2.3.zip'));
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'plugin.json'), 'utf8'));
  assert.equal(manifest.name, 'netlify');
  assert.equal(manifest.version, '1.2.3');
  assert.equal(manifest.description, 'Netlify skills');
  assert.equal(manifest.extensions['com.openai'].interface.displayName, 'Netlify');
  assert.ok(!fs.existsSync(path.join(dir, 'assets/.gitkeep')));

  const listing = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\n').filter(Boolean);
  for (const entry of ['plugin.json', 'mcp.json', 'skills/netlify-alpha/SKILL.md', 'assets/icon.png']) {
    assert.ok(listing.includes(entry), `${entry} in zip`);
  }
  // The source package is untouched.
  const base = JSON.parse(fs.readFileSync(path.join(repo, 'agent-plugin/plugin.json'), 'utf8'));
  assert.equal(base.name, 'netlify-skills');
  assert.equal(base.extensions, undefined);
});

test('rebuilds over its own output but refuses a foreign directory', () => {
  const out = path.join(repo, 'build/openai');
  buildOpenaiPlugin({ out, repo, zip: false });
  buildOpenaiPlugin({ out, repo, zip: false });
  write(path.join(repo, 'other/keep.txt'), 'x');
  assert.throws(() => buildOpenaiPlugin({ out: path.join(repo, 'other'), repo }), /not created by this script/);
  assert.throws(() => buildOpenaiPlugin({ out: repo, repo }), /refusing/);
});

test('reports missing assets, over-long fields, and disallowed apps', () => {
  const bad = overlay({ shortDescription: 'x'.repeat(31), logo: './assets/missing.png' });
  bad.extensions['com.openai'].apps = './.app.json';
  writeJson(path.join(repo, 'openai/plugin.json'), bad);
  assert.throws(
    () => buildOpenaiPlugin({ out: path.join(repo, 'build/openai'), repo }),
    (error) => /shortDescription is 31 characters/.test(error.message)
      && /missing\.png does not exist/.test(error.message)
      && /apps is not allowed/.test(error.message),
  );
});

test('limits starter prompts to three unique entries of 128 characters', () => {
  writeJson(path.join(repo, 'openai/plugin.json'), overlay({ defaultPrompt: ['a', 'a', 'b', 'x'.repeat(129)] }));
  assert.throws(
    () => buildOpenaiPlugin({ out: path.join(repo, 'build/openai'), repo }),
    (error) => /has 4 prompts/.test(error.message)
      && /defaultPrompt\[3\] is 129 characters/.test(error.message)
      && /must be unique/.test(error.message),
  );
});

test('takes the version from agent-plugin, never the overlay', () => {
  writeJson(path.join(repo, 'openai/plugin.json'), { ...overlay(), version: '9.9.9' });
  assert.throws(() => buildOpenaiPlugin({ out: path.join(repo, 'build/openai'), repo }), /must not set version/);
});

test('warns, rather than fails, on review details that can come from the dashboard', () => {
  const { dir } = buildOpenaiPlugin({ out: path.join(repo, 'build/openai'), repo, zip: false });
  const { errors, warnings } = validatePackage(dir);
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 2);
});
