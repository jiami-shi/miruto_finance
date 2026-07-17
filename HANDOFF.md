# Handoff

## Current State

**2026-07-17 minimal workflow cleanup + monthly report simplification:**
- **Removed unused monthly-report cache.** `db_monthly_report_rows` had no consumer; report generation now writes only to `gen_支払月報` from `db_payments` + `db_requests`. The live `db_monthly_report_rows` tab was deleted.
- **Monthly report generation path.** `generateMonthlyReport()` filters `db_payments` to `status_code="payment_approved"` and `payment_method` in `振込前払い` / `翌月末払い`, appends screenshot-shaped rows to `gen_支払月報`, and de-dupes by exported `支払いNo`.
- **Removed PoC-only code.** Deleted `Seed.gs` and `EvidenceFile.gs`; `Seed.gs` was producing `[TEST]` rows and `EvidenceFile.gs` was a one-time migration helper for a column that already exists.
- **Cleaned live test data.** Removed `[TEST]` rows from `db_requests` / `db_payments`. Current live DB has 7 real `payment_approved + 翌月末払い` rows and no `銀行振込` report candidates.
- **Apps Script pushed and authorized.** `clasp push -f` succeeded with 14 `.gs` files. User ran `generateMonthlyReport()` from the Apps Script UI after the push, so the monthly-report path is authorized from the UI. `clasp run generateMonthlyReport` remains blocked by CLI execution permission.
- **Current workflow status:** budget/payment data exists and monthly report output is populated from real approved payments. The minimum data path is usable, but full go-live is not green until AppSheet role-path testing is completed.

Workflow status as of this handoff:

```text
source sheets / AppSheet forms
  -> db_requests / db_payments
  -> AppSheet approval status changes
  -> db_budgets / db_budget_categories visible for budget status
  -> generateMonthlyReport()
  -> gen_支払月報
```

Still not enough for go-live:

1. Run a real AppSheet role test: business approver, executive approver, finance reviewer.
2. Verify AppSheet audit bots append `db_approval_events` on every status change.
3. Replace placeholder Slack webhook if AppSheet notification bots are still desired.
4. Decide whether GAS approval functions are kept as manual/admin tools or fully retired in favor of AppSheet actions.

**2026-07-15 form polish + queue display fix + JPY currency:**
- **Budget-queue blank-deck bug fixed.** The `個別予算 事業承認キュー` and `定常予算 役員承認キュー`
  deck views (on `db_requests`) had Primary/Secondary/Summary headers pointing at **payment**
  columns (`payment_title` / `vendor_name` / `payment_amount_tax_excluded`) — none exist on
  `db_requests`, so every deck row rendered blank. Repointed all three to
  `request_title` / `requester_name` / `approved_amount_tax_excluded`. `定常予算 事業承認キュー`
  used Auto-assign (already showed `request_title`); set its Secondary/Summary to match for
  consistency. Root cause: those two views were cloned from a payment-queue template.
- **Requester auto-fill (both forms).** `db_requests.requester_name` and
  `db_payments.requester_name` now have App formula
  `LOOKUP(USEREMAIL(),"db_users","user_email","display_name")` (type → Name), so the 申請者 is
  auto-derived and read-only. `requester_email` already auto-filled `USEREMAIL()`.
- **payment_method → Enum** (`db_payments`): 銀行振込 / クレジットカード / 口座振替 / 現金 / その他,
  "Allow other values" off → clean dropdown.
- **Currency = JPY/USD only.** `db_requests.currency` Enum values are now just `JPY`,`USD`
  (Initial value `"JPY"`). `db_payments.currency` App formula `[request_id].[currency]` inherits
  from the linked budget request (read-only). All amounts are JPY-based.
- **`$`→`¥` fix.** The two Price columns (`db_requests.approved_amount_tax_excluded`,
  `db_payments.payment_amount_tax_excluded`) had Currency symbol `$`; set to `¥`. NB: the
  `db_budgets` dashboard amounts are type **Number** (no symbol), so they never showed `$`.
