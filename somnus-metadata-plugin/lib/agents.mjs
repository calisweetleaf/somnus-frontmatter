// somnus:metadata:v2
// somnus:
//   schema: "somnus://metadata/core/2.0.0"
//   id: "urn:somnus:artifact:01a1ec2b-86f0-74b6-9c08-58a94068d959"
//   revision: 2
//   title: "Agents"
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
//       - target_ref: "urn:somnus:artifact:01a1ec2b-86f0-74b6-9c08-58a94068d959"
//         aspects: ["content"]
//   time:
//     updated_at: "2026-11-18T01:01:32+00:00"
//   names:
//     slug: "agents"
//   knowledge:
//     coverage: "artifact"
//     subjects: ["urn:somnus:artifact:01a1ec2b-86f0-74b6-9c08-58a94068d959"]
//   access:
//     visibility: "internal"
//     allowed_uses: ["archive", "search", "reason"]
//   ingestion:
//     disposition: "candidate"
//     body_role: "source"
// somnus:end
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MARKER, PLUGIN_DIR_NAME, PLUGIN_NAME, PLUGIN_VERSION, SKILL_NAMES,
  PluginError, backup, hashTree, ownedBy, writeAtomic,
} from './util.mjs';

const PACKAGE_ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const SKILLS_SOURCE = path.join(PACKAGE_ROOT, 'skills');
const PLUGIN_FILES = ['plugin.json', 'mcp.json'];

/** Digest of exactly the files an installed Agent Plugin commits: manifest, mcp.json, skills tree. */
export function hashPluginTree(dir) {
  if (!fs.existsSync(dir)) return null;
  const lines = [];
  for (const rel of PLUGIN_FILES) {
    lines.push(`${rel}\0${fs.existsSync(path.join(dir, rel)) ? fs.readFileSync(path.join(dir, rel)) : 'MISSING'}\0`);
  }
  const skills = path.join(dir, 'skills');
  if (fs.existsSync(skills)) {
    const skillHash = hashTree(skills);
    lines.push(`skills\0${skillHash}\0`);
  }
  return Buffer.from(lines.join('')).toString('base64');
}

function pkgSkillDir(name) {
  return path.join(SKILLS_SOURCE, name);
}

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function markerFor(extra) {
  return JSON.stringify({
    plugin: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    installedAt: new Date().toISOString(),
    ...extra,
  }, null, 2) + '\n';
}

