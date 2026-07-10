# miruto_finance

Finance workflow project for budget authorization, payment confirmation, and monthly report connection inside Google Workspace.

## Current Milestone

Milestone 2: PoC build.

Current product model:

```text
budget request authorization
  -> payment execution confirmation
  -> monthly report connection
```

Do not design this as a simple per-payment approval chain. Budget requests authorize category and amount. Payments inherit that category and normally require only finance confirmation; exceptional payments escalate.

## Current Artifacts

- [Finance Workflow PoC DB](https://docs.google.com/spreadsheets/d/194C4nXsWYCEQEsuwuWVmZ18XJrGs8B_gGmhg698wfsY)
- [Source budget spreadsheet](https://docs.google.com/spreadsheets/d/1Wan-sIlRIgqO98wVnNj0L_KBRpwwakGFSpYr_w5OFqk)

## Core Documents

- [PRD.md](PRD.md): product requirements and PoC scope
- [DESIGN.md](DESIGN.md): data model, state machines, backend boundaries
- [PLAN.md](PLAN.md): milestone plan and current working plan
- [HANDOFF.md](HANDOFF.md): current state, decisions, next actions, and known risks
- [docs/adr/README.md](docs/adr/README.md): architecture decision record index
- [appsheet/COLUMN_CONFIG.md](appsheet/COLUMN_CONFIG.md): manual AppSheet column setup
- [appsheet/UX_CONFIG.md](appsheet/UX_CONFIG.md): manual AppSheet slices, views, and actions
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
- Use AppSheet as the approval and confirmation UI.
- Use Apps Script for backend jobs only.
- Keep existing monthly CSV flow during PoC.
- Store approval history as append-only events.
- Use role names, not personal names, in workflow logic.
- Keep category on budget request; never make payment category authoritative.

## Repository Structure

```text
.
├── PRD.md
├── DESIGN.md
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

`outputs/` and `node_modules/` are local artifacts and are not committed.