- **STILL TODO — budget-request comment field.** User wants a 備考/コメント field on the budget
  request form. `db_requests` has **no** `comment` column (26 cols, ends at `Related db_payments`).
  The user must add a `comment` column to the `db_requests` tab in the PoC DB sheet, then
  Data → Regenerate structure, then set it Show?=on / editable on the `予算を申請` form. (Google
  Sheets MCP has no access to this PoC DB, so the agent cannot add the column.)

**2026-07-14 (later) go-live gaps + payment intake & notifications (in-app path):**
- **Two real blockers surfaced by a GAS audit:** (a) `ImportService.gs` — all four import
  functions are `throw` stubs, so nothing flows in from the source sheets (budget requests can
  be hand-entered now; **payments had no intake at all**). (b) The GAS `ApprovalService` /
  `NotificationService` / `SlackService` are **not wired to any trigger or webhook** (no
  `doPost`, no `ScriptApp.newTrigger`, `createSlackJob` has no caller) — they are dead code
  relative to the live in-app approval flow, so approvers were never notified.
- **Payment intake form `支払を登録`** — new Form view on `db_payments` (Adds enabled). New
  payments default `status_code="finance_check_pending"` (Show=off) so they land in the finance
  queue. TODO: set `payment_id` (key) editable=off.
- **Notifications — two AppSheet bots posting to Slack** (separate from the audit bots):
  `notify_payment_pending` (db_payments) and `notify_request_pending` (db_requests). Each fires
  on a status change into a pending state and runs a **Call-a-webhook** task: `POST` JSON
  `{"text":"【要承認】…: <<[title]>>（<<[status]>>）…"}` to a Slack Incoming Webhook. The
  webhook posts to one channel, so the message text (title + status) tells the team who should
  act. **The webhook Url is a placeholder** (`…/PASTE-YOUR-SLACK-WEBHOOK-URL-HERE`) — replace it
  in Automation → bot → step → Call a webhook → Url with the real Slack webhook (the same secret
  that lives in the GAS Script Properties). Leaving the Url blank makes AppSheet flag a
  "webhook Url missing" error, hence the placeholder. This deliberately avoids the GAS path.
- **Still to do for go-live:** implement/keep-manual the payment import; deploy + real users;
  run the TC-001–011 acceptance pass; decide whether to retire or wire the GAS approval/notify
  code; validate the category mapping.

