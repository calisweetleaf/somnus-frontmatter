// somnus:metadata:v2
// somnus:
//   schema: "somnus://metadata/core/2.0.0"
//   id: "urn:somnus:artifact:01a19a69-8869-73d2-8d0c-7b37b16dd932"
//   revision: 4
//   title: "Plugin"
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
//       - target_ref: "urn:somnus:artifact:01a19a69-8869-73d2-8d0c-7b37b16dd932"
//         aspects: ["content"]
//   time:
//     updated_at: "2026-11-18T01:01:55+00:00"
//   names:
//     slug: "plugin"
//   knowledge:
//     coverage: "artifact"
//     subjects: ["urn:somnus:artifact:01a19a69-8869-73d2-8d0c-7b37b16dd932"]
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
import { afterEach, beforeEach, describe, it } from 'node:test';
import { main, parse } from '../lib/cli.mjs';
import { spawnForm } from '../lib/backend.mjs';

const FAKE_SOMNUS = `#!/usr/bin/env node
const args = process.argv.slice(2);
const version = process.env.FAKE_SOMNUS_VERSION || '2.2.0';
if (args.includes('--version')) { console.log('somnus ' + version); process.exit(0); }
if (args.includes('ls')) { console.log('id\\ttitle'); process.exit(0); }
if (args[0] === 'daemon' && args[1] === 'install') { console.log('wrote unit' + (args.includes('--dry-run') ? ' (dry run)' : '')); process.exit(0); }
if (args[0] === 'daemon' && args[1] === 'status') {
  if (process.env.FAKE_WATCH === 'running') { console.log('field\\tvalue\\nstate\\trunning\\npid\\t42\\nstamped\\t3\\nrevised\\t1\\nerrors\\t0'); process.exit(0); }
  console.log('watcher: never ran'); process.exit(1);
}
if (args.includes('mcp')) {
  let buf = '';
  process.stdin.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\\n')) >= 0) {
      const msg = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1);
      if (msg.id === 1) process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { serverInfo: { name: 'somnus', version } } }) + '\\n');
      if (msg.id === 2) process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { tools: [{ name: 'q' }, { name: 'ls' }, { name: 'check' }] } }) + '\\n');
    }
  });
} else { process.exit(2); }
`;

let home;
let agents;
let somnus;
let lines;

function run(argv, extraEnv = {}) {
  lines = [];
  return main([...argv, '--home', home, '--agents-dir', agents], {
    out: (m) => lines.push(m), err: (m) => lines.push(m),
    env: { PATH: process.env.PATH, ...extraEnv },
  });
}

const read = (...p) => fs.readFileSync(path.join(home, ...p), 'utf8');
const agentsPath = (...p) => path.join(agents, ...p);
const agentsRead = (...p) => fs.readFileSync(agentsPath(...p), 'utf8');
const agentsExists = (...p) => fs.existsSync(agentsPath(...p));

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'somnus-frontmatter-'));
  agents = path.join(home, '.agents');
  somnus = path.join(home, 'bin', 'somnus');
  fs.mkdirSync(path.dirname(somnus));
  fs.writeFileSync(somnus, FAKE_SOMNUS, { mode: 0o755 });
});

afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
});

