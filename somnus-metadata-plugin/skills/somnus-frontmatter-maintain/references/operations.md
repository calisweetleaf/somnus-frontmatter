---
somnus:
  schema: "somnus://metadata/core/2.0.0"
  id: "urn:somnus:artifact:01a1ec2b-70ff-7209-bc26-961e019e4d75"
  revision: 2
  title: "Somnus Frontmatter — operations reference"
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
      - target_ref: "urn:somnus:artifact:01a1ec2b-70ff-7209-bc26-961e019e4d75"
        aspects: ["content"]
  time:
    updated_at: "2026-11-18T01:01:31+00:00"
  names:
    slug: "somnus-frontmatter-operations-reference"
  knowledge:
    coverage: "artifact"
    subjects: ["urn:somnus:artifact:01a1ec2b-70ff-7209-bc26-961e019e4d75"]
  access:
    visibility: "internal"
    allowed_uses: ["archive", "search", "reason"]
  ingestion:
    disposition: "candidate"
    body_role: "narrative"
---
# Somnus Frontmatter — operations reference

Deep procedures for the maintain skill. Every command here is backend `somnus` (2.2.0+);
none of it requires the npm package.

## Watcher internals and tuning

`somnus watch` is the foreground engine; `somnus daemon` manages it as an OS-level service
(systemd user unit on Linux, launchd agent on macOS, logon task on Windows). Per `[watch]`
in `~/.somnus/config.toml`:

| Key | Default | Effect |
| --- | --- | --- |
| `stamp` | `"inline"` | `inline` stamps inline carriers only; `all` stamps inline where a carrier exists and falls back to a sidecar otherwise; `off` never stamps. Sidecars are never created by default. |
| `revise` | `auto` | `auto` records in-place edits as revisions once settled; `off` leaves revisions to explicit `bump`. |
| `settle` | `10.0` | Quiet period in seconds before the watcher acts on a changed file. Raise for slow editors or network filesystems. |
| `interval` | `5.0` | Seconds between watcher polls. |
| `rescan` | `300.0` | Seconds between full root rescans. |
| `adopt` | `false` | When `true`, pre-existing unmanaged files are stamped on sight. Leave `false`; adopt deliberately with `somnus daemon once --adopt`. |

Watcher output lands in the service journal (`journalctl --user -u <unit>` on Linux;
`loginctl enable-linger "$USER"` keeps it running while logged out; `launchd` agent logs on
macOS under the console log). `daemon status` summarizes `roots`, `stamped`, `revised`,
`errors` since the watcher started; nonzero `errors` means read the journal before anything
else — a watcher that cannot read a root silently stops managing it.

To debug a misbehaving watcher: `somnus watch` in the foreground shows exactly what it is
doing, without the service wrapper.

## Root registration and exclusion hygiene

```sh
somnus init --root /abs/project          # idempotent; registers the root
somnus index                             # reconcile now (incremental)
somnus index --full                      # re-read everything (after restore/move)
```

Review what a root will adopt **before** registering broad trees: `[index].exclude` in
`config.toml` holds glob exclusions (the built-in defaults cover `.git`, `node_modules`,
`**/__pycache__`, virtualenvs, build outputs); add project-specific exclusions (vendored
sources, generated files, fixtures with byte-exact signatures) there, not inside the
registry. Register narrow roots; deregister by removing the root from `config.toml` and
re-indexing.

## Conflict triage

`somnus q --conflicts` prints open conflicts with their kind:

- **revision** — stored digest vs. observed body differ. Causes: edit outside the tool,
  restored backup, partially applied write. Fix: `bump PATH --reason "..."` once you know the
  file is what you want; the bump records the observed state as a new revision.
- **identity** — a path was previously bound to a different artifact id. Causes: file
  replaced with an older copy, `git checkout` across envelope rewrites, a stamped file
  copied over another. Fix: `index` re-observes; if the content is genuinely a different
  artifact, decide which identity wins, then `bump` or restore accordingly. Never edit the
  `id`.

Useful SQL (read-only; `q` opens a query plan with `q --tables` to see views):

```sql
SELECT artifact_id, predicate, object_ref FROM relations
WHERE subject_ref = 'urn:somnus:artifact:…' ORDER BY created_at;
SELECT artifact_id, revision, created_at FROM revisions
WHERE artifact_id = 'urn:somnus:artifact:…' ORDER BY revision;
```

## Backup, restore, re-index

The registry is `$SOMNUS_HOME/somnus.db` (default `~/.somnus/somnus.db`); `SOMNUS_HOME`
relocates it. Backups:

```sh
somnus daemon stop                                   # never copy from under a running watcher
cp "$SOMNUS_HOME/somnus.db" "$SOMNUS_HOME/somnus.db.bak-$(date +%Y%m%d-%H%M%S)"
somnus daemon install                                # watcher back on the current backend
```

Restore: stop the watcher, move the chosen backup over `somnus.db`, `somnus index --full`,
triage `q --conflicts` until empty, then `daemon install`. Do not restore into a running
system; do not mix backup databases across `SOMNUS_HOME` directories without
`somnus init --root` for each root afterwards.

## E_HOST quick card

Refused because bytes outside the envelope would change. Suspects: CRLF↔LF conversion,
trailing-newline removal, BOM insertion, `git checkout` normalizing EOL, an editor stripping
trailing spaces outside the block, or a damaged envelope. Sequence: stop the editing tool,
`git diff --stat` or compare against the registry's stored digest (`q` history), repair host
bytes to their prior state, re-run the operation. If the envelope is the damaged part,
recover the header from the `revisions.header_yaml` column of the registry per the
host-write incident runbook (`runbooks/host-write-incident.md` in the backend repository) —
restoring the header restores the envelope, never invent a new `id`.

## Incident severity

| Severity | Meaning | Response |
| --- | --- | --- |
| S1 | Registry unreadable / corrupt | `daemon stop`; restore backup; `index --full`; page yourself, not the user. |
| S2 | Mass revision conflicts after a bulk edit | Stop the watcher; audit one conflict by hand before mass-bumping; do not `--force` anything. |
| S3 | Single E_HOST or stale entry | Triage inline; usually a line-ending or editor artifact. |
| S4 | Watcher `never ran` / stale drafts | `daemon install`; `loginctl enable-linger "$USER"`; `stale` review. |

## Version compatibility

Backend ≥ **2.1.1** for unmanaged-file discovery (all carriers including JSON and binaries);
≥ **2.2.0** for the watcher, daemon service management, and universal inline carriers. The
plugin's `somnus-frontmatter doctor` checks the backend floor and prints the watcher state;
it never starts or reconfigures the service for you.
