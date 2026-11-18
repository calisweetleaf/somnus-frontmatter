---
somnus:
  schema: "somnus://metadata/core/2.0.0"
  id: "urn:somnus:artifact:01a1ec2c-e246-75a0-bbe6-b67b273f26b5"
  revision: 1
  title: "File Tree: somnus-frontmatter (somnus-metadata-plugin)"
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
      - target_ref: "urn:somnus:artifact:01a1ec2c-e246-75a0-bbe6-b67b273f26b5"
        aspects: ["content"]
  time: {}
  names:
    slug: "file-tree-somnus-frontmatter-somnus-metadata-plugin"
  knowledge:
    coverage: "artifact"
    subjects: ["urn:somnus:artifact:01a1ec2c-e246-75a0-bbe6-b67b273f26b5"]
  access:
    visibility: "internal"
    allowed_uses: ["archive", "search", "reason"]
  ingestion:
    disposition: "candidate"
    body_role: "narrative"
---
# File Tree: somnus-frontmatter (somnus-metadata-plugin)

**Generated:** 11/17/2026 (maintained alongside the plugin, not by FileTree Pro)
**Root Path:** `/home/daeron/Repositories/somnus-metadata/somnus-metadata-plugin`

```
├── .github
│   └── workflows
│       └── ci.yml
├── bin
│   └── somnus-frontmatter.mjs
├── lib
│   ├── agents.mjs
│   ├── backend.mjs
│   ├── cli.mjs
│   └── util.mjs
├── skills
│   ├── somnus-frontmatter
│   │   ├── references
│   │   │   ├── mcp-tools.md
│   │   │   ├── recipes.md
│   │   │   └── setup.md
│   │   └── SKILL.md
│   └── somnus-frontmatter-maintain
│       ├── references
│       │   └── operations.md
│       └── SKILL.md
├── test
│   ├── conformance.test.mjs
│   └── plugin.test.mjs
├── .gitignore
├── README.md
├── filetree.md
├── mcp.json
├── package.json
├── package.json.somnus.yaml
└── plugin.json
```

Notes: 2.0.0 dropped the per-host adapters (`lib/hosts.mjs`), the native Codex/Factory
payloads (`native/`), the build-native export step (`scripts/`), and the repo-local
`.agents/` copies. Distribution is one lane: the Agent Plugin (`plugin.json` + `mcp.json` +
`skills/`) installed into `~/.agents/` by `somnus-frontmatter install`.
