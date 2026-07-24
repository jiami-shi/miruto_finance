# Test Run

## 2026-07-24 budget payment alert build

Status: AppSheet configuration complete; live-message acceptance test pending.

- Configured the four physical alert fields and saved their enum/editability rules.
- Created `slice_my_unpaid_budget_requests`, menu view `未支払予算申請`, and hidden action
  `支払実行状況を再計算`.
- Added request-change and payment-change bots that invoke the status action.
- Added the daily 09:00 JST no-payment Slack bot with a 30-day repeat guard.
- Added the monthly 09:00 JST bot on day 5. It checks for an active linked payment whose
  `scheduled_payment_date` equals `EOMONTH(TODAY(), 0)`.
- Both bots use the existing AppSheet Slack webhook and update alert timestamps.
- AppSheet validation result after save: `No issues found`.
- TC-012 through TC-014 still require isolated `[TEST]` rows and observation of the real Slack
  destination. No scheduled bot was manually run during configuration.

## 2026-07-22 budget payment alert precheck

Status: superseded by the 2026-07-24 build above.

- Initial Chrome/AppSheet editor inspection showed live `db_requests` had 30 columns and was
  blocked on missing physical columns.
- User then added the columns and regenerated schema.
- Follow-up Chrome/AppSheet editor inspection showed live `db_requests` has 34 columns and
  includes:
  `payment_activity_status`, `payment_intent`, `last_payment_alert_at`,
  `next_payment_alert_at`.
- Chrome grid editing successfully changed the visible column type selectors to:
  `Enum`, `Enum`, `DateTime`, `DateTime` during the session.
- This precheck identified the remaining column, slice, action, and bot work completed on
  2026-07-24.

## 2026-07-10 PoC Setup

Status: superseded by 2026-07-13 run below.

PoC database:

- https://docs.google.com/spreadsheets/d/194C4nXsWYCEQEsuwuWVmZ18XJrGs8B_gGmhg698wfsY

Confirmed:

- `db_users` has real test users
- Slack test channel exists: `C0BGD8Q6GUW`
- Slack Incoming Webhook URL is available and must be stored only in Apps Script Script Properties
- AppSheet should be configured as a new app
- product model changed to budget authorization + payment execution confirmation

No full workflow test had passed under the new state model at that point.

## 2026-07-13 Milestone 2 build + verification run

Status: build complete and verified; end-to-end approval execution blocked (see below).

### What was built and confirmed error-free (AppSheet editor, app `newtfinance-599014119`)

9 role-gated state-transition actions (all saved with a green validation check, no
errors/warnings in "Errors & Warnings"):

| # | table | action | sets | condition (role gate) |
| --- | --- | --- | --- | --- |
| 1 | db_requests | `_set_budget_approve_individual` | status=approved, current_role="", approved_at=NOW, updated_at=NOW | individual_budget & business_approval_pending & business_approver |
| 2 | db_requests | `_set_budget_approve_recurring_business` | status=executive_approval_pending, current_role=executive_approver, updated_at=NOW | recurring_budget & business_approval_pending & business_approver |
| 3 | db_requests | `_set_budget_approve_recurring_executive` | status=approved, current_role="", approved_at=NOW, updated_at=NOW | recurring_budget & executive_approval_pending & executive_approver |
| 4 | db_payments | `_set_payment_finance_approve` | status=payment_approved, current_role="", last_action_at=NOW, updated_at=NOW | finance_check_pending & NOT(has_payment_exception) & finance_reviewer |
| 5 | db_payments | `_set_payment_escalate` | status=exception_business_approval_pending, current_role=business_approver, last_action_at=NOW, updated_at=NOW | finance_check_pending & has_payment_exception & finance_reviewer |
| 6 | db_payments | `_set_payment_exception_business_approve` | status=exception_executive_approval_pending, current_role=executive_approver, last_action_at=NOW, updated_at=NOW | exception_business_approval_pending & business_approver |
| 7 | db_payments | `_set_payment_exception_executive_approve` | status=payment_approved, current_role="", last_action_at=NOW, updated_at=NOW | exception_executive_approval_pending & executive_approver |
| - | db_payments | system `Open File (evidence_file)` (display: `証憑を開く`) | - | Prominent |