/** Install the skills into <agents>/skills/ and the Agent Plugin into <agents>/plugins/. */
export function installAgents({ agentsDir, force = false, dryRun = false, log = () => {} }) {
  const actions = [];
  const skillsDest = path.join(agentsDir, 'skills');
  const pluginsDest = path.join(agentsDir, 'plugins');

  const installCopy = (label, source, dest, extra) => {
    if (fs.existsSync(dest)) {
      const owned = ownedBy(dest);
      if (!owned && !force) {
        throw new PluginError(`${label} exists at ${dest} and is not owned by this tool; re-run with --force to replace it`);
      }
      if (!owned && force) {
        const bak = `${dest}.bak-${PLUGIN_NAME}-${Date.now()}`;
        actions.push(`move aside untracked ${dest} -> ${bak}`);
        if (!dryRun) fs.renameSync(dest, bak);
      } else {
        actions.push(`replace owned ${label} at ${dest}`);
        if (!dryRun) fs.rmSync(dest, { recursive: true, force: true });
      }
    } else {
      actions.push(`install ${label} at ${dest}`);
    }
    if (dryRun) return;
    copyTree(source, dest);
    writeAtomic(path.join(dest, MARKER), markerFor(extra));
  };

  for (const name of SKILL_NAMES) {
    const source = pkgSkillDir(name);
    if (!fs.existsSync(path.join(source, 'SKILL.md'))) {
      throw new PluginError(`packaged skill missing: ${path.join(source, 'SKILL.md')}`);
    }
    installCopy(`skill ${name}`, source, path.join(skillsDest, name), { skillHash: hashTree(source) });
  }

  const pluginDest = path.join(pluginsDest, PLUGIN_DIR_NAME);
  if (fs.existsSync(pluginDest)) {
    const owned = ownedBy(pluginDest);
    if (!owned && !force) {
      throw new PluginError(`plugin exists at ${pluginDest} and is not owned by this tool; re-run with --force to replace it`);
    }
    if (!owned && force) {
      const bak = `${pluginDest}.bak-${PLUGIN_NAME}-${Date.now()}`;
      actions.push(`move aside untracked ${pluginDest} -> ${bak}`);
      if (!dryRun) fs.renameSync(pluginDest, bak);
    } else {
      actions.push(`replace owned plugin at ${pluginDest}`);
      if (!dryRun) fs.rmSync(pluginDest, { recursive: true, force: true });
    }
  } else {
    actions.push(`install plugin at ${pluginDest}`);
  }
  if (!dryRun) {
    fs.mkdirSync(pluginDest, { recursive: true });
    for (const rel of PLUGIN_FILES) fs.copyFileSync(path.join(PACKAGE_ROOT, rel), path.join(pluginDest, rel));
    copyTree(SKILLS_SOURCE, path.join(pluginDest, 'skills'));
    writeAtomic(path.join(pluginDest, MARKER), markerFor({ pluginHash: hashPluginTree(pluginDest) }));
  }

  const entry = {
    name: PLUGIN_DIR_NAME,
    source: { source: 'local', path: `./${PLUGIN_DIR_NAME}` },
    policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
    category: 'Developer Tools',
  };
  const marketplace = path.join(pluginsDest, 'marketplace.json');
  let marketplaceChanged = false;
  if (fs.existsSync(marketplace)) {
    const raw = fs.readFileSync(marketplace, 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      actions.push(`marketplace.json is not valid JSON; NOT rewritten — add this entry manually:\n${JSON.stringify(entry, null, 2)}`);
      parsed = null;
    }
    if (parsed) {
      const plugins = Array.isArray(parsed.plugins) ? parsed.plugins.filter((p) => p?.name !== PLUGIN_DIR_NAME) : [];
      parsed.plugins = [...plugins, entry];
      actions.push(`upsert ${PLUGIN_DIR_NAME} in ${marketplace} (foreign entries preserved; backup written)`);
      if (!dryRun) {
        backup(marketplace);
        writeAtomic(marketplace, JSON.stringify(parsed, null, 2) + '\n');
      }
      marketplaceChanged = true;
    }
  } else {
    const fresh = { name: 'local', interface: { displayName: 'Somnus Local' }, plugins: [entry] };
    actions.push(`create ${marketplace} with the ${PLUGIN_DIR_NAME} entry`);
    if (!dryRun) writeAtomic(marketplace, JSON.stringify(fresh, null, 2) + '\n');
    marketplaceChanged = true;
  }

  for (const action of actions) log(action);
  log('Agent Plugins clients discover the plugin from the plugins/ directory; skills from skills/.');
  log('Hosts without Agent Plugins need a one-line MCP entry, e.g.');
  log(`  command: somnus`);
  log(`  args: ["--actor", "${PLUGIN_NAME}", "mcp"]`);
  return { marketplaceChanged };
}

/** Remove exactly what install added: our skills, our plugin, our marketplace entry. */
export function uninstallAgents({ agentsDir, dryRun = false, log = () => {} }) {
  const actions = [];
  for (const name of SKILL_NAMES) {
    const dest = path.join(agentsDir, 'skills', name);
    if (fs.existsSync(dest)) {
      if (ownedBy(dest)) {
        actions.push(`remove skill ${name} at ${dest}`);
        if (!dryRun) fs.rmSync(dest, { recursive: true, force: true });
      } else {
        actions.push(`keep ${dest}: no ${MARKER} (left for a deliberate --force removal)`);
      }
    }
  }
  const pluginDest = path.join(agentsDir, 'plugins', PLUGIN_DIR_NAME);
  if (fs.existsSync(pluginDest)) {
    if (ownedBy(pluginDest)) {
      actions.push(`remove plugin at ${pluginDest}`);
      if (!dryRun) fs.rmSync(pluginDest, { recursive: true, force: true });
    } else {
      actions.push(`keep ${pluginDest}: no ${MARKER}`);
    }
  }
  const marketplace = path.join(agentsDir, 'plugins', 'marketplace.json');
  if (fs.existsSync(marketplace)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(marketplace, 'utf8'));
      if (Array.isArray(parsed.plugins) && parsed.plugins.some((p) => p?.name === PLUGIN_DIR_NAME)) {
        parsed.plugins = parsed.plugins.filter((p) => p?.name !== PLUGIN_DIR_NAME);
        actions.push(`remove ${PLUGIN_DIR_NAME} from ${marketplace} (backup written)`);
        if (!dryRun) {
          backup(marketplace);
          writeAtomic(marketplace, JSON.stringify(parsed, null, 2) + '\n');
        }
      }
    } catch {
      actions.push(`marketplace.json at ${marketplace} is not valid JSON; left untouched`);
    }
  }
  for (const action of actions) log(action);
  log('backend, registry and their history were left in place');
}

