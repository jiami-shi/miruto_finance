# Handoff

## Current State

**2026-07-24 budget form, period, and Slack approval-link fixes:**
- `db_budgets.period` is now an AppSheet `Date` named `予算対象月`. The prior
  `1109640:00:00` display was the Google Sheets date serial being interpreted as
  `Duration`.
- Added physical `db_requests.is_recurring_budget` (`Yes/No`). The migration
  `addRecurringBudgetFlag()` ran successfully and backfilled 32 existing rows.
- The budget form now starts with `定常予算ですか？`, defaults to `N`, and hides the
  internal `request_type`. `request_type` remains canonical text and is calculated as
  `IF([is_recurring_budget], "recurring_budget", "individual_budget")`, so existing
  slices, actions, and GAS rules continue to work.
- Fixed the existing `予算を承認` action condition from
  `IN("individual_budget", [request_type])` to
  `[request_type]="individual_budget"`. AppSheet finished with `No issues found`.
- Budget and payment Slack webhook tasks now select the approver from `db_users` based
  on the current status, never fall back to the requester, show the linked budget's
  approval/usage/pending/remaining amounts, and deep-link to the exact request/payment
  detail row.
- Fixed Apps Script startup failure in `BudgetService.gs`: recurring payment methods are
  now self-contained instead of reading a cross-file `const` during script loading.
  `clasp push -f` succeeded and the migration completed after this fix.
- Verification completed: modified Apps Script files parse successfully, migration log
  reported `db_requests.is_recurring_budget added/backfilled: 32`, the mobile budget form
  shows the new toggle first with default `N`, and AppSheet reports no errors.
- Slack mention policy was refined after deployment: budget/payment messages mention the
  requester only when `db_users.slack_user_id` exists (otherwise they show email/name),
  and also mention the current business/finance approver. Executive approval uses the
  non-notifying text `@.ninomiya` instead of a real Slack mention. AppSheet template
  validation finished with `No issues found`.
- Payment requester capture now stores the creator email: the legacy physical column
  `db_payments.requester_name` is type `Email`, has Initial value `USEREMAIL()`, and is
  read-only/required. Payment Slack resolves the requester mention from that email.
- The custom `証憑を開く` payment action now uses native `External: open a file` with
  `[evidence_file]`, is Prominent, and appears when the uploaded file is nonblank. Legacy
  `evidence_url` rows keep their normal clickable URL. AppSheet reports `No issues found`.

**2026-07-22 budget payment alert configuration:**
- New AppSheet-first alert plan is documented in
  `appsheet/BUDGET_PAYMENT_ALERTS.md`, with linked updates in `COLUMN_CONFIG.md`,
  `UX_CONFIG.md`, `BUILD_CHECKLIST.md`, `PLAN.md`, and `README.md`.
- The model keeps `budget_request_status` as approval state only. Payment follow-up lives in
  `db_requests.payment_activity_status` and `db_requests.payment_intent`.
- The user added the four physical `db_requests` columns and regenerated schema. Chrome/AppSheet
  inspection confirmed live `db_requests` now has 34 columns and includes:
  `payment_activity_status`, `payment_intent`, `last_payment_alert_at`, and
  `next_payment_alert_at`.
- Chrome grid editing changed the visible type selectors to:
  `Enum`, `Enum`, `DateTime`, and `DateTime` during the editor session.
- Remaining AppSheet editor work: confirm/save those types, set enum values/display names,
  set `payment_intent` Editable_If, create `slice_my_unpaid_budget_requests`, create action
  `支払実行状況を再計算`, and create the two scheduled Slack alert bots from
  `appsheet/BUDGET_PAYMENT_ALERTS.md`.
- Warning: the new AppSheet editor grid is virtualized and did not expose reliable controls for
  column-level expressions through Chrome automation. Do not assume alert setup is complete
  until TC-012 through TC-014 pass.
