# Apps Script Implementation Plan

## 1. File Structure

```text
apps-script/
├── appsscript.json
├── Config.gs
├── Schema.gs
├── Repository.gs
├── ImportService.gs
├── ApprovalService.gs
├── BudgetService.gs
├── SlackService.gs
├── NotificationService.gs
├── MonthlyReportService.gs
├── ErrorLogger.gs
└── Utils.gs
```

Only add files when implementation starts.

## 2. Responsibilities

| file | responsibility |
| --- | --- |
| `Config.gs` | spreadsheet IDs, sheet names, Slack config keys |
| `Schema.gs` | canonical headers for each `db_*` sheet |
| `Repository.gs` | header-based read/write helpers |
| `ImportService.gs` | import source sheets into `db_*` |
| `ApprovalService.gs` | validate and apply status transitions |
| `BudgetService.gs` | recalculate pending/used/remaining amounts |
| `NotificationService.gs` | create and process notification jobs |
| `SlackService.gs` | send Slack messages |
| `MonthlyReportService.gs` | connect approved payments to existing CSV flow |
| `ErrorLogger.gs` | append `db_error_log` rows |
| `Utils.gs` | ids, dates, number parsing |

## 3. Key Functions

### Import

```javascript
function importBudgetRequests()
function importPaymentRequests()
function importHdBudgets()
```

Behavior:

- read source rows by header name
- upsert `db_requests`, `db_payments`, `db_budgets`
- never depend on fixed column indexes
- skip rows without required keys and log errors

### Approval

```javascript
function approvePayment(paymentId, actorEmail, comment)
function returnPayment(paymentId, actorEmail, comment)
function rejectPayment(paymentId, actorEmail, comment)
function applyTransition(paymentId, action, actorEmail, comment)
function appendApprovalEvent(event)
```

Behavior:

- find actor role from `db_users`
- validate transition against `db_approval_rules`
- update one `db_payments` row
- append one `db_approval_events` row
- recalculate affected budget
- create Slack notification job

### Budget

```javascript
function recalculateBudget(budgetId)
function recalculateAllBudgets()
```

First-phase formula:

```text
remaining_amount = allocated_amount - used_amount - pending_amount
```

### Notifications

```javascript
function createSlackJob(paymentId, targetRole, message)
function processPendingJobs()
function sendSlackMessage(channelOrWebhook, message)
```

Behavior:

- approval functions create jobs
- trigger processes pending jobs
- failed Slack sends do not rollback approval

### Monthly Report

```javascript
function listMonthlyReportReadyPayments()
function markMonthlyReportExported(paymentIds)
```

First phase does not rewrite CSV generation.

## 4. Required Tables

`Schema.gs` must define headers for:

- `db_requests`
- `db_payments`
- `db_budgets`
- `db_approval_events`
- `db_users`
- `db_approval_rules`
- `db_evidence_files`
- `db_notifications`
- `db_error_log`

## 5. Repository Rule

All table access must be header-based.

Allowed:

```javascript
row[headers.payment_no]
```

Not allowed:

```javascript
row[0]
```

## 6. Triggers

| trigger | function | schedule |
| --- | --- | --- |
| import test data | `importPaymentRequests` | manual during PoC |
| notification worker | `processPendingJobs` | every 5 minutes |
| budget recalc | `recalculateAllBudgets` | manual or hourly |

## 7. Minimal Build Order

1. `Config.gs`
2. `Schema.gs`
3. `Repository.gs`
4. `ImportService.gs`
5. `ApprovalService.gs`
6. `BudgetService.gs`
7. `NotificationService.gs`
8. `SlackService.gs`
9. `MonthlyReportService.gs`

## 8. Implementation Checks

Before considering the PoC build done:

- one import creates 20-30 payments
- one finance approval appends an event
- one business approval appends an event
- one executive approval appends an event
- invalid transition is rejected
- Slack failure is logged but approval remains complete
- budget pending amount changes after `finance_checked`

