# Handoff

## Current State

Milestone 2 PoC build: AppSheet app structure is complete. As of 2026-07-13 the
`newtfinance-599014119` app has, verified error-free at build time:

- 9 role-gated state-transition actions (3 on `db_requests`, 4 payment transitions +
  evidence/open on `db_payments`) — see `TEST_RUN.md` for the full table.
- 6 slices and 6 Deck views (Primary Navigation) for the role queues.

Verified from live data: evidence-preview URL rewrite, payment category inheritance
(no editable `cost_category`), and the `has_payment_exception` / `exception_reason`
computation. See `TEST_RUN.md`.

Still open before a full green test run (all tracked in `TEST_RUN.md`):

1. `db_approval_events` audit logging — implemented as Automation bots, PARTIALLY done. The
   payment bot (`_audit_payment_event`) is built and saved; the budget-request bot's Event is
   configured but its write step needs a rebuild. BLOCKED on a `db_approval_events` schema fix
   in the PoC DB (missing `target_type`, `payment_id` mistyped as Price not Ref). Full details
   and the exact remaining steps are in the `2026-07-13 (later) audit-logging build` section of
   `TEST_RUN.md`.
2. PoC seed data is not test-ready: nearly all requests have `approved_amount_tax_excluded`
   = ¥0, so every payment computes `has_payment_exception` = TRUE. No non-exceptional
   payment exists, blocking TC-005.
3. Apps Script back-end not deployed (blocks TC-010 / TC-011).
4. Role-gated approval transitions not executed (editor owner-preview does not enforce the
   USEREMAIL slice filters; executing would mutate seed data).

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

Done: PoC DB aligned to `COLUMN_CONFIG.md`, `db_budget_categories` added, `cost_category`
removed from `db_payments`, slices/views/actions rebuilt from `UX_CONFIG.md`.

Remaining:

1. Finish `db_approval_events` audit logging: fix the sheet-tab schema (prerequisite), then
   finalize the payment bot and rebuild the budget-request bot's write step. Exact steps are in
   `TEST_RUN.md` → `2026-07-13 (later) audit-logging build`.
2. Curate PoC seed data so it is test-ready (non-zero request approved amounts; ≥1 payment
   within budget for the normal finance path; ≥1 recurring payment outside its valid period).
3. Update Apps Script state-transition logic to use the two separate state machines, then
   deploy the back-end + set Script Properties.
4. Run `TEST_PLAN.md` role-gated cases as deployed end users / via preview user emulation and
   record in `TEST_RUN.md`.

## Update Rule

Update this file at the end of every milestone and whenever a major assumption changes.