/** Inspect install state; returns a list of {status, text} findings for the caller to print. */
export function inspectAgents({ agentsDir }) {
  const findings = [];
  for (const name of SKILL_NAMES) {
    const dest = path.join(agentsDir, 'skills', name);
    const source = pkgSkillDir(name);
    const marker = ownedBy(dest);
    if (!fs.existsSync(dest)) {
      findings.push({ status: 'FAIL', text: `skill ${name} missing at ${dest}` });
      continue;
    }
    if (!marker) {
      findings.push({ status: 'FAIL', text: `skill ${name} at ${dest} is not ours (no ${MARKER})` });
      continue;
    }
    const drift = hashTree(dest) === hashTree(source) ? null : 'content differs from packaged skill';
    findings.push({
      status: drift ? 'FAIL' : 'ok  ',
      text: `skill ${name} ${marker.version ?? '?'} at ${dest}${drift ? `: ${drift}` : ' matches packaged skill'}`,
    });
  }
  const pluginDest = path.join(agentsDir, 'plugins', PLUGIN_DIR_NAME);
  const pluginMarker = ownedBy(pluginDest);
  if (!fs.existsSync(pluginDest)) {
    findings.push({ status: 'FAIL', text: `plugin missing at ${pluginDest}` });
  } else if (!pluginMarker) {
    findings.push({ status: 'FAIL', text: `plugin at ${pluginDest} is not ours (no ${MARKER})` });
  } else {
    let manifest = null;
    try {
      manifest = JSON.parse(fs.readFileSync(path.join(pluginDest, 'plugin.json'), 'utf8'));
    } catch {
      // fall through
    }
    const versionOk = manifest?.version === PLUGIN_VERSION;
    const drift = hashPluginTree(pluginDest) === hashPluginTree(PACKAGE_ROOT) ? null : 'content differs from packaged plugin';
    findings.push({
      status: versionOk && !drift ? 'ok  ' : 'FAIL',
      text: `plugin ${manifest?.version ?? '?'} at ${pluginDest}`
        + (versionOk ? '' : ` (package is ${PLUGIN_VERSION})`)
        + (drift ? `: ${drift}` : ''),
    });
  }
  const marketplace = path.join(agentsDir, 'plugins', 'marketplace.json');
  let registered = false;
  try {
    const parsed = JSON.parse(fs.readFileSync(marketplace, 'utf8'));
    registered = Array.isArray(parsed.plugins) && parsed.plugins.some((p) => p?.name === PLUGIN_DIR_NAME);
  } catch {
    registered = false;
  }
  findings.push({
    status: registered ? 'ok  ' : 'warn',
    text: registered
      ? `marketplace entry present in ${marketplace}`
      : `no ${PLUGIN_DIR_NAME} entry in ${marketplace} (clients loading the plugin by path are unaffected)`,
  });
  return findings;
}

/** Read the installed plugin's declared MCP server, exactly as an Agent Plugins client would. */
export function installedMcpServer({ agentsDir }) {
  const file = path.join(agentsDir, 'plugins', PLUGIN_DIR_NAME, 'mcp.json');
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const servers = parsed?.mcpServers ?? {};
    const entry = servers[Object.keys(servers)[0]];
    if (entry && typeof entry.command === 'string') {
      return { name: Object.keys(servers)[0], command: entry.command, args: Array.isArray(entry.args) ? entry.args : [] };
    }
  } catch {
    // fall through
  }
  return null;
}
