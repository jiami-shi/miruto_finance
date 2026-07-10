# Test Plan

## 1. Scope

This test plan covers Milestone 2 PoC build.

Target:

- 20-30 payment records
- role-based AppSheet approval queues
- approve / return / reject
- approval event audit log
- budget pending calculation
- Slack notification jobs
- existing monthly report connection check

## 2. Test Users

| user | role |
| --- | --- |
| finance test user | `finance_reviewer` |
| business test user | `business_approver` |
| executive test user | `executive_approver` |
| admin test user | `admin` |

Use real Workspace emails in `db_users` during execution.

## 3. Test Data

Create or import 20-30 rows from `imp_支払い管理リスト`.

Required variation:

- at least 10 normal `payment_candidate` rows
- at least 3 rows with evidence links
- at least 3 rows without evidence links
- at least 3 rows sharing the same budget
- at least 2 rows with different payment methods
- at least 1 row with missing optional memo

Do not use full historical data in PoC.

## 4. Test Cases

### TC-001 Import payments

Expected:

- `db_payments` has generated `payment_id`
- `payment_no` is preserved
- `request_id` is populated
- initial `status_code` is `payment_candidate`
- initial `current_role` is `finance_reviewer`

### TC-002 Finance approval

Action:

- finance user approves one `payment_candidate`.

Expected:

- status becomes `finance_checked`
- current role becomes `business_approver`
- one `db_approval_events` row is appended
- budget pending amount increases
- notification job is created for business approver

### TC-003 Business approval

Expected:

- status becomes `business_approved`
- current role becomes `executive_approver`
- event is appended
- notification job is created for executive approver

### TC-004 Executive approval

Expected:

- status becomes `executive_approved`
- event is appended
- payment is ready for monthly report connection

### TC-005 Return to finance

Action:

- business or executive user returns a payment.

Expected:

- status becomes `returned_to_finance`
- current role becomes `finance_reviewer`
- event includes comment
- budget remains pending

### TC-006 Return to requester

Action:

- finance user returns a payment to requester.

Expected:

- status becomes `returned_to_requester`
- current role becomes `requester`
- event is appended
- budget pending amount excludes the payment

### TC-007 Reject

Expected:

- status becomes `rejected`
- current role is blank
- event is appended
- budget pending excludes the payment

### TC-008 Unauthorized user cannot approve

Expected:

- AppSheet action is hidden or blocked
- Apps Script transition validation rejects the action if called directly

### TC-009 Invalid transition

Action:

- attempt executive approval on `payment_candidate`.

Expected:

- payment remains unchanged
- error is logged to `db_error_log`

### TC-010 Slack failure

Action:

- force Slack send failure.

Expected:

- approval remains committed
- notification job status becomes `failed`
- error details are recorded

## 5. Success Criteria

PoC passes when:

- all test cases pass
- no approval action depends on Japanese status text
- all approval actions have audit events
- AppSheet queues show only role-relevant payments
- budget pending calculation updates from `finance_checked`
- existing monthly CSV flow is not changed

## 6. Rollback

PoC rollback is simple:

- disable AppSheet access
- stop Apps Script triggers
- archive PoC database spreadsheet
- continue current spreadsheet workflow

No existing production sheet should be overwritten during PoC.

