# Finance Workflow

Google Workspace 上で運用する、予算・支払・月報承認 workflow の設計・実装リポジトリ。

## Current Milestone

Milestone 2: PoC build.

現在は PoC database と Apps Script backend の最小実装中。

## Current Artifacts

- [Finance Workflow PoC DB](https://docs.google.com/spreadsheets/d/194C4nXsWYCEQEsuwuWVmZ18XJrGs8B_gGmhg698wfsY)

## Core Documents

- [PRD.md](PRD.md): product requirements and PoC scope
- [PLAN.md](PLAN.md): milestone plan and current working plan
- [HANDOFF.md](HANDOFF.md): current state, decisions, next actions, and known risks
- [docs/adr/README.md](docs/adr/README.md): architecture decision record index
- [appsheet/COLUMN_CONFIG.md](appsheet/COLUMN_CONFIG.md): exact manual AppSheet column setup
- [appsheet/BUILD_CHECKLIST.md](appsheet/BUILD_CHECKLIST.md): AppSheet build checklist

## Documentation Rule

Every milestone update must update these files in the same PR or commit:

- `PLAN.md`: milestone status and next concrete step
- `HANDOFF.md`: current state, blockers, changed assumptions, and next owner action
- `docs/adr/*.md`: any new or changed architecture decision
- `README.md`: only when project structure or operating rules change

No implementation milestone is considered done unless the related docs are current.

## First-Phase Direction

- Use Google Sheets as the first-phase database.
- Use AppSheet as the approval UI.
- Use Apps Script for backend jobs only.
- Keep existing monthly CSV flow during PoC.
- Store approval history as append-only events.
- Use role names, not personal names, in workflow logic.

## Planned Repository Structure

```text
.
├── PRD.md
├── PLAN.md
├── HANDOFF.md
├── README.md
├── docs/
│   └── adr/
├── tools/
├── appsheet/
├── apps-script/
└── test-data/
```

`outputs/` and `node_modules/` are local build artifacts and are not committed.
