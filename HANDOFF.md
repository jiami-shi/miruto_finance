# Handoff

## Current State

Milestone 2 PoC build is in progress.

The repository contains the PRD, system design, AppSheet setup guide, Apps Script implementation plan, test plan, project operating rules, initial ADRs, a PoC workbook builder, and local Apps Script source files.

The confirmed direction is:

- payment approval is the first PoC target
- one budget request can have many payments
- approval is performed per payment
- first-phase database is Google Sheets
- AppSheet is the approval UI
- Apps Script is backend job processing
- existing monthly CSV flow remains during PoC
- source spreadsheet headers have been inspected for the first design pass
- PoC database Google Sheet has been created and seeded

## PoC Database

- title: `Finance Workflow PoC DB`
- id: `194C4nXsWYCEQEsuwuWVmZ18XJrGs8B_gGmhg698wfsY`
- url: https://docs.google.com/spreadsheets/d/194C4nXsWYCEQEsuwuWVmZ18XJrGs8B_gGmhg698wfsY
- timezone: `Asia/Tokyo`
- seeded records: 20 payments, 20 requests, 2 budgets

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

1. Replace placeholder emails in `db_users` with real Workspace users.
2. Configure AppSheet tables, slices, actions, and security filters against the PoC DB.
3. Deploy or paste `apps-script/*.gs` into Apps Script and set script properties.
4. Run one end-to-end approval transition test.
5. Verify budget pending amount after `finance_checked`.

## Open Questions

- Slack channel or user group strategy.
- Return/resubmit detection rule from existing source sheets.
- Final monthly CSV field set.
- Real user emails for `db_users`.

## Update Rule

Update this file at the end of every milestone and whenever a major assumption changes.
