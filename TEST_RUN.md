# Test Run

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
| - | db_payments | `証憑を開く` (External: go to `[evidence_url]`) | - | ISNOTBLANK([evidence_url]) |

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
- **`db_approval_events` audit logging: PARTIALLY BUILT — see the 2026-07-13 (later) addendum
  below.** A payment-side audit bot is built and saved; the budget-request-side bot has its
  Event configured but its write step is not finalized; and the whole feature is blocked on a
  `db_approval_events` schema fix in the PoC DB. Until that lands, audit-event assertions in
  TC-001/002/003/005/006/007/008 still fail.
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

Status: audit logging implemented as AppSheet Automation bots (the in-app state transitions
are done by Set-columns actions, so a bot that fires on status change is the correct place to
append `db_approval_events`). One bot is complete; the second and a data-model fix remain.

### Built and saved

- **Bot `_audit_payment_event`** (table `db_payments`, Data change type = Updates,
  Condition `[_THISROW_BEFORE].[status_code] <> [_THISROW_AFTER].[status_code]`). One
  "Run a data action → Add new rows to `db_approval_events`" step named `write_payment_event`
  with these column mappings, all validated (green check) and saved without a bot error:
  - `approval_event_id` = `UNIQUEID()`
  - `payment_id` = `[payment_id]`
  - `request_id` = `[request_id]`
  - `actor_email` = `USEREMAIL()`
  - `from_status` = `[_THISROW_BEFORE].[status_code]`
  - `to_status` = `[status_code]`
  - `created_at` = `NOW()`

### Partially built

- **Bot `_audit_payment_event 2`** (the copy intended to become the budget-request audit bot).
  Its **Event is correctly reconfigured**: table `db_requests`, Data change type = Updates,
  Condition `[_THISROW_BEFORE].[budget_request_status] <> [_THISROW_AFTER].[budget_request_status]`.
  Its **write step is NOT finalized**: the copied data action is still bound to `db_payments`
  columns, so AppSheet reports *"Action 'write_payment_event Action - 2' cannot be used in this
  process."* A copied data action cannot be retargeted to another table, so the step must be
  rebuilt fresh (see remaining steps).

### BLOCKER — `db_approval_events` schema in the PoC DB does not match `COLUMN_CONFIG.md`

While mapping the columns, AppSheet's detected schema for `db_approval_events` was found to be
wrong, which prevents audit logging from actually functioning even for the completed bot:

- **`target_type` column is missing** — it is in `COLUMN_CONFIG.md` (Enum) but does not appear
  in AppSheet's column picker for the table, so it could not be set. Payment-vs-budget events
  are currently only distinguishable by whether `payment_id` is populated.
- **`payment_id` is typed `Price`** in AppSheet, but the spec is `Ref -> db_payments`. Writing a
  text key like `pay_PAY-T742` into a Price column will not store correctly at runtime.
- `request_id` is likewise expected to be `Ref -> db_requests`; verify its detected type too.

Root cause: the PoC DB `db_approval_events` tab was never built out per `COLUMN_CONFIG.md`
(headers/types incomplete), so AppSheet guessed types from empty/partial data. The Google
Sheets connector has no permission on this PoC DB (403), so this must be fixed by the owner in
the sheet, then regenerated in AppSheet (Data → `db_approval_events` → Regenerate Structure).

### Remaining steps to finish audit logging

1. **Fix the `db_approval_events` sheet tab** to match `COLUMN_CONFIG.md` (all 11 columns incl.
   `target_type`; `payment_id`/`request_id` as `Ref`), then regenerate the table structure in
   AppSheet. This is the prerequisite for everything below.
2. **Finalize `_audit_payment_event`** by adding `target_type` = `"payment"` (and optionally
   `actor_role`, `action`, `comment`) once the column exists, and confirm `payment_id` writes as
   a Ref.
3. **Rebuild the budget-request bot's write step.** Easiest: delete `_audit_payment_event 2`'s
   broken step and add a fresh "Run a data action → Add new rows to `db_approval_events`" step
   with: `approval_event_id`=`UNIQUEID()`, `request_id`=`[request_id]`, `target_type`=`"budget_request"`,
   `actor_email`=`USEREMAIL()`, `from_status`=`[_THISROW_BEFORE].[budget_request_status]`,
   `to_status`=`[budget_request_status]`, `created_at`=`NOW()`. (Its Event is already correct.)
   Rename the bot to `_audit_budget_request_event`.
4. Editor note: AppSheet native dropdown lists render below the ~783px screenshot viewport;
   set a combobox by clicking it then typing the value + Return. Save to the server (top-right
   SAVE / Ctrl+S) after each field — the expression-editor "Save" only updates the local draft,
   which is lost on a connector reconnect.
