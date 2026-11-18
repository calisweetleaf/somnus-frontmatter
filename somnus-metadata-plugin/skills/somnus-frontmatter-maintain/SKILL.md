---
name: somnus-frontmatter-maintain
description: >-
  Operate and maintain the Somnus Frontmatter substrate itself: the 24/7 watcher
  and scheduler daemon, registered roots, registry health and conflict triage,
  stale-draft and revision hygiene, E_HOST write incidents, registry backup and
  recovery, config.toml and .somnus.toml, and backend/plugin upgrades. Use this
  when the task is keeping the registry, the watcher, or the configs healthy —
  for daily registry use (search, adopt, revise, validate), use the
  somnus-frontmatter skill instead.
somnus:
  schema: "somnus://metadata/core/2.0.0"
  id: "urn:somnus:artifact:01a1ec2b-706d-73dd-a8e2-527dd7181be0"
  revision: 2
  title: "Somnus Frontmatter — Maintain"
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
      - target_ref: "urn:somnus:artifact:01a1ec2b-706d-73dd-a8e2-527dd7181be0"
        aspects: ["content"]
  time:
    updated_at: "2026-11-18T01:01:31+00:00"
  names:
    slug: "somnus-frontmatter-maintain"
  knowledge:
    coverage: "artifact"
    subjects: ["urn:somnus:artifact:01a1ec2b-706d-73dd-a8e2-527dd7181be0"]
  access:
    visibility: "internal"
    allowed_uses: ["archive", "search", "reason"]
  ingestion:
    disposition: "candidate"
    body_role: "narrative"
---

# Somnus Frontmatter — Maintain

This skill runs the substrate. The **somnus-frontmatter** skill uses the registry; this one
keeps it true: the watcher, the registered roots, the SQLite database, conflicts, stale
artifacts, write incidents, and upgrades. If a symptom is about *content* (what does the
registry know), switch to `somnus-frontmatter`. The registry lives at `$SOMNUS_HOME/somnus.db`
(default `~/.somnus/somnus.db`). Exit codes: `0` ok, `1` invalid/refusal/conflict, `2` usage
or I/O errors — including daemon and database failures.

## The 24/7 watcher (`somnus daemon`)

```sh
somnus init --root /abs/project   # every root you want managed; inspect existing roots first
somnus daemon install             # systemd user unit (Linux), launchd agent (macOS), logon task (Windows)
somnus daemon status              # running, roots, stamped, revised, errors (--tsv for machines)
somnus daemon stop                # stop the managed watcher
somnus daemon uninstall           # remove the managed watcher entirely
somnus daemon once                # single pass; add --adopt to stamp pre-existing files
somnus watch                      # foreground mode, for debugging
```

`somnus-frontmatter install --watch` runs `daemon install` as a convenience. On Linux, run
`loginctl enable-linger "$USER"` so the watcher survives logout.

Settings in `~/.somnus/config.toml` under `[watch]`:

| Key | Default | Meaning |
| --- | --- | --- |
| `stamp` | `"inline"` | `inline` = inline carriers only; `all` = inline or sidecar; `off` = never stamp |
| `revise` | `auto` | In-place edits to managed files are recorded as revisions once settled |
| `settle` | `10.0` | Seconds a file must be quiet before the watcher acts on it |
| `adopt` | `false` | Whether pre-existing unmanaged files are stamped automatically |

The watcher is not the MCP server and not the plugin. Neither `somnus mcp` nor the npm
package starts or supervises it. If `daemon status` says `never ran`, the registry only
moves when you run `index` by hand.

## Registered roots and configs

Precedence: **CLI flag > `.somnus.toml` (repo) > `$SOMNUS_HOME/config.toml` (global) > built-ins**.

- `somnus init --root DIR` registers a root (and initializes `$SOMNUS_HOME` on first run).
  Inspect `somnus q --docs` / existing roots before registering; do not register a child of
  an already registered root, and review exclusions before a broad `stamp` pass.
- A repo-local `.somnus.toml` can carry exclusions and per-repo settings; keep it at the
  repo root and commit it only if the team wants shared roots/exclusions.
