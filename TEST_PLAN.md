# Test Plan

## 1. Scope

This test plan covers Milestone 2 after the model change:

```text
budget request authorization
payment execution confirmation
exceptional payment escalation
approval event audit log
```

Target:

- 20-30 test records
- role-based AppSheet queues
- budget request approve / reject / cancel
- payment finance approve / escalate / reject / cancel
- approval event audit log
- budget category warning display
- Slack notification jobs
- budget payment follow-up alerts
- existing monthly report connection check

## 2. Test Users

| user | role |
| --- | --- |
| finance test user | `finance_reviewer` |
| business test user | `business_approver` |
| executive test user | `executive_approver` |
| requester test user | `requester` |
| admin test user | `admin` |

Use real Workspace emails in `db_users` during execution.

## 3. Test Data

Required variation:

- at least 3 `individual_budget` requests
- at least 3 `recurring_budget` requests
- at least 5 normal payments within approved budget
- at least 2 payments exceeding request remaining amount
- at least 1 recurring-budget payment outside `valid_from` / `valid_to`
- at least 3 Google Drive evidence links
- at least 3 rows sharing the same budget/category
- at least 1 category projected over 100% burn rate
- at least 1 approved budget older than 30 days with no linked payment
- at least 1 active recurring budget using `翌月末払い` with no current-month linked payment

Do not use full historical data in PoC.

## 4. Test Cases

### TC-001 Individual budget approval

Action:

- business approver approves one `individual_budget` in `business_approval_pending`.

Expected:

- `budget_request_status` becomes `approved`
- `current_role` becomes blank
- `approved_at` is set
- one `db_approval_events` row is appended

### TC-002 Recurring budget business approval

Action:

- business approver approves one `recurring_budget` in `business_approval_pending`.

Expected:

- `budget_request_status` becomes `executive_approval_pending`
- `current_role` becomes `executive_approver`
- event is appended

### TC-003 Recurring budget executive approval

Action:

- executive approver approves the same recurring budget.

Expected:

- `budget_request_status` becomes `approved`
- `current_role` becomes blank
- `approved_at` is set
- event is appended

### TC-004 Payment inherits category

Expected:

- payment detail shows `[request_id].[source_category_label]`
- payment detail shows `[request_id].[budget_category_code]`
- payment form does not show editable `cost_category`

### TC-005 Normal payment finance approval

Action:

- finance reviewer approves one non-exceptional `finance_check_pending` payment.

Expected:

- `status_code` becomes `payment_approved`
- `current_role` becomes blank
- event is appended
- no business/executive queue item is created

### TC-006 Over-budget payment escalation

Action:

- finance reviewer handles a payment where `[has_payment_exception] = TRUE`.

Expected:

- finance approve action is hidden or blocked
- escalation action is visible
- `status_code` becomes `exception_business_approval_pending`
- `current_role` becomes `business_approver`
- event is appended

### TC-007 Exceptional payment business approval

Expected:

- `status_code` becomes `exception_executive_approval_pending`
- `current_role` becomes `executive_approver`
- event is appended

### TC-008 Exceptional payment executive approval

Expected:

- `status_code` becomes `payment_approved`
- `current_role` becomes blank
- event is appended

### TC-009 Recurring payment outside valid period

Expected:

- `[has_payment_exception] = TRUE`
- `[exception_reason]` includes `定常予算の有効期間外`
- payment enters exceptional escalation path

### TC-010 Unauthorized user cannot approve

Expected:

- AppSheet action is hidden or blocked
- Apps Script transition validation rejects the action if called directly

### TC-011 Slack failure

Action:

- force Slack send failure.

Expected:

- approval remains committed
- notification job status becomes `failed`
- error details are recorded

### TC-012 Approved budget no-payment alert

Expected:

- approved budget older than 30 days with no linked payment sends one Slack channel alert
- `last_payment_alert_at` is updated
- repeat run on the same day does not send a duplicate alert

### TC-013 Requester cancels payment intent

Action:

- requester sets `payment_intent` to `no_longer_needed`.

Expected:

- `payment_activity_status` becomes `payment_cancelled`
- no future no-payment alert is sent for that budget request
- `budget_request_status` remains `approved`

### TC-014 Active recurring budget missing monthly payment

Expected:

- active `recurring_budget` with no payment scheduled for the current month end sends one Slack channel alert on day 5
- if a current-month-end `payment_draft`, `finance_check_pending`, or `payment_approved` row exists, no alert is sent

### TC-015 Budget-backed payment intake

- a budget request with blank `budget_id` cannot be saved as a new request
- an approved request with blank `budget_id` is absent from the payment `request_id` picker
- an approved, active request with a nonblank `budget_id` can be selected
- the payment requester is the linked request's requester email and is read-only

### TC-016 Payment approval presentation

- Slack Price values show exactly one currency symbol
- Slack current balance is the balance after the current payment
- normal payments do not show an empty exception-reason label
- exceptional payments show `exception_reason`
- payment detail exposes one `証憑を開く` primary action
- PDF evidence opens in Drive and no empty main-image block is shown

## 5. Success Criteria

PoC passes when:

- individual and recurring budgets follow different approval paths
- normal payments require finance confirmation only
- exceptional payments escalate to business then executive
- no approval action depends on Japanese status text
- all state-changing actions append audit events
- AppSheet queues show only role-relevant rows
- payment category is inherited and read-only
- budget category warning appears for over-100% cases
- budget payment alerts do not change approval status
- existing monthly CSV flow is not changed

## 6. Rollback

PoC rollback:

- disable AppSheet access
- stop Apps Script triggers
- archive PoC database spreadsheet
- continue current spreadsheet workflow

No existing production sheet should be overwritten during PoC.
