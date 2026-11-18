---
somnus:
  schema: "somnus://metadata/core/2.0.0"
  id: "urn:somnus:artifact:01a19a69-87b3-76bf-bbae-83b732aa9e46"
  revision: 7
  title: "somnus-frontmatter"
  classification:
    category: "context"
    type: "index"
    role: "informative"
    scope: "component"
    tags: []
  lifecycle:
    status: "draft"
  authority:
    standing: "candidate"
    scopes:
      - target_ref: "urn:somnus:artifact:01a19a69-87b3-76bf-bbae-83b732aa9e46"
        aspects: ["content"]
  time:
    updated_at: "2026-11-18T01:01:28+00:00"
  names:
    slug: "somnus-metadata-plugin"
  knowledge:
    coverage: "artifact"
    subjects: ["urn:somnus:artifact:01a19a69-87b3-76bf-bbae-83b732aa9e46"]
  access:
    visibility: "internal"
    allowed_uses: ["archive", "search", "reason"]
  ingestion:
    disposition: "candidate"
    body_role: "narrative"
---
# somnus-frontmatter

Host-agnostic [Agent Plugin](https://agent-plugins.org) and Agent Skills for **Somnus
Frontmatter** — a local-first registry that gives every managed file one `somnus:` block
(frontmatter in Markdown, a comment envelope in code and config, a `metadata.somnus` member
in notebooks, or a `<file>.somnus.yaml` sidecar for formats with no carrier), backed by one
global SQLite database (`$SOMNUS_HOME/somnus.db`) with identity, revisions, relations,
claims, conflicts and full-text search.

Somnus Frontmatter is the agent-facing distribution of that system. The Python package
(`somnus-metadata` on PyPI; commands `somnus` and `somnus-metadata`) owns all behavior.
This npm package distributes two skills and the plugin manifest that expose it — it holds
no metadata logic of its own.

## What installs where

`somnus-frontmatter install` writes exactly two things, and touches no agent's config
files:

| Destination | Contents | Consumers |
| --- | --- | --- |
| `~/.agents/skills/somnus-frontmatter/` | the everyday operating skill: search, adopt, revise, validate | every Agent Skills client (OpenCode, Codex, Droid, Cursor, …) |
| `~/.agents/skills/somnus-frontmatter-maintain/` | the substrate skill: watcher/daemon, roots, conflicts, E_HOST, backups, upgrades | agents asked to maintain the system |
| `~/.agents/plugins/somnus-frontmatter/` | the Agent Plugin: `plugin.json` + `mcp.json` + `skills/` | Agent Plugins clients; any client loading a plugin by path |
| `~/.agents/plugins/marketplace.json` | one `somnus-frontmatter` entry upserted (backup kept; foreign entries preserved; an unparseable file is refused, never rewritten) | local plugin marketplaces |

Hosts without Agent Plugins support need their own MCP registration; `install` prints the
generic entry (`somnus --actor somnus-frontmatter mcp`, stdio) to adapt. The installer
never rewrites host configs in this version.

## Requirements

- Node.js ≥ 18.17 for the installer.
- `somnus` ≥ 2.1.0 on PATH (2.1.1+ for full unmanaged-file discovery; 2.2.0+ for the 24/7
  watcher and daemon). Install it with `pip install -U somnus-metadata` in a venv, or
  `uv tool install somnus-metadata` / `pipx install somnus-metadata`.

## Install

```sh
npm i -g somnus-frontmatter          # installs the `somnus-frontmatter` command
somnus-frontmatter install           # skills + plugin into ~/.agents/ (add --watch for the daemon)
somnus-frontmatter doctor            # backend, registry, watcher, skill/plugin fidelity, live MCP handshake
somnus-frontmatter uninstall         # removes exactly what install added; backend and registry stay
```

`--agents-dir DIR` redirects the install root (default `SOMNUS_FRONTMATTER_AGENTS` or
`~/.agents`). `--dry-run` prints every action. `--force` replaces directories the tool did
not create (the originals are moved aside, not deleted). `install --install-backend SRC`
installs or upgrades the Python backend first (pip, falling back to uv tool, then pipx).

## MCP server

Agent Plugins clients launch the server declared in the plugin's `mcp.json`:

```json
{ "mcpServers": { "somnus-frontmatter": { "type": "stdio", "command": "somnus", "args": ["--actor", "somnus-frontmatter", "mcp"] } } }
```

One tool per CLI command (`q`, `ls`, `check`, `stamp`, `new`, `set`, `status`, `bump`,
`index`, `stale`, `brief`, …); results are the command's text or TSV. Tool results keep
the host's models off raw shell when possible. Non-zero exits set `isError` with the
diagnostic in the text — read it; it usually names the file, field, and fix.

## The two skills

- **somnus-frontmatter** — using the registry: proactive retrieval before creating
  documents, adopting files, revision hygiene after edits, validation, lifecycle, and
  reasoning over the collection graph.
- **somnus-frontmatter-maintain** — running the substrate: the watcher and
  `somnus daemon`, registered roots and `config.toml` / `.somnus.toml`, revision and
  identity conflicts, E_HOST incidents, registry backup/restore, and upgrades.

## Safety

- Every install is backed up (`<file>.bak-somnus-frontmatter-<UTC stamp>`) before a
  changed file is rewritten; unchanged files are not rewritten.
- Directories this tool wrote carry a `.somnus-frontmatter.json` marker (plugin, version,
  content hash, install time). Install refuses to replace, and uninstall leaves, any
  directory without it (`--force` deliberately overrides, moving the old one aside).
- `doctor` compares the installed skills and plugin against the packaged bytes and runs a
  live MCP handshake; drift is a `FAIL`, not a warning you can miss.
- The daemon and the registry are never started, stopped, or reconfigured by `install`
  unless you pass `--watch` (which only runs `somnus daemon install`).

## Upgrading from plugin 1.x (`somnus-metadata-plugin`)

The 1.x layout (per-host direct adapters, native Codex/Factory marketplaces,
`somnus-metadata` MCP entries) is gone. The rename does not touch the backend, the
registry, or any managed file: `somnus:` blocks and URNs are unchanged.

1. `npm i -g somnus-frontmatter && somnus-frontmatter install` — places the new skills and
   plugin. Re-running `doctor` verifies them.
2. If a stale `somnus-metadata` skill copy remains under `~/.agents/skills/` or your host's
   skills directory, remove it; leaving it costs context tokens, not correctness.
3. Host MCP entries named `somnus-metadata` keep working (the backend is unchanged) but
   are redundant with the plugin's `somnus-frontmatter` server. Remove them when convenient,
   or leave them; both serve the same backend.
4. Native Codex/Factory plugin registrations from 1.x are orphaned by the rename; use the
   hosts' own remove/uninstall once. The Python backend is untouched throughout.

## Develop

```sh
npm test          # node --test; fake backend, temporary agents home
npm pack --dry-run
```

Layout: `skills/` (the two Agent Skills), `plugin.json` + `mcp.json` (the Agent Plugin
manifest), `bin/` + `lib/` (the installer and doctor), `test/` (unit + conformance tests
against the agent-plugins.org 1.0.0 schema surface). Design decisions, verification
evidence, and release history live with the backend repository (`somnus-metadata`) in
`PLAN.md`, `DECISIONS.md`, and `HANDOFF.md`.

## License

UNLICENSED — all rights reserved. See the backend repository for the project's terms.
