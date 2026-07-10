# Handoff

## Current State

Milestone 2 PoC build is in progress.

The repository contains the PRD, system design, AppSheet setup guide, Apps Script implementation plan, test plan, project operating rules, initial ADRs, a PoC workbook builder, and local Apps Script source files.

For AppSheet manual configuration, the next agent should start with `appsheet/COLUMN_CONFIG.md`, then `appsheet/UX_CONFIG.md`, then `appsheet/BUILD_CHECKLIST.md`.

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
- `db_users` has real test users
- Slack test channel is `C0BGD8Q6GUW`
- Slack Incoming Webhook URL is available but must not be committed
- AppSheet should be configured as a new app

## PoC Database

- title: `Finance Workflow PoC DB`
- id: `194C4nXsWYCEQEsuwuWVmZ18XJrGs8B_gGmhg698wfsY`
- url: https://docs.google.com/spreadsheets/d/194C4nXsWYCEQEsuwuWVmZ18XJrGs8B_gGmhg698wfsY
- timezone: `Asia/Tokyo`
- current seeded records: 11 latest payments, 11 generated requests, 3 budgets
- all current payment evidence URLs are Google Drive links
- current payments are initialized as `finance_checked` / `business_approver` because the pasted source data is already `経理確認済`

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
- `Sum_予算管理状況`

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

1. Finish AppSheet column configuration using `appsheet/COLUMN_CONFIG.md`.
2. Configure usable AppSheet views and evidence button using `appsheet/UX_CONFIG.md`.
3. Configure AppSheet tables, slices, actions, and security filters against the PoC DB.
4. Deploy or paste `apps-script/*.gs` into Apps Script and set script properties.
5. Set `FINANCE_WORKFLOW_SLACK_WEBHOOK_URL` in Apps Script Script Properties.
6. Run one end-to-end approval transition test.
7. Verify budget pending amount after `finance_checked`.

## AppSheet Current Context

- There is no AppSheet MCP connector in this environment.
- AppSheet UI must be configured manually by the user.
- Codex can inspect screenshots and update repo docs, but cannot directly edit the AppSheet app.
- The user asked whether enum values should be entered in App Formula for `db_users.role_code`; answer: no. Enum values belong in `Type details > Values`; App Formula must be empty.
- The user saw `Invalid dereference. Column payment_id is not a Ref`; fix by setting `db_approval_events.payment_id` to `Ref -> db_payments`, after ensuring `db_payments.payment_id` is a Text key.
- Latest test rows are already `finance_checked`, so finance reviewer queue can be empty. Use business approver preview to test current rows, or reset one payment to `payment_candidate` / `finance_reviewer` for finance queue testing.

## Budget Request Handling

For the PoC, budget applications are not manually entered in AppSheet.

Each latest pasted payment row generates:

- one `db_payments` row
- one linked `db_requests` row from `事業部予算申請No.`
- one `db_budgets` row per unique `HD予算申請No`

This keeps the relationship testable without building a full budget request intake UI yet.

Budget balances are sourced from `Sum_予算管理状況` for the current PoC seed:

- `allocated_amount = 取得額合計`
- `used_amount = 執行額合計`
- `pending_amount = 承認額合計 - 執行額合計`
- `remaining_amount = 取得額合計 - 承認額合計`

## Open Questions

- Return/resubmit detection rule from existing source sheets.
- Final monthly CSV field set.

## Update Rule

Update this file at the end of every milestone and whenever a major assumption changes.
