# Finance Workflow

Google Workspace 上で運用する、予算・支払・月報承認 workflow の設計・実装リポジトリ。

## Current Milestone

Milestone 0: product definition and project operating rules.

次の milestone は AppSheet / Google Sheets / Apps Script の PoC 設計。

## Core Documents

- [PRD.md](PRD.md): product requirements and PoC scope
- [PLAN.md](PLAN.md): milestone plan and current working plan
- [HANDOFF.md](HANDOFF.md): current state, decisions, next actions, and known risks
- [docs/adr/README.md](docs/adr/README.md): architecture decision record index

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
├── appsheet/
├── apps-script/
└── test-data/
```

Folders are added only when work starts.