**2026-07-14 UX pass (submission form + budget dashboard):**
- **Submission form (`予算を申請`)** — new Form view on `db_requests` (Primary Nav). Enabled
  Adds on the table. Pruned to requester fields; `requester_email` auto-fills `USEREMAIL()`.
  System columns (`budget_request_status`, `current_role`, `approved_at`, `updated_at`) stay
  **editable** (the approval Set-columns actions write them) but are hidden from the form via
  **Show?=off** — setting them non-editable breaks those actions ("data action cannot modify
  column"). `budget_request_status` initial value routes new rows to the business queue. Verified
  a live submission saves and lands in `business_approval_pending`.
- **Budget dashboard (`予算残高`)** — table view on `db_budgets` (Menu Nav) showing
  allocated/used/pending/remaining. Added virtual column `burn_rate` (Percent):
  `IF([allocated_amount]=0,0,DECIMAL([used_amount])/[allocated_amount])` — the `DECIMAL()` is
  required, integer/integer truncates to 0. Added format rule `予算超過アラート`
  (`[burn_rate]>=1` → highlights used/remaining/burn_rate red).
- **Japanese field labels (done):** Display names set on all user-visible columns across
  `db_requests`, `db_budgets`, `db_payments` (form, dashboard, and queues verified rendering
  Japanese in-app). Fastest method: click the grid's DISPLAY NAME cell → type a quoted literal
  `"日本語"` → Save; chain ~4 fields per pass. Skipped: table keys, `Show?=off` technical
  columns, and auto-generated `Related_*` reverse-ref columns (still English, low priority).

Milestone 2 PoC build: AppSheet app structure is complete. As of 2026-07-13 the
`newtfinance-599014119` app has, verified error-free at build time:

- 9 role-gated state-transition actions (3 on `db_requests`, 4 payment transitions +
  evidence/open on `db_payments`) — see `TEST_RUN.md` for the full table.
- 6 slices and 6 Deck views (Primary Navigation) for the role queues.

Verified from live data: evidence-preview URL rewrite, payment category inheritance
(no editable `cost_category`), and the `has_payment_exception` / `exception_reason`
computation. See `TEST_RUN.md`.

Still open before a full green test run (all tracked in `TEST_RUN.md`):

1. `db_approval_events` audit logging — DONE. Two Automation bots built, saved, and error-free:
   `_audit_payment_event` (db_payments, `target_type="payment"`) and `_audit_budget_request_event`
   (db_requests, `target_type="budget_request"`); each appends an audit row on a status change.
   The `db_approval_events` structure was regenerated in AppSheet so `target_type`/Ref types
   exist. Field mappings are in the `2026-07-13 (later) audit-logging build` section of
   `TEST_RUN.md`. (Only verifiable end-to-end once the app is deployed and a transition fires.)
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

Remaining (step-by-step operator guide: [`GO_LIVE_CHECKLIST.md`](GO_LIVE_CHECKLIST.md)):

1. `db_approval_events` audit logging — DONE (both bots built and saved). Nothing left except
   verifying it end-to-end during the deployed test run.
2. Curate PoC seed data so it is test-ready (non-zero request approved amounts; ≥1 payment
   within budget for the normal finance path; ≥1 recurring payment outside its valid period).
3. Update Apps Script state-transition logic to use the two separate state machines, then
   deploy the back-end + set Script Properties.
4. Run `TEST_PLAN.md` role-gated cases as deployed end users / via preview user emulation and
   record in `TEST_RUN.md`.

## Update Rule

Update this file at the end of every milestone and whenever a major assumption changes.

# 2026-07-17 recurring payment draft generation

- Added `generateRecurringPaymentDrafts(targetMonth)` in `BudgetService.gs`. With no
  argument it generates the current Tokyo month.
- Eligible rows are approved `recurring_budget` requests with `requester_email`, both
  validity dates, and a validity period overlapping the target month.
- Generated rows use `status_code="payment_draft"`, `current_role="finance_reviewer"`, and
  an empty `payment_amount_tax_excluded`. The requester still sees the row through the linked
  requester email; finance sees it through the existing current-role security filter.
- The deterministic payment ID is `pay_recurring_<request_id>_<YYYYMM>`. A script lock plus
  that ID makes repeated generation idempotent without adding a generation table or columns.
- AppSheet setup for `自分の支払申請履歴`, `定常予算 支払ドラフト`, draft editing/submission,
  and recurring consumed/pending/remaining virtual columns is documented in
  `appsheet/COLUMN_CONFIG.md` and `appsheet/UX_CONFIG.md`.
- Live AppSheet now has the three recurring consumed/pending/remaining virtual columns;
  `db_requests` increased from 27 to 30 columns and the editor reports `No issues found`.
- The two new slices/views and submit action are not live yet. The new AppSheet row-filter
  prompt displayed the formulas but dropped the slices after a server reload, so no
  half-configured slice was left behind. Apply the exact formulas from `UX_CONFIG.md`.
- First operator steps: run `testRecurringPaymentDraftHelpers()`, then
  `generateRecurringPaymentDrafts()` once; verify drafts before adding a monthly trigger.
- `clasp push -f` completed against finance script project
  `15Ypn30MUT7G7oI1OxZ9IfASyU897oETxNAzTsypcoujY5HIQTEppTHof` with 14 files.