describe('install, doctor, uninstall', () => {
  it('installs skills, the plugin and a marketplace entry; doctor passes and verifies the handshake', async () => {
    assert.equal(await run(['install', '--somnus', somnus]), 0, lines.join('\n'));

    for (const name of ['somnus-frontmatter', 'somnus-frontmatter-maintain']) {
      assert.ok(agentsExists('skills', name, 'SKILL.md'), `skill ${name} present`);
      assert.ok(agentsExists('skills', name, '.somnus-frontmatter.json'), `skill ${name} carries our marker`);
    }
    assert.ok(agentsExists('skills', 'somnus-frontmatter', 'references', 'mcp-tools.md'));
    assert.ok(agentsExists('skills', 'somnus-frontmatter-maintain', 'references', 'operations.md'));

    for (const rel of ['plugin.json', 'mcp.json', 'skills/somnus-frontmatter/SKILL.md', 'skills/somnus-frontmatter-maintain/SKILL.md', '.somnus-frontmatter.json']) {
      assert.ok(agentsExists('plugins', 'somnus-frontmatter', rel), `plugin carries ${rel}`);
    }
    const manifest = JSON.parse(agentsRead('plugins', 'somnus-frontmatter', 'plugin.json'));
    assert.equal(manifest.name, 'somnus-frontmatter');
    assert.equal(manifest.version, '2.0.0');
    assert.equal(manifest.extensions['com.openai'].interface.displayName, 'Somnus Frontmatter');

    const marketplace = JSON.parse(agentsRead('plugins', 'marketplace.json'));
    const ours = marketplace.plugins.find((p) => p.name === 'somnus-frontmatter');
    assert.deepEqual(ours.source, { source: 'local', path: './somnus-frontmatter' });

    assert.equal(await run(['doctor', '--somnus', somnus]), 0, lines.join('\n'));
    assert.equal(lines.filter((l) => l.includes('serves 3 tools (somnus 2.2.0)')).length, 1, lines.join('\n'));
    assert.ok(lines.includes('all checks passed'));

    assert.equal(await run(['uninstall']), 0, lines.join('\n'));
    assert.ok(!agentsExists('skills', 'somnus-frontmatter'));
    assert.ok(!agentsExists('skills', 'somnus-frontmatter-maintain'));
    assert.ok(!agentsExists('plugins', 'somnus-frontmatter'));
    const after = JSON.parse(agentsRead('plugins', 'marketplace.json'));
    assert.ok(!after.plugins.some((p) => p.name === 'somnus-frontmatter'));
  });

  it('is idempotent when re-installed over its own files', async () => {
    assert.equal(await run(['install', '--somnus', somnus]), 0, lines.join('\n'));
    assert.equal(await run(['install', '--somnus', somnus]), 0, lines.join('\n'));
    assert.equal(await run(['doctor', '--somnus', somnus]), 0, lines.join('\n'));
  });

  it('--dry-run prints actions and changes nothing', async () => {
    assert.equal(await run(['install', '--somnus', somnus, '--dry-run']), 0, lines.join('\n'));
    assert.ok(!agentsExists('skills'));
    assert.ok(!agentsExists('plugins'));
    assert.ok(lines.some((l) => l.includes('dry run')));
  });

  it('refuses to overwrite a foreign skill directory without --force, and moves it aside with it', async () => {
    fs.mkdirSync(agentsPath('skills', 'somnus-frontmatter'), { recursive: true });
    fs.writeFileSync(agentsPath('skills', 'somnus-frontmatter', 'SKILL.md'), 'mine');
    const failed = await run(['install', '--somnus', somnus]);
    assert.equal(failed, 1);
    assert.deepEqual(fs.readFileSync(agentsPath('skills', 'somnus-frontmatter', 'SKILL.md'), 'utf8'), 'mine');
    const forced = await run(['install', '--somnus', somnus, '--force']);
    assert.equal(forced, 0, lines.join('\n'));
    const moved = fs.readdirSync(agentsPath('skills')).filter((n) => n.startsWith('somnus-frontmatter.bak-'));
    assert.equal(moved.length, 1);
    assert.ok(agentsExists('skills', 'somnus-frontmatter', '.somnus-frontmatter.json'));
  });

  it('preserves a foreign marketplace entry and never rewrites an unparseable marketplace.json', async () => {
    fs.mkdirSync(agentsPath('plugins'), { recursive: true });
    const foreign = { name: 'local', interface: { displayName: 'Somnus Local' }, plugins: [{ name: 'mentat', source: { source: 'local', path: './plugins/mentat' } }] };
    fs.writeFileSync(agentsPath('plugins', 'marketplace.json'), JSON.stringify(foreign, null, 2));
    assert.equal(await run(['install', '--somnus', somnus]), 0, lines.join('\n'));
    const merged = JSON.parse(agentsRead('plugins', 'marketplace.json'));
    assert.deepEqual(merged.plugins.map((p) => p.name).sort(), ['mentat', 'somnus-frontmatter']);

    assert.equal(await run(['uninstall']), 0, lines.join('\n'));
    const kept = JSON.parse(agentsRead('plugins', 'marketplace.json'));
    assert.deepEqual(kept.plugins.map((p) => p.name), ['mentat']);

    fs.writeFileSync(agentsPath('plugins', 'marketplace.json'), 'not json at all');
    assert.equal(await run(['install', '--somnus', somnus]), 0, lines.join('\n'));
    assert.equal(agentsRead('plugins', 'marketplace.json'), 'not json at all');
    assert.ok(lines.some((l) => l.includes('NOT rewritten')));
    assert.equal(await run(['uninstall']), 0, lines.join('\n'));
    assert.equal(agentsRead('plugins', 'marketplace.json'), 'not json at all', 'unparseable file left untouched');
  });

  it('uninstall keeps a foreign skill directory it did not create', async () => {
    assert.equal(await run(['install', '--somnus', somnus]), 0);
    fs.rmSync(agentsPath('skills', 'somnus-frontmatter', '.somnus-frontmatter.json'));
    fs.writeFileSync(agentsPath('skills', 'somnus-frontmatter', 'SKILL.md'), 'foreign now');
    assert.equal(await run(['uninstall']), 0, lines.join('\n'));
    assert.ok(agentsExists('skills', 'somnus-frontmatter', 'SKILL.md'));
  });

  it('doctor fails before install and reports drift after a packaged file changes', async () => {
    assert.equal(await run(['doctor', '--somnus', somnus]), 1, lines.join('\n'));
    assert.ok(lines.some((l) => l.includes('FAIL')));
    assert.equal(await run(['install', '--somnus', somnus]), 0);
    const skill = agentsPath('skills', 'somnus-frontmatter', 'references', 'recipes.md');
    fs.appendFileSync(skill, '\ndrifted\n');
    assert.equal(await run(['doctor', '--somnus', somnus]), 1, lines.join('\n'));
    assert.ok(lines.some((l) => l.includes('differs from packaged skill')));
  });

  it('installs the watcher only with --watch and a 2.2.0+ backend', async () => {
    assert.equal(await run(['install', '--somnus', somnus, '--watch']), 0, lines.join('\n'));
    assert.ok(lines.some((l) => l.includes('wrote unit')));
  });
});