- Global `~/.somnus/config.toml` carries `[watch]`, `SOMNUS_HOME` location overrides are via
  the `SOMNUS_HOME` environment variable, and tool-specific data under `[extensions.<owner>]`.

## Registry health loop

Run these before and after any bulk operation, and at the end of substantial doc work:

```sh
somnus index                 # reconcile every registered root (incremental); --full re-reads all
somnus stale                 # stale drafts, missing files, near-duplicates, report
somnus q --conflicts         # files whose body changed without a revision; unresolved identity issues
somnus q --history --limit 20
somnus check --all           # every managed file, every root
```

**Revision conflicts** mean a managed file changed without a recorded revision. Triage:

1. Read the conflict: `somnus q --conflicts` (file, expected vs. stored digest).
2. If the change is legitimate, record it: `bump PATH --reason "..."` — then re-check.
3. If the file was moved or restored, `index` re-observes locations; a path-identity
   conflict after a move is resolved by re-running `index`, not by editing headers.
4. Never resolve a conflict by hand-editing the `somnus:` block. If bytes inside a file are
   damaged, see **E_HOST** below.

**Stale reports** list drafts untouched past the threshold, managed files missing on disk,
and near-duplicate titles. Each has a fix: `status` to advance or deprecate, restore or
`index`, or `fork` to disambiguate a duplicate deliberately.

## E_HOST (write refused)

Every write to a managed host file must preserve all bytes outside the envelope; otherwise
the write is refused with `E_HOST` and the file is untouched. Do not force it.

1. `somnus stamp /abs/file` (dry run) shows the envelope diff the tool computed.
2. Confirm which bytes outside the envelope differ — an external tool rewrote line endings,
   BOM, or trailing newline; or the envelope itself is damaged.
3. If the envelope is damaged, restore it from the registry (`somnus q` → history entry →
   `revisions.header_yaml`) per the host-write incident runbook.
4. If the host bytes are fine but drift is acceptable, re-run the intended command; an
   `E_HOST` on a *deliberate* workflow is a bug report, not an invitation to hand-edit.

Deep procedures: backend repo `runbooks/host-write-incident.md` (E_HOST) and
`runbooks/registry-recovery.md` (backup, restore, reconciliation). Those are the authority;
this skill is the triage card.

## Registry backup and recovery

```sh
cp ~/.somnus/somnus.db ~/.somnus/somnus.db.bak-$(date +%Y%m%d-%H%M)   # before any risky step
somnus q --conflicts                                                  # triage first, always
somnus index --full                                                   # re-observe every root
```

If `somnus.db` is corrupt: stop the watcher (`somnus daemon stop`), restore the newest good
backup, `somnus index --full`, and re-open remaining conflicts one at a time. Never copy a
live database out from under the watcher without `daemon stop`. Never edit the database with
SQL; `somnus q` is read-only and is the only supported surface.

## Old sidecars and migrations

```sh
somnus migrate --inline /abs/root      # dry run: move <file>.somnus.yaml inline where a carrier exists
somnus migrate --inline /abs/root --write
somnus migrate PATH                    # v0.1 → current envelope (dry run; --write applies)
```

A plain `.json` object can carry `"$somnus"` inline — `stamp --inline`. Strict JSON by
default uses a sidecar; never force-inline a format with no carrier.

## Upgrades

```sh
pip install -U somnus-metadata         # or: uv tool install --force somnus-metadata / pipx
somnus --version                       # note the new version
somnus daemon stop && somnus daemon install   # re-register the watcher on the new backend
npm i -g somnus-frontmatter && somnus-frontmatter install && somnus-frontmatter doctor
```

Upgrade order is backend first, then plugin. The plugin never upgrades the backend for you
(except `install --install-backend`). After a backend upgrade, re-read the release's SPEC
deltas if the registry or envelope validation changed — see the backend repo's `CHANGELOG`.

## References

- [references/operations.md](references/operations.md): watcher internals and tuning, conflict
  triage SQL, recovery walkthroughs, config schema, incident cards.
