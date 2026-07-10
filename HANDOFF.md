# Handoff

## Current State

Milestone 1 PoC design is complete.

The repository contains the PRD, system design, AppSheet setup guide, Apps Script implementation plan, test plan, project operating rules, and initial ADRs.

The confirmed direction is:

- payment approval is the first PoC target
- one budget request can have many payments
- approval is performed per payment
- first-phase database is Google Sheets
- AppSheet is the approval UI
- Apps Script is backend job processing
- existing monthly CSV flow remains during PoC
- source spreadsheet headers have been inspected for the first design pass

## Source Spreadsheet

The inspected source spreadsheet is:

- title: `EC_FY2026_予算管理シート`
- id: `1Wan-sIlRIgqO98wVnNj0L_KBRpwwakGFSpYr_w5OFqk`

Relevant tabs:

- `HD取得予算管理リスト`
- `事業部個別予算申請管理リスト`
- `事業部定常予算申請管理リスト`
- `imp_支払い管理リスト`
- `Up_支払月報`
- `agg_暫定DB`

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

1. Create the PoC database spreadsheet with `db_*` tabs.
2. Seed `db_users` and `db_approval_rules`.
3. Implement Apps Script schema and repository helpers.
4. Import 20-30 rows from `imp_支払い管理リスト`.
5. Configure AppSheet tables, slices, actions, and security filters.

## Open Questions

- Slack channel or user group strategy.
- Return/resubmit detection rule from existing source sheets.
- Final monthly CSV field set.

## Update Rule

Update this file at the end of every milestone and whenever a major assumption changes.