- Do not use Apps Script for one-time column creation or data cleanup.

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

**2026-07-16 deployed-app UX, copy feature, P0 security, monthly-payment-draft spec:**
- **Landing page fixed (root cause).** App opened to an empty `db_approval_events_Detail`
  ("No items selected"). Root cause: **Settings → Views → General → Starting view was set to
  `db_approval_events_Detail`** (auto-set during the audit-bot build). Changed to **`ホーム`**.
  Also the `newshortcut/<appId>` link is mobile-install only (blank on desktop); the browser link
  is `start/<appId>`.
- **New home `ホーム` (dashboard, position first, ungated).** Two view entries: `予算残高`
  (db_budgets) + `カテゴリ別消化` (db_budget_categories). Everyone lands here (finance lands on
  their queue since it's the first visible gated view; nobody hits the audit detail anymore).
- **Category consumption — decision = 方案B (real-time aggregation), NOT the static
  db_budget_categories.** User wants the app self-contained (no dependency on the monthly
  `Sum_予算管理状況` import). TODO: replace `カテゴリ別消化` with a view/agg that sums by
  `budget_category_code` from db_requests (approved) / db_payments (actual). (Also the current
  db_budget_categories Price cols still show `$` — moot once 方案B replaces it.)
- **Copy-to-resubmit feature (budget side DONE; payment side pending).**
  - `slice_my_requests` = `[requester_email]=USEREMAIL()`; view `自分の予算申請` (table, menu) =
    "see your own past budget requests".
  - Action `コピーして再申請` on db_requests, type App:go-to-view, Prominent,
    Target `LINKTOFORM("予算を申請", "request_type",[request_type], "request_title",[request_title],
    "department",[department], "product_name",[product_name],
    "source_category_label",[source_category_label],
    "approved_amount_tax_excluded",[approved_amount_tax_excluded], "currency",[currency],
    "valid_from",[valid_from], "valid_to",[valid_to], "comment",[comment])` (validated green).
    → opens a prefilled 予算を申請 form; edit → submit = new row. TODO: replicate for db_payments
    (`slice_my_payments`, view `自分の支払`, action → `LINKTOFORM("支払を登録", …)`); note
    db_payments has NO `requester_email` (only `requester_name`).
- **P0 for production (Security Filters + edit-lock) — done by user via editor.**
  - Security Filters (Settings → Security): db_requests `OR([requester_email]=USEREMAIL(),
    IN(LOOKUP(USEREMAIL(),"db_users","user_email","role_code"),
    LIST("business_approver","executive_approver","finance_reviewer","admin")))`;
    db_payments same but `[requester_name]=LOOKUP(...display_name) OR [requester_name]=USEREMAIL()`
    for the own-row branches (no requester_email col); db_users just `[user_email]=USEREMAIL()`
    (a filter can't LOOKUP its own table → circular error).
  - Edit-lock: system Edit action "Only if" — db_requests
    `AND([requester_email]=USEREMAIL(), NOT(IN([budget_request_status],LIST("approved"))))`;
    db_payments uses `[requester_name]` match + `NOT(IN([status_code],LIST("payment_approved")))`.
  - Remaining P0: db_users must hold REAL Workspace emails + correct `role_code` + `is_active`
    (one row per email).
- **Monthly recurring-payment auto-draft — spec finalized, NOT built yet.**
  Recurring budgets aren't copied; **payments are.** While a 定常予算 is active
  (`approved` AND TODAY in `valid_from`..`valid_to`) and its latest payment's `payment_method`
  ∈ {振込前払い, 翌月末払い}, a **monthly bot** clones ONE draft payment (status `draft`,
  copies request_id/件名/取引先/支払方法/通貨, **amount left blank**, 支払予定日=this month),
  skipping if the current month already has a payment for that budget. A `提出する` action moves
  `draft → finance_check_pending` (requires amount filled). A **purge bot at month-end** deletes
  rows where `status_code="draft"` (condition locked to draft only). Prereqs: add `draft` to
  status_code Enum; **payment_method Enum must contain the real values 振込前払い/翌月末払い**
  (currently mis-set to 銀行振込/クレジットカード/口座振替/現金/その他 — needs correcting);
  scheduled automation needs the app deployed (verify Core supports it) or use GAS.
- **月報 export**: the user built this themselves (append-only sheet, copy-paste friendly).
- **Production gap review (P0/P1/P2)** recorded: P0 = Security Filters + db_users real accounts +
  edit-lock; P1 = end-to-end role acceptance test (TC-001–011), real Slack webhook verify,
  payment_method fix + ¥30k threshold (recurring ≤¥30,000 → business-only, skip executive),
  audit-log E2E; P2 = 方案B category agg, monthly-payment-draft, payment copy, $→¥ cleanup,
  retire dead GAS, backup strategy.

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
- The owner ran the Apps Script generation. It produced no recurring draft because the
  live sheet currently has no eligible approved recurring request; the monthly trigger was
  installed after confirming the generator is idempotent.
- `clasp push -f` completed against finance script project
  `15Ypn30MUT7G7oI1OxZ9IfASyU897oETxNAzTsypcoujY5HIQTEppTHof` with 14 files.

# 2026-07-17 AppSheet production configuration

- Live AppSheet app:
  `8edfbccd-fe1d-4a1a-a11d-ad502d07919b` (`newtfinance-599014119`).
- Created and saved:
  - `slice_my_payment_history`
  - `slice_recurring_payment_drafts`
  - menu view `自分の支払申請履歴`
  - menu view `定常予算 支払ドラフト`
  - action `支払ドラフトを経理へ提出`
- The submit action changes `payment_draft -> finance_check_pending`, assigns
  `finance_reviewer`, and updates `last_action_at` / `updated_at`. It is available only
  after amount, payment method, vendor, and scheduled payment date are filled.
- `slice_recurring_payment_drafts` also requires
  `STARTSWITH([payment_id], "pay_recurring_")`; historical manually created draft rows do
  not appear in the monthly recurring draft queue.
- Both new slices have Adds and Deletes disabled. Payment creation remains available only
  through the dedicated `支払を登録` form.
- `db_payments` now uses the production security filter documented in
  `appsheet/SETUP.md`: finance sees payments, requesters see rows linked to their budget
  requests, and other approvers see rows assigned to their role.
- Fixed the temporary role-expression type errors by using direct comparison against the
  scalar `db_users.role_code`. AppSheet reports `No issues found`; preview is runnable.
- Installed one Apps Script time trigger for `generateRecurringPaymentDrafts`: monthly on
  day 1, 05:00-06:00 Asia/Tokyo, immediate failure notification.
- Live-data check found no `pay_recurring_*` rows yet. This is expected: the only current
  recurring request (`req_individual_10039`) is still
  `business_approval_pending` and has a blank `requester_email`, so it is ineligible.
- Production smoke test still requires one real or `[TEST]` recurring request with:
  `budget_request_status=approved`, a requester email, and valid dates covering the target
  month. After generation, fill its empty amount and required payment fields in AppSheet,
  submit it, finance-approve it, and confirm one audit event plus the recurring consumed
  amount update.

# 2026-07-17 audit visibility and Japanese labels

- The raw `db_approval_events` sheet currently contains only three audit rows, all written
  by `jiamin_shi@reazon.jp`. This proves the missing approvals are not only an AppSheet
  visibility issue. Real signed-in role accounts must perform the acceptance test; Preview
  as another user is not sufficient evidence that Automation ran.
- Updated the live `db_approval_events` security filter so
  `business_approver`, `executive_approver`, `finance_reviewer`, and `admin` can read the
  full audit history.
- Created the menu table view `承認履歴`, sorted by `created_at` descending.
- Hid `approval_event_id`, `request_id`, and `payment_id`; added Japanese display names for
  the eight business-facing audit fields.
- Hid the requested technical columns on `db_requests` and `db_payments`, including the
  generated `Related db_payments` column on requests. The two status columns remain visible
  as `ステータス`.
- Both `_audit_payment_event` and `_audit_budget_request_event` are enabled. The AppSheet
  editor reports `No issues found`, and the preview shows the three audit rows newest first.
- Two enabled notification placeholders remain: `New Bot` (`notify_payment_pending`) and
  `New Bot 2`. Their steps are still named `New step`; confirm whether they should be
  completed or deleted before notification go-live.
- Remaining acceptance test: use real signed-in business, executive, and finance accounts
  to perform one state change each, then confirm each action appends exactly one row with
  the correct actor and status transition.

# 2026-07-22 blocker fix

- Fixed `ApprovalService.gs` so budget-request transitions do not write `action_comment`
  to `db_requests`; only payment transitions clear `db_payments.action_comment`.
- Live `db_notifications` now keeps legacy `payment_id` and also has `target_type` /
  `target_id`, matching the new notification job shape without breaking old AppSheet refs.
- `pay_PAY-234` is ready for finance queue validation:
  `finance_check_pending` / `finance_reviewer`.
- `pay_PAY-T746` remains ready for executive exception queue validation:
  `exception_executive_approval_pending` / `executive_approver`.
- Current generated request rows have PoC placeholder category display values
  (`経費` / `expense`). Validate real source category mapping before enabling import.
- New audit events must populate `actor_role`, `action`, `from_status`, and `to_status`;
  old incomplete audit rows were not backfilled.

# 2026-07-23 boss feedback implementation

- Live AppSheet now requires `valid_from` and `valid_to` for both individual and recurring
  budgets. `valid_to` must be on or after `valid_from`.
- Budget requests require a linked `budget_id` (HD budget) and an active `vendor_name`.
  Currency is hidden and fixed to JPY; comment is displayed as `内容`.
- Added live `db_vendors` with real active vendors. Budget and payment vendor fields use it
  as a dropdown; payments default the vendor from their linked request.
- Payment methods are exactly `クレカ払い`, `経費精算`, `振込前払い`, and `翌月末払い`.
  Monthly report generation remains restricted to the final two methods.
- Added `evidence_file` and `evidence_image`; images can render inline in AppSheet.
- Added approval summary virtual columns for HD approved amount, division planned total,
  linked request approved amount, and cumulative approved payment amount.
- Added daily AppSheet automations: expiry notice at seven days/on expiry, and approved
  request status transition to `expired` after `valid_to`.
- Payment validity exception logic now applies to both request types.
- App localization maps `Save` to `申請` and `Cancel` to `取り消し`.
- Apps Script recurring drafts now allow a prior credit-card payment as a template, leave
  its date and amount blank, and continue excluding expense reimbursements.
- `db_vendors.vendor_id` now uses `UNIQUEID()` as its Initial value and is hidden,
  read-only, required, and the sole key. AppSheet reports no errors or warnings.
- Remaining acceptance work: run one real signed-in end-to-end test per role and verify
  scheduled bots after their next execution.

# 2026-07-23 mobile UX cleanup

- Reduced Primary Navigation from 11 views to five approval/finance workflow views.
  Forms, histories, and duplicate exception queues remain available from the menu.
- Enabled `Use tabs in mobile view` on the `ホーム` dashboard so its child views do not
  appear as one long mobile list in AppSheet mobile clients.
- Changed `予算残高` and `カテゴリ別消化` from Table to Deck. Budget cards show
  `remaining_amount`; category cards show `burn_rate`.
- Live AppSheet saved with no errors or warnings.
- Renamed the two generated payment Ref actions to `HD予算を見る` and
  `予算申請を見る`; their targets and inline behavior are unchanged.
