# File Tree: somnus-metadata

**Generated:** 11/17/2026, 5:33:53 PM
**Root Path:** `/home/daeron/Repositories/somnus-metadata`

```
├── .agents
│   ├── commands
│   │   └── OPERATING.md
│   └── skills
│       └── somnus-metadata-dev
│           └── SKILL.md
├── .devcontainer
│   └── devcontainer.json
├── .github
│   ├── ISSUE_TEMPLATE
│   │   ├── bug.yml
│   │   ├── config.yml
│   │   └── feature_request.yml
│   ├── workflows
│   │   ├── ci.yml
│   │   ├── codeql.yml
│   │   ├── droid-wiki-refresh.yml
│   │   └── release.yml
│   ├── dependabot.yml
│   └── pull_request_template.md
├── .somnus-debug
│   ├── python_doctor.src.yaml
│   └── python_doctor.yaml
├── archive
│   ├── v0.1
│   │   ├── examples
│   │   │   ├── benchmark-example.md
│   │   │   ├── specification-example.md
│   │   │   └── submatter-example.md
│   │   ├── schemas
│   │   │   └── v1
│   │   │       ├── profiles
│   │   │       │   ├── engineering-benchmark-v1.json
│   │   │       │   └── engineering-specification-v1.json
│   │   │       └── core.json
│   │   ├── tools
│   │   │   ├── operator_docs_audit.py
│   │   │   └── validate.py
│   │   ├── GLOSSARY.md
│   │   └── SOMNUS-METADATA-SPEC-v0.1.md
│   ├── v2-proposal
│   │   ├── SOMNUS_FRONTMATTER_SPEC_v2.md
│   │   └── differences.md
│   ├── zip-archives
│   │   ├── somnus-metadata-done.zip
│   │   ├── somnus-metadata-finally-done-11-1.zip
│   │   ├── somnus-metadata-v2.zip
│   │   └── somnus-metadata.zip
│   ├── README.md
│   └── somnus-metadata-11-4.zip
├── docs
│   ├── AGENTS.appendix.md
│   ├── INTEGRATION_AUDIT.md
│   ├── USAGE_GUIDE.md
│   └── WHERE-WE-ARE.md
├── patch
│   └── somnus-metadata-2.2.0-D20.patch
├── runbooks
│   ├── host-write-incident.md
│   ├── package-release.md
│   └── registry-recovery.md
├── src
│   └── somnus
│       ├── carriers
│       │   ├── __init__.py
│       │   ├── blockcomment.py
│       │   ├── jsonhost.py
│       │   ├── linecomment.py
│       │   ├── markdown.py
│       │   └── sidecar.py
│       ├── commands
│       │   ├── __init__.py
│       │   ├── _common.py
│       │   ├── brief.py
│       │   ├── bump.py
│       │   ├── check.py
│       │   ├── daemon.py
│       │   ├── edit.py
│       │   ├── fork.py
│       │   ├── index.py
│       │   ├── init.py
│       │   ├── inline.py
│       │   ├── ls.py
│       │   ├── mcp.py
│       │   ├── migrate.py
│       │   ├── new.py
│       │   ├── query.py
│       │   ├── regions.py
│       │   ├── schema.py
│       │   ├── set_fields.py
│       │   ├── stale.py
│       │   ├── stamp.py
│       │   ├── status.py
│       │   └── watch.py
│       ├── db
│       │   ├── __init__.py
│       │   ├── schema.sql
│       │   ├── search.sql
│       │   └── store.py
│       ├── model
│       │   ├── __init__.py
│       │   ├── jsonschema_export.py
│       │   ├── lifecycle.py
│       │   ├── schema.py
│       │   ├── validate.py
│       │   └── vocab.py
│       ├── tui
│       │   ├── __init__.py
│       │   ├── app.py
│       │   ├── form.py
│       │   ├── term.py
│       │   └── widgets.py
│       ├── __init__.py
│       ├── __main__.py
│       ├── cli.py
│       ├── config.py
│       ├── document.py
│       ├── heartbeat.py
│       ├── ids.py
│       ├── infer.py
│       ├── mcp.py
│       ├── output.py
│       ├── regions.py
│       ├── service.py
│       ├── watch.py
│       └── yamlsub.py
├── tests
│   ├── acceptance
│   │   └── installed_package_acceptance.py
│   ├── test_carriers.py
│   ├── test_commands.py
│   ├── test_config.py
│   ├── test_conformance.py
│   ├── test_document.py
│   ├── test_ids.py
│   ├── test_lifecycle.py
│   ├── test_mcp.py
│   ├── test_regions.py
│   ├── test_routing.py
│   ├── test_store.py
│   ├── test_term_windows.py
│   ├── test_tui.py
│   ├── test_validate.py
│   ├── test_watch.py
│   └── test_yamlsub.py
├── wiki
│   ├── background
│   │   ├── design-decisions.md
│   │   ├── index.md
│   │   ├── migration-context.md
│   │   └── pitfalls.md
│   ├── features
│   │   ├── adopting-files.md
│   │   ├── agent-integration.md
│   │   ├── cli-commands.md
│   │   ├── index.md
│   │   ├── lifecycle-and-revisions.md
│   │   ├── migration.md
│   │   └── querying.md
│   ├── how-to-contribute
│   │   ├── debugging.md
│   │   ├── development-workflow.md
│   │   ├── index.md
│   │   ├── patterns-and-conventions.md
│   │   ├── testing.md
│   │   └── tooling.md
│   ├── overview
│   │   ├── architecture.md
│   │   ├── getting-started.md
│   │   ├── glossary.md
│   │   └── index.md
│   ├── reference
│   │   ├── configuration.md
│   │   ├── data-models.md
│   │   ├── dependencies.md
│   │   └── index.md
│   ├── systems
│   │   ├── carriers.md
│   │   ├── document-model.md
│   │   ├── index.md
│   │   ├── registry.md
│   │   ├── tui.md
│   │   ├── validation.md
│   │   └── yaml-subset.md
│   ├── .wiki-meta.json
│   ├── .wiki-meta.json.somnus.yaml
│   ├── by-the-numbers.md
│   ├── cleanup-opportunities.md
│   ├── deployment.md
│   ├── fun-facts.md
│   └── lore.md
├── .coveragerc
├── .gitattributes
├── .gitignore
├── .importlinter
├── .pre-commit-config.yaml
├── AGENTS.md
├── AGENTS.v1.md
├── ARCHITECTURE.md
├── CODEOWNERS
├── CONTEXT.md
├── CONTRIBUTING.md
├── DECISIONS.md
├── HANDOFF.md
├── MANIFEST.in
├── PLAN.md
├── README.md
├── SCOPE.md
├── SPEC.md
├── SYMBOL-CRASH.md
├── Somnus Markdown Metadata Standard Research.md
├── filetree.md
├── pyproject.toml
├── raw-filetree.md
├── raw-tree.md
├── somnus-metadata-plugin
└── workflows.md
```

---
*Generated by FileTree Pro Extension*