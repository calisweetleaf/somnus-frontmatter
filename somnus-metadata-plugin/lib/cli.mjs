// somnus:metadata:v2
// somnus:
//   schema: "somnus://metadata/core/2.0.0"
//   id: "urn:somnus:artifact:01a19a69-87dd-718d-998f-06f9d6eed395"
//   revision: 4
//   title: "Cli"
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
//       - target_ref: "urn:somnus:artifact:01a19a69-87dd-718d-998f-06f9d6eed395"
//         aspects: ["content"]
//   time:
//     updated_at: "2026-11-18T01:01:32+00:00"
//   names:
//     slug: "cli"
//   knowledge:
//     coverage: "artifact"
//     subjects: ["urn:somnus:artifact:01a19a69-87dd-718d-998f-06f9d6eed395"]
//   access:
//     visibility: "internal"
//     allowed_uses: ["archive", "search", "reason"]
//   ingestion:
//     disposition: "candidate"
//     body_role: "source"
// somnus:end
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MIN_BACKEND, atLeast, backendVersion, installBackend, mcpHandshake, resolveSomnus } from './backend.mjs';
import { installAgents, inspectAgents, installedMcpServer, uninstallAgents } from './agents.mjs';
import { PLUGIN_NAME, PLUGIN_VERSION, PluginError, UsageError } from './util.mjs';

const AGENTS_ENV = 'SOMNUS_FRONTMATTER_AGENTS';
const USAGE = `usage: somnus-frontmatter <command> [options]

commands:
  install     skills into ~/.agents/skills/, Agent Plugin into ~/.agents/plugins/
  uninstall   remove what install added (backend and registry stay)
  doctor      backend, registry, watcher, skill/plugin fidelity, live MCP handshake
  help        show this help

options:
  --agents-dir DIR  agents home (default: ${AGENTS_ENV} or ~/.agents)
  --home DIR        home directory for somnus resolution (default: the OS home)
  --somnus PATH     somnus executable to use (default: found on PATH or ~/.local/bin)
  --install-backend SRC  install or upgrade the backend first: pip install --upgrade SRC,
                       then uv tool, then pipx, if pip is missing or refused (PEP 668);
                       SRC is a PyPI name such as somnus-metadata or a source checkout path
  --watch           install: also register the 24/7 watcher ('somnus daemon install'; needs somnus 2.2.0+)
  --force           replace directories this tool did not create
  --dry-run         print the actions without changing anything
`;

const FLAGS = { '--agents-dir': 'agentsDir', '--somnus': 'somnus', '--install-backend': 'installBackend', '--home': 'home' };
const SWITCHES = { '--force': 'force', '--dry-run': 'dryRun', '--watch': 'watch' };
const WATCH_BACKEND = [2, 2, 0];

export function parse(argv) {
  const opts = { command: null, agentsDir: null, somnus: null, installBackend: null, home: null, force: false, dryRun: false, watch: false };
  for (let i = 0; i < argv.length; i += 1) {
    const [flag, inline] = argv[i].startsWith('--') ? argv[i].split(/=(.*)/s) : [argv[i]];
    if (flag in SWITCHES) {
      opts[SWITCHES[flag]] = true;
    } else if (flag in FLAGS) {
      const value = inline ?? argv[(i += 1)];
      if (value === undefined || value === '') throw new UsageError(`${flag} needs a value`);
      opts[FLAGS[flag]] = value;
    } else if (flag === '-h' || flag === '--help' || flag === 'help') {
      opts.command = 'help';
    } else if (!flag.startsWith('-') && opts.command === null) {
      opts.command = flag;
    } else {
      throw new UsageError(`unknown argument: ${argv[i]}`);
    }
  }
  return opts;
}

function agentsDirOf(opts) {
  return path.resolve(opts.agentsDir ?? process.env[AGENTS_ENV] ?? path.join(opts.home ? path.resolve(opts.home) : os.homedir(), '.agents'));
}

function requireBackend(opts, ctx, out) {
  if (opts.installBackend) {
    out(`backend: installing from ${opts.installBackend}`);
    if (!opts.dryRun) installBackend(opts.installBackend, ctx.env.PATH);
  }
  const somnus = resolveSomnus(opts.somnus, ctx.home, ctx.env.PATH);
  if (!somnus) {
    throw new PluginError("somnus is not installed. Install it with 'pip install somnus-metadata' in a"
      + " virtual environment on PATH, or 'uv tool install somnus-metadata'"
      + ' (or rerun with --install-backend somnus-metadata), then retry.');
  }
  const version = backendVersion(somnus, ctx.env);
  if (!version) throw new PluginError(`'${somnus} --version' failed; reinstall somnus-metadata`);
  if (!atLeast(version, MIN_BACKEND)) {
    throw new PluginError(`somnus ${version.join('.')} is older than ${MIN_BACKEND.join('.')};`
      + " upgrade with 'uv tool install --force somnus-metadata' or --install-backend");
  }
  out(`backend: ${somnus} (somnus ${version.join('.')})`);
  return somnus;
}

function installWatcher(somnus, opts, ctx, out) {
  const version = backendVersion(somnus, ctx.env);
  if (!version || !atLeast(version, WATCH_BACKEND)) {
    throw new PluginError(`--watch needs somnus ${WATCH_BACKEND.join('.')} or newer; upgrade with`
      + " 'pip install -U somnus-metadata' or --install-backend somnus-metadata");
  }
  const args = ['daemon', 'install', ...(opts.dryRun ? ['--dry-run'] : [])];
  out(`[watcher] ${somnus} ${args.join(' ')}`);
  const run = spawnSync(somnus, args, { encoding: 'utf8', timeout: 120_000, env: ctx.env });
  for (const line of `${run.stdout ?? ''}${run.stderr ?? ''}`.trim().split('\n').filter(Boolean)) out(`  ${line}`);
  if (run.status !== 0) throw new PluginError(`'somnus ${args.join(' ')}' exited ${run.status}`);
}