describe('error paths and spawn forms', () => {
  it('refuses a somnus that is too old', async () => {
    const result = await run(['install', '--somnus', somnus], { FAKE_SOMNUS_VERSION: '2.0.0' });
    assert.equal(result, 1);
    assert.ok(lines.some((l) => l.includes('older than 2.1.0')));
  });

  it('routes Windows .cmd wrappers through the shell with quoted whitespace args', () => {
    if (process.platform === 'win32') {
      assert.deepEqual(spawnForm('C:\\tools\\somnus.cmd', ['--actor', 'droid', 'mcp']),
        ['C:\\tools\\somnus.cmd', ['--actor', 'droid', 'mcp'], { shell: true }]);
      assert.deepEqual(spawnForm('C:\\somnus tools\\somnus.cmd', ['tool', 'install', '--force', 'C:\\my src']),
        ['C:\\somnus tools\\somnus.cmd', ['tool', 'install', '--force', '"C:\\my src"'], { shell: true }]);
      assert.deepEqual(spawnForm('C:\\tools\\somnus.exe', ['--version']), ['C:\\tools\\somnus.exe', ['--version'], {}]);
    }
    assert.deepEqual(spawnForm('/usr/bin/somnus', ['--version']), ['/usr/bin/somnus', ['--version'], {}]);
  });
});

describe('argument parsing', () => {
  it('parses commands, flags and inline values', () => {
    assert.deepEqual(parse(['install']).command, 'install');
    assert.deepEqual(parse(['doctor', '--agents-dir=/tmp/a']).agentsDir, '/tmp/a');
    assert.deepEqual(parse(['install', '--agents-dir', '/tmp/a']).agentsDir, '/tmp/a');
    assert.deepEqual(parse(['help']).command, 'help');
    assert.throws(() => parse(['--bogus']), /unknown argument/);
    assert.throws(() => parse(['install', 'extra']), /unknown argument/);
    assert.throws(() => parse(['--agents-dir']), /needs a value/);
  });
});
