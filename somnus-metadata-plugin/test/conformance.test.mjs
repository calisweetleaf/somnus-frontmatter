// somnus:metadata:v2
// somnus:
//   schema: "somnus://metadata/core/2.0.0"
//   id: "urn:somnus:artifact:01a1ec2c-4d6d-70b6-afee-796296fa1f8b"
//   revision: 1
//   title: "Conformance"
//   classification:
//     category: "engineering"
//     type: "source-code"
//     role: "informative"
//     scope: "component"
//     tags: []
//   lifecycle:
//     status: "draft"
//   authority:
//     standing: "candidate"
//     scopes:
//       - target_ref: "urn:somnus:artifact:01a1ec2c-4d6d-70b6-afee-796296fa1f8b"
//         aspects: ["content"]
//   time: {}
//   names:
//     slug: "conformance"
//   knowledge:
//     coverage: "artifact"
//     subjects: ["urn:somnus:artifact:01a1ec2c-4d6d-70b6-afee-796296fa1f8b"]
//   access:
//     visibility: "internal"
//     allowed_uses: ["archive", "search", "reason"]
//   ingestion:
//     disposition: "candidate"
//     body_role: "source"
// somnus:end
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const listDir = (rel) => fs.readdirSync(path.join(root, rel), { withFileTypes: true });
const PKG = readJson('package.json');

describe('agent plugin conformance (agent-plugins.org 1.0.0)', () => {
  it('plugin.json satisfies the closed top-level schema surface', () => {
    const plugin = readJson('plugin.json');
    assert.equal(plugin.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
    assert.equal(plugin.name, PKG.name);
    assert.ok(/^[a-z0-9][a-z0-9.-]*$/.test(plugin.name) && !plugin.name.includes('--') && !plugin.name.includes('..'));
    assert.equal(plugin.version, PKG.version);
    const allowed = new Set(['$schema', 'name', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'keywords', 'extensions']);
    for (const key of Object.keys(plugin)) assert.ok(allowed.has(key), `unknown top-level field: ${key}`);
    if (plugin.extensions !== undefined) {
      assert.equal(typeof plugin.extensions, 'object');
      for (const value of Object.values(plugin.extensions)) assert.equal(typeof value, 'object');
    }
  });

  it('mcp.json has exactly $schema and mcpServers, each a valid stdio entry', () => {
    const mcp = readJson('mcp.json');
    assert.deepEqual(Object.keys(mcp).sort(), ['$schema', 'mcpServers']);
    assert.equal(mcp.$schema, 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json');
    assert.ok(Object.keys(mcp.mcpServers).length > 0);
    for (const server of Object.values(mcp.mcpServers)) {
      assert.equal(server.type, 'stdio');
      assert.ok(typeof server.command === 'string' && server.command.length > 0);
      assert.ok(!/\s/.test(server.command), 'command must be a single executable token');
      if (server.args !== undefined) assert.ok(Array.isArray(server.args) && server.args.every((a) => typeof a === 'string'));
      if (server.env !== undefined) {
        assert.ok(typeof server.env === 'object');
        for (const key of Object.keys(server.env)) assert.ok(!['PLUGIN_ROOT', 'PLUGIN_DATA'].includes(key));
      }
    }
  });

  it('every skill in skills/ satisfies the fixed-location contract', () => {
    const skillsDir = path.join(root, 'skills');
    const dirs = listDir('skills').filter((e) => e.isDirectory());
    assert.ok(dirs.length >= 2, 'expected at least somnus-frontmatter and somnus-frontmatter-maintain');
    for (const dir of dirs) {
      const skillFile = path.join(skillsDir, dir.name, 'SKILL.md');
      assert.ok(fs.existsSync(skillFile), `${dir.name} contains SKILL.md`);
      const text = fs.readFileSync(skillFile, 'utf8');
      const match = /^---\n([\s\S]*?)\n---/.exec(text);
      assert.ok(match, `${dir.name} SKILL.md opens with frontmatter`);
      const name = /^name:\s*(\S+)\s*$/m.exec(match[1]);
      assert.equal(name?.[1], dir.name, `skill name matches directory`);
      const description = /^description:\s*(?:>-?\s*)?([\s\S]*?)(?:\n\S|$)/m.exec(match[1]);
      assert.ok(description, `${dir.name} declares a description`);
      assert.match(text, /schema:\s*"somnus:\/\/metadata\/core\/2\.0\.0"/, `${dir.name} carries a somnus envelope`);
    }
  });

  it('package.json files entries all exist and the bin is executable', () => {
    for (const entry of PKG.files) {
      assert.ok(fs.existsSync(path.join(root, entry)), `files entry exists: ${entry}`);
    }
    const bin = path.join(root, PKG.bin['somnus-frontmatter']);
    assert.ok(fs.existsSync(bin));
    assert.ok(fs.readFileSync(bin, 'utf8').startsWith('#!/usr/bin/env node'));
    assert.notEqual(fs.statSync(bin).mode & 0o111, 0, 'bin is executable');
  });

  it('carries no host-specific or legacy native build machinery', () => {
    for (const rel of ['.codex-plugin', '.factory-plugin', 'native', 'scripts', 'lib/hosts.mjs', '.agents']) {
      assert.ok(!fs.existsSync(path.join(root, rel)), `legacy path removed: ${rel}`);
    }
  });
});