All role checks use `LOOKUP(USEREMAIL(),"db_users","user_email","role_code")=...`.

6 slices (filter formulas confirmed on screen, exact text):

- `slice_finance_check_queue` — status_code=finance_check_pending & finance_reviewer
- `slice_exception_business_queue` — status_code=exception_business_approval_pending & business_approver
- `slice_exception_executive_queue` — status_code=exception_executive_approval_pending & executive_approver
- `slice_individual_budget_business_queue` — request_type=individual_budget & business_approval_pending & business_approver
- `slice_recurring_budget_business_queue` — request_type=recurring_budget & business_approval_pending & business_approver
- `slice_recurring_budget_executive_queue` — request_type=recurring_budget & executive_approval_pending & executive_approver

6 Deck views (Primary Navigation), each bound to the matching slice:

- 経理確認キュー → slice_finance_check_queue
- 個別予算 事業承認キュー → slice_individual_budget_business_queue
- 定常予算 事業承認キュー → slice_recurring_budget_business_queue
- 定常予算 役員承認キュー → slice_recurring_budget_executive_queue
- 異常支払 事業承認キュー → slice_exception_business_queue
- 異常支払 役員承認キュー → slice_exception_executive_queue

### Data-level verifications (live computed values read from `db_payments` / `db_requests`)

Read directly from the app's table data (Google Sheets MCP has no permission on this
PoC DB, so values were read via the AppSheet table view):

- **PASS — evidence preview (TC-004 adjacent / BUILD_CHECKLIST test 5):**
  `evidence_preview_url` correctly rewrites a Drive `/view?usp=drive_link` link to
  `.../preview` (verified on pay_PAY-T746 and pay_PAY-T742).
- **PASS — payment category inheritance (TC-004):**
  `inherited_source_category_label` and `inherited_budget_category_code` are populated
  from the linked request (both show `expense`). `db_payments` has **no** `cost_category`
  column, so the "no editable cost_category on payment form" requirement holds.
- **PASS — exception detection logic (TC-006 precondition):**
  `has_payment_exception` = TRUE with `exception_reason` = `予算申請の残額を超過` on
  payments whose amount exceeds the linked request remaining amount.
- **PASS — dereference columns:** `request_approved_amount` and `request_remaining_amount`
  resolve through `[request_id]` correctly.

### Not executed / blocked

- **TC-001 / TC-002 / TC-003 (budget approval transitions):** not executed. The AppSheet
  editor owner-preview does not reliably apply the role-based slice security filters
  (the 異常支払 役員承認キュー preview rendered `finance_check_pending` rows, which the
  slice filter would exclude for a real end user), so it is not a trustworthy harness for
  role-gated queues. Executing an approve in preview would also mutate the PoC seed data.
  Candidate clean rows exist: `req_individual_891` (individual_budget, business_approval_pending,
  ¥100,000) for TC-001 and `req_individual_10039` (recurring_budget, business_approval_pending)
  for TC-002/003.
- **TC-005 (normal payment finance approval): BLOCKED by seed data.** Every seeded payment
  links to a request whose `approved_amount_tax_excluded` is ¥0 (only a few requests carry a
  non-zero amount, and none of them have a linked payment within budget). As a result
  `request_remaining_amount` = ¥0 and `has_payment_exception` = TRUE for **all** payments, so
  there is currently no non-exceptional payment to demonstrate the finance-only approval path.
- **TC-006 / TC-007 / TC-008 (escalation chain execution):** transitions not executed (same
  role/mutation reason). The TC-006 precondition (exception detected) is verified.