function registryLine(somnus, env) {
  const run = spawnSync(somnus, ['ls', '--tsv'], { encoding: 'utf8', timeout: 30_000, env });
  if (run.status === 0) {
    const count = Math.max(0, run.stdout.trim().split('\n').length - 1);
    return ['ok  ', `registry: ${count} managed artifact(s) present`];
  }
  const reason = `${run.stdout}${run.stderr}`.trim().split('\n')[0] || `exit ${run.status}`;
  return ['warn', `registry: ${reason}`];
}

function watcherLine(somnus, version, env) {
  if (!atLeast(version, WATCH_BACKEND)) {
    return ['warn', `watcher: needs somnus ${WATCH_BACKEND.join('.')}+ (have ${version.join('.')})`];
  }
  const run = spawnSync(somnus, ['daemon', 'status', '--tsv'], { encoding: 'utf8', timeout: 30_000, env });
  const fields = Object.fromEntries(`${run.stdout ?? ''}`.trim().split('\n').slice(1)
    .map((line) => line.split('\t')).filter((cols) => cols.length === 2));
  if (fields.state === 'running') {
    return ['ok  ', `watcher: running (pid ${fields.pid}; stamped ${fields.stamped}, revised ${fields.revised}, errors ${fields.errors})`];
  }
  const why = fields.state ? 'stopped' : 'never ran';
  return ['warn', `watcher: ${why}; 'somnus daemon install' (or 'somnus-frontmatter install --watch') runs it 24/7`];
}

function install(opts, ctx, out) {
  const somnus = requireBackend(opts, ctx, out);
  const agentsDir = agentsDirOf(opts);
  installAgents({ agentsDir, force: opts.force, dryRun: opts.dryRun, log: out });
  if (opts.watch) installWatcher(somnus, opts, ctx, out);
  out(opts.dryRun ? 'dry run: nothing changed' : "done; run 'somnus-frontmatter doctor', then restart your agent");
  return 0;
}

function uninstall(opts, ctx, out) {
  const agentsDir = agentsDirOf(opts);
  uninstallAgents({ agentsDir, dryRun: opts.dryRun, log: out });
  return 0;
}

async function doctor(opts, ctx, out) {
  let problems = 0;
  const report = (status, text) => {
    if (status === 'FAIL') problems += 1;
    out(`${status} ${text}`);
  };
  const agentsDir = agentsDirOf(opts);
  const somnus = resolveSomnus(opts.somnus, ctx.home, ctx.env.PATH);
  const version = somnus ? backendVersion(somnus, ctx.env) : null;
  if (!version) {
    report('FAIL', "backend: somnus not found or not runnable; install with 'pip install somnus-metadata'"
      + " (in a virtual environment on PATH) or 'uv tool install somnus-metadata'");
  } else {
    const current = atLeast(version, MIN_BACKEND);
    report(current ? 'ok  ' : 'FAIL', `backend: ${somnus} (somnus ${version.join('.')})`
      + (current ? '' : `; needs ${MIN_BACKEND.join('.')} or newer`));
    report(...registryLine(somnus, ctx.env));
    report(...watcherLine(somnus, version, ctx.env));
  }
  for (const finding of inspectAgents({ agentsDir })) report(finding.status, finding.text);
  const declared = installedMcpServer({ agentsDir });
  if (!declared) {
    report('FAIL', `plugin at ${agentsDir}/plugins/somnus-frontmatter declares no usable MCP server`);
  } else {
    const command = declared.command === 'somnus' ? (resolveSomnus(opts.somnus, ctx.home, ctx.env.PATH) ?? declared.command) : declared.command;
    const shake = await mcpHandshake(command, declared.args, { env: ctx.env });
    const commandLine = [command, ...declared.args].join(' ');
    report(shake.ok ? 'ok  ' : 'FAIL', shake.ok
      ? `MCP '${commandLine}' serves ${shake.tools.length} tools (${shake.serverInfo?.name ?? '?'} ${shake.serverInfo?.version ?? '?'})`
      : `MCP '${commandLine}' failed: ${shake.error}`);
  }
  out(problems ? `${problems} problem(s); 'somnus-frontmatter install' repairs the agent entries` : 'all checks passed');
  return problems ? 1 : 0;
}

const COMMANDS = { install, uninstall, doctor };

export async function main(argv, { out = console.log, err = console.error, env = process.env } = {}) {
  try {
    const opts = parse(argv);
    if (opts.command === null || opts.command === 'help') {
      out(`${PLUGIN_NAME} ${PLUGIN_VERSION}\n${USAGE}`);
      return opts.command === 'help' ? 0 : 2;
    }
    const command = COMMANDS[opts.command];
    if (!command) throw new UsageError(`unknown command: ${opts.command}`);
    const ctx = { home: path.resolve(opts.home ?? os.homedir()), agentsDir: opts.agentsDir, env };
    return await command(opts, ctx, out);
  } catch (error) {
    if (!(error instanceof PluginError)) throw error;
    err(`somnus-frontmatter: ${error.message}`);
    if (error instanceof UsageError) err("run 'somnus-frontmatter help' for usage");
    return error instanceof UsageError ? 2 : 1;
  }
}
