---
somnus:
  schema: "somnus://metadata/core/2.0.0"
  id: "urn:somnus:artifact:01a19a69-885b-72d6-9a9f-685269ecb432"
  revision: 5
  title: "Setup and troubleshooting"
  classification:
    category: "engineering"
    type: "report"
    role: "informative"
    scope: "component"
    tags: []
  lifecycle:
    status: "draft"
  authority:
    standing: "candidate"
    scopes:
      - target_ref: "urn:somnus:artifact:01a19a69-885b-72d6-9a9f-685269ecb432"
        aspects: ["content"]
  time:
    updated_at: "2026-11-18T01:01:29+00:00"
  names:
    slug: "setup-and-troubleshooting"
  knowledge:
    coverage: "artifact"
    subjects: ["urn:somnus:artifact:01a19a69-885b-72d6-9a9f-685269ecb432"]
  access:
    visibility: "internal"
    allowed_uses: ["archive", "search", "reason"]
  ingestion:
    disposition: "candidate"
    body_role: "narrative"
---
# Setup and troubleshooting

## Install the backend

The backend is the `somnus-metadata` package on PyPI (stdlib only, Python 3.11+). It installs
two identical commands: `somnus` and `somnus-metadata`.

Somnus Frontmatter is a separate, host-agnostic distribution of two skills plus an Agent
Plugin (`plugin.json` + `mcp.json`). It carries no backend logic; the Python package owns
all behavior. Install or upgrade the Python package separately from editing this npm package.
For all-file discovery use backend 2.1.1 or newer; for universal inline carriers and the
watcher, 2.2.0 or newer. After changing packaged skills, re-run `somnus-frontmatter install`
and `somnus-frontmatter doctor` so every agent picks up the same operational guidance.

```sh
python3 -m venv ~/.venvs/global          # once; put ~/.venvs/global/bin on PATH
~/.venvs/global/bin/pip install -U somnus-metadata
somnus --version
```

`uv tool install somnus-metadata` and `pipx install somnus-metadata` work too. On a
system Python that refuses `pip install` (PEP 668, "externally managed"), use a venv.

## Install the plugin

```sh
npm i -g somnus-frontmatter              # or: npx somnus-frontmatter <command>
somnus-frontmatter install               # skills into ~/.agents/skills/ + plugin into ~/.agents/plugins/
somnus-frontmatter doctor                # backend, registry, watcher, skill fidelity, MCP handshake
```

`install` does exactly two things and touches no agent's config files:

1. Copies `somnus-frontmatter` and `somnus-frontmatter-maintain` into `~/.agents/skills/`
   (the shared Agent Skills root read by OpenCode, Codex, Droid, Cursor, and other Agent
   Skills clients). Each copy carries a `.somnus-frontmatter.json` marker.
2. Copies the Agent Plugin (`plugin.json`, `mcp.json`, `skills/`) into
   `~/.agents/plugins/somnus-frontmatter/`, and upserts a `somnus-frontmatter` entry into
   `~/.agents/plugins/marketplace.json` (backing it up first; foreign entries preserved;
   an unparseable file is refused, not rewritten — the entry to paste is printed instead).

Agent Plugins clients discover the plugin from that directory. Hosts without plugin support
need their own MCP registration; `somnus-frontmatter install` prints the generic entry to
paste:

```json
{ "command": "somnus", "args": ["--actor", "somnus-frontmatter", "mcp"], "type": "stdio" }
```

(adapted to the host's config shape — e.g. `mcp.somnus-frontmatter` in OpenCode's
`opencode.jsonc`, `[mcp_servers.somnus-frontmatter]` in Codex's `config.toml`,
`mcpServers.somnus-frontmatter` in Droid's `~/.factory/mcp.json`).

Upgrading from plugin 1.x (`somnus-metadata-plugin`): the 1.x direct adapters and native
marketplace plugins are not migrated automatically. Remove any host-registered
`somnus-metadata` MCP entries you no longer want (they keep working; the backend is
unchanged), delete `~/.agents/skills/somnus-metadata` if a stale copy remains, and let
`somnus-frontmatter install` place the new skills and plugin. The backend, registry, and
envelope format are untouched by the rename.

## Run the watcher 24/7 (backend 2.2.0+)

```sh
somnus init --root /abs/project        # every root you want managed
somnus daemon install                  # systemd user unit, launchd agent, or Windows logon task
somnus daemon status                   # running, roots, stamped, revised, errors
loginctl enable-linger "$USER"         # Linux: keep running while logged out
```

`somnus-frontmatter install --watch` does the `daemon install` step for you. Settings live under
`[watch]` in `~/.somnus/config.toml`: `stamp = "inline"` (default; never creates sidecars),
`revise = "auto"`, `settle = 10.0`, `adopt = false`.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "registry does not exist" | Run `init --root /abs/project`, then `index`. |
| A path is "not found" over MCP | The path was relative. Pass an absolute path. |
| The MCP tools do not appear in the host | Restart the host. Agent Plugins clients pick the plugin up from `~/.agents/plugins/`; other hosts need the manual entry above. Then run `somnus-frontmatter doctor`. |
| `doctor` reports skill drift | The installed copy differs from the packaged skill. Re-run `somnus-frontmatter install`. |
| `~/.agents/plugins/marketplace.json` was not changed | The file is not valid JSON, so it was refused rather than rewritten. Paste the printed entry yourself (a backup sits next to the file if one was needed). |
| `E_HOST` on a write | The write would change bytes outside the envelope, so it was refused. The file is unchanged; report it. |
| `index` reports a revision conflict | A managed file's body changed without a revision. Run `bump PATH --reason "..."`, or run the watcher with `revise = "auto"`. |
| `doctor` warns the watcher never ran | Run `somnus daemon install` (or `somnus-frontmatter install --watch`). |
| New files are not stamped | The watcher only stamps files created after it started and settled for `settle` seconds; adopt older ones with `somnus daemon once --adopt` or `stamp --write`. |
| Wrong `somnus` runs | `which -a somnus` shows every copy. Re-run `somnus-frontmatter install --somnus /abs/path/to/somnus`. |

The registry lives at `~/.somnus/somnus.db` unless `SOMNUS_HOME` points elsewhere. Exit codes:
`0` ok, `1` validation errors, refusals, or conflicts, `2` usage or I/O errors.