- **TC-009 (recurring payment outside valid period):** the specific `exception_reason`
  `定常予算の有効期間外` was not observed — the two exceptional payments both trip the
  "残額超過" branch. Needs a seeded recurring-budget payment dated outside `valid_from`/`valid_to`.
- **`db_approval_events` audit logging: DONE — see the 2026-07-13 (later) addendum below.**
  Both audit bots (`_audit_payment_event`, `_audit_budget_request_event`) are built, saved, and
  error-free. The audit-event assertions in TC-001/002/003/005/006/007/008 can only be verified
  once the app is deployed and a role-gated transition actually fires.
- **TC-010 (Apps Script transition validation) / TC-011 (Slack failure): BLOCKED.** The GAS
  webhook/back-end is not deployed for this app yet.

### To reach a full green run

1. **Fix seed data** in the PoC DB so a testable dataset exists:
   - set a non-zero `approved_amount_tax_excluded` on at least one `individual_budget` and one
     `recurring_budget` request;
   - ensure at least one payment amount is ≤ its request remaining amount (→ TC-005 normal path);
   - add at least one recurring-budget payment dated outside `valid_from`/`valid_to` (→ TC-009).
   (Not done here on purpose — this curates the owner's PoC test data and should be their call.)
2. **Finish `db_approval_events` audit logging** — see the addendum below for exact remaining steps.
3. **Deploy the Apps Script back-end** and set Script Properties for TC-010 / TC-011.
4. **Run role-gated execution tests** as deployed end users (or via AppSheet preview user
   emulation setting `USEREMAIL()` per role) so the slice filters and action conditions are
   enforced.

## 2026-07-13 (later) audit-logging build

Status: **DONE.** Audit logging is implemented as two AppSheet Automation bots (the in-app state
transitions are done by Set-columns actions, so a bot that fires on status change is the correct
place to append `db_approval_events`). Both bots are built, saved, and error-free. The
`db_approval_events` structure was regenerated in AppSheet by the owner so `target_type` and the
`Ref` types are now present.

### Bot 1 — `_audit_payment_event` (payments)

Table `db_payments`, Data change type = Updates, Condition
`[_THISROW_BEFORE].[status_code] <> [_THISROW_AFTER].[status_code]`. One "Run a data action →
Add new rows to `db_approval_events`" step (`write_payment_event`) with 8 column mappings, all
validated and saved error-free:

- `approval_event_id` = `UNIQUEID()`
- `target_type` = `"payment"`
- `payment_id` = `[payment_id]`
- `request_id` = `[request_id]`
- `actor_email` = `USEREMAIL()`
- `from_status` = `[_THISROW_BEFORE].[status_code]`
- `to_status` = `[status_code]`
- `created_at` = `NOW()`

### Bot 2 — `_audit_budget_request_event` (budget requests)

Table `db_requests`, Data change type = Updates, Condition
`[_THISROW_BEFORE].[budget_request_status] <> [_THISROW_AFTER].[budget_request_status]`. One
"Run a data action → Add new rows to `db_approval_events`" step (`write_budget_event`) with 7
column mappings, all validated and saved error-free:

- `approval_event_id` = `UNIQUEID()`
- `target_type` = `"budget_request"`
- `request_id` = `[request_id]`
- `actor_email` = `USEREMAIL()`
- `from_status` = `[_THISROW_BEFORE].[budget_request_status]`
- `to_status` = `[budget_request_status]`
- `created_at` = `NOW()`
- (no `payment_id` — budget-request events have none; they are distinguished by `target_type`)

### Notes / still open

- Optional columns not set on either bot: `actor_role`
  (`LOOKUP(USEREMAIL(),"db_users","user_email","role_code")`), `action`, `comment`. Add later if
  the audit trail needs them; the who/what/when/from→to core is captured.
- The bots fire on status change, so they cannot be exercised until the app is deployed and a
  role-gated transition actually runs. Confirm one `db_approval_events` row lands per transition
  during the deployed end-to-end test run (TC-001/002/003/005/006/007/008 audit assertions).
- Editor note for future AppSheet work: native dropdown lists render below the ~783px screenshot
  viewport; set a combobox by clicking it then typing the value + Return. Save to the server
  (top-right SAVE / Ctrl+S) after each field — the expression-editor "Save" only updates the
  local draft, which is lost on a connector reconnect. Do NOT copy a bot to retarget it to
  another table: a copied data action stays bound to the original table and cannot be reused;
  build the second bot's write step fresh instead.

## 2026-07-22 blocker fix

Status: blocker fix applied; full AppSheet workflow still needs a real role-gated acceptance run.

Validated live PoC DB:

- `db_notifications` has `target_type` and `target_id` while retaining legacy `payment_id`.
- `pay_PAY-234` is in `finance_check_pending` / `finance_reviewer`.
- `pay_PAY-T746` is in `exception_executive_approval_pending` / `executive_approver`.
- Current generated request rows have category display fields populated as `経費` / `expense`.

Code/docs fix:

- `ApprovalService.gs` no longer writes `action_comment` on budget request transitions.
- `request_remaining_amount` AppSheet formula no longer references removed old status codes.
- `tools/build_poc_workbook.mjs` keeps the live-compatible `db_notifications.payment_id`
  column and adds `target_type` / `target_id`.

Still true:

- Import functions remain disabled until source category mapping is validated.
- Old `db_approval_events` rows may have blank `actor_role` / `action`; do not backfill them.
- New approval events must populate `actor_role`, `action`, `from_status`, and `to_status`.

## 2026-07-24 budget-backed payment and evidence UX fix

Validated in the live AppSheet editor:

- `db_requests.budget_id` is required.
- `db_payments.request_id` is required and filters to approved, active, current-user
  requests with `ISNOTBLANK([budget_id])`.
- `db_payments.requester_name` is an Email displayed as `申請者`, read-only, with initial
  value `[request_id].[requester_email]`.
- `request_approved_amount` and `request_remaining_amount` use the `¥` Price symbol.
- `exception_reason` uses Show If `[has_payment_exception]`.
- `Open File (evidence_file)` is the single `証憑を開く` Primary action.
- Budget/payment Slack templates no longer prepend `¥` to Price values. Payment Slack
  uses the linked request requester email, shows post-payment remaining budget, and hides
  the exception line for normal payments.
- The editor saved with `No issues found`.

Validated in the live PoC DB:

- `pay-20260724-001` now stores `jiamin_shi@reazon.jp` instead of `経理確認者` in the legacy
  `requester_name` email column.

Not executed:

- Slack webhooks were not manually run, to avoid sending a production-channel test message.
- A new end-to-end payment was not submitted or approved in this configuration session.

## 2026-07-24 recurring monthly-cap linkage

Validated:

- `db_budgets.period` contains one HD budget per month in the live PoC DB.
- `generateRecurringPaymentDrafts()` resolves and writes the target month's HD budget.
- The existing GAS helper self-check returns `ok`, including month matching, missing-month,
  duplicate-month, and next-month-end deduplication assertions.
- `clasp push -f` pushed all 13 Apps Script files to the bound project.
- `db_payments.budget_id` derives the recurring HD budget from the scheduled-payment month;
  `翌月末払い` uses the preceding month, and the computed field is required.
- `request_remaining_amount` is scoped by both `request_id` and `budget_id`.
- Recurring request detail keeps cumulative approved payments and calculates pending and
  remaining amounts for the current month only.
- Budget form and Slack wording identify recurring amounts as monthly.
- AppSheet saved with `No issues found`.

Not executed:

- `clasp run testRecurringPaymentDraftHelpers` is unavailable because the bound Apps Script
  is not exposed through the Execution API.
- No live recurring Draft was generated during this change.
