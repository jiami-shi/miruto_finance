# Handoff

## Current State

Milestone 2 PoC build is in progress.

Major product decision changed: this is no longer primarily a per-payment approval workflow. The model is now:

```text
budget request authorization
  -> payment execution confirmation
  -> monthly report connection
```

The next agent must not continue the old design where every payment goes `finance -> business -> executive`.

## Current Artifacts

- PoC DB: https://docs.google.com/spreadsheets/d/194C4nXsWYCEQEsuwuWVmZ18XJrGs8B_gGmhg698wfsY
- Source budget spreadsheet: https://docs.google.com/spreadsheets/d/1Wan-sIlRIgqO98wVnNj0L_KBRpwwakGFSpYr_w5OFqk
- AppSheet manual setup starts with `appsheet/COLUMN_CONFIG.md`, then `appsheet/UX_CONFIG.md`.

## Confirmed Direction

- `db_requests` is the budget request master.
- `db_payments` is the payment execution object.
- Category is selected on budget request, not on payment.
- Payment inherits `source_category_label` and `budget_category_code` from the linked budget request.
- Individual budget requires only `business_approver`.
- Recurring budget requires `business_approver -> executive_approver`.
- Budget request does not need finance pre-review.
- Normal payment requires only `finance_reviewer`.
- Exceptional payment escalates to `business_approver -> executive_approver`.
- Approval history is append-only in `db_approval_events`.
- Google Sheets remains the first-phase database.
- Existing monthly CSV flow remains during PoC.

## Exception Rules

Payment is exceptional when:

- payment would exceed the linked budget request approved amount
- payment would make the budget category or total budget burn rate exceed 100%
- recurring budget payment date is outside `valid_from` / `valid_to`
- payment amount exceeds request remaining amount

First phase: warn and escalate. Do not build complex monthly recurring budget limits yet.

## Budget Category Model

Store both:

- `source_category_label`: original source label from `費目` / `コスト項目`
- `budget_category_code`: one of `development`, `cogs`, `advertising`, `management`, `expense`

Use `db_budget_categories` for category-level budget values from `Sum_予算管理状況`.

## PoC Database Context

Current seeded records before this design change:

- 11 latest payment rows
- 11 generated request rows
- 3 budget rows
- all current payment evidence URLs are Google Drive links

The sheet schema may still reflect the older payment-first model. Before continuing AppSheet configuration, align the PoC DB columns with `appsheet/COLUMN_CONFIG.md`.

## Source Tabs

- `HD取得予算管理リスト`
- `事業部個別予算申請管理リスト`
- `事業部定常予算申請管理リスト`
- `imp_支払い管理リスト`
- `Up_支払月報`
- `agg_暫定DB`
- `Sum_予算管理状況`

## Known Constraints

- No AppSheet MCP connector is available. AppSheet configuration must be manual.
- Codex can update repo docs and Google Sheets data, but cannot directly edit the AppSheet app.
- Slack webhook exists, but must not be committed.
- Source category mapping to the five standard categories still needs final business validation.

## Next Actions

1. Align PoC DB tabs/columns to `appsheet/COLUMN_CONFIG.md`.
2. Add `db_budget_categories`.
3. Hide or remove editable payment-level `cost_category`.
4. Rebuild AppSheet slices/views from `appsheet/UX_CONFIG.md`.
5. Add grouped AppSheet actions that update state and append `db_approval_events`.
6. Update Apps Script state transition logic to use separate budget and payment state machines.
7. Run tests in `TEST_PLAN.md` and record result in `TEST_RUN.md`.

## Update Rule

Update this file at the end of every milestone and whenever a major assumption changes.
