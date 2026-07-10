# Handoff

## Current State

The repository contains the initial PRD and project operating rules for the finance workflow project.

The confirmed direction is:

- payment approval is the first PoC target
- one budget request can have many payments
- approval is performed per payment
- first-phase database is Google Sheets
- AppSheet is the approval UI
- Apps Script is backend job processing
- existing monthly CSV flow remains during PoC

## Confirmed Roles

| role code | display name |
| --- | --- |
| `requester` | 申請者 |
| `finance_reviewer` | 経理確認者 |
| `business_approver` | 事業承認者 |
| `executive_approver` | 役員承認者 |
| `admin` | 管理者 |

## Key Decisions

- Do not use personal names in workflow logic.
- Use `request_id` and `payment_id` as stable keys.
- Keep `支払いNo` as an external reference.
- Treat `月報確認ツール生成用` as a view, not a source of truth.
- Start budget pending calculation from `finance_checked`.

## Next Actions

1. Inspect the real budget management spreadsheet headers.
2. Draft `DESIGN.md`.
3. Define the first `db_*` sheet schemas.
4. Define AppSheet tables, slices, views, actions, and security filters.
5. Define Apps Script backend structure.

## Open Questions

- Exact column mapping from the current budget management spreadsheet.
- Slack channel or user group strategy.
- Return/resubmit detection rule from existing source sheets.
- Final monthly CSV field set.

## Update Rule

Update this file at the end of every milestone and whenever a major assumption changes.

