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

Do not add more files until a real need appears.

## 2. Responsibilities

| file | responsibility |
| --- | --- |
| `Config.gs` | spreadsheet IDs, sheet names, Script Property names |
| `Schema.gs` | canonical headers and status constants |
| `Repository.gs` | header-based read/write helpers |
| `ImportService.gs` | import budgets, budget requests, payments, and category balances |
| `ApprovalService.gs` | validate and apply budget/payment transitions |
| `BudgetService.gs` | recalculate request, budget, and category balances |
| `NotificationService.gs` | create and process notification jobs |
| `SlackService.gs` | send Slack messages |
| `MonthlyReportService.gs` | list approved payments for existing CSV flow |
| `ErrorLogger.gs` | append `db_error_log` rows |
| `Utils.gs` | ids, dates, number parsing |

## 3. Key Functions

### Import

```javascript
function importBudgetRequests()
function importPaymentRequests()
function importHdBudgets()
function importBudgetCategories()
```

Behavior:

- read source rows by header name
- upsert `db_requests`, `db_payments`, `db_budgets`, `db_budget_categories`
- store original category label on `db_requests.source_category_label`
- map original category to `db_requests.budget_category_code`
- never make payment-level category authoritative
- skip rows without required keys and log errors

### Budget Request Approval

```javascript
function approveBudgetRequest(requestId, actorEmail, comment)
function rejectBudgetRequest(requestId, actorEmail, comment)
function cancelBudgetRequest(requestId, actorEmail, comment)
function applyBudgetRequestTransition(requestId, action, actorEmail, comment)
```

Rules:

- `individual_budget`: `business_approval_pending -> approved`
- `recurring_budget`: `business_approval_pending -> executive_approval_pending -> approved`
- budget requests do not require finance pre-review
- every transition appends `db_approval_events`

### Payment Confirmation

```javascript
function approvePayment(paymentId, actorEmail, comment)
function escalatePayment(paymentId, actorEmail, comment)
function rejectPayment(paymentId, actorEmail, comment)
function cancelPayment(paymentId, actorEmail, comment)
function applyPaymentTransition(paymentId, action, actorEmail, comment)
```

Rules:

- normal payment: `finance_check_pending -> payment_approved`
- exceptional payment: `finance_check_pending -> exception_business_approval_pending -> exception_executive_approval_pending -> payment_approved`
- every payment must reference an approved budget request
- every transition appends `db_approval_events`

### Audit

```javascript
function appendApprovalEvent(event)
```

`event.target_type` is either:

```text
budget_request
payment
```

### Budget

```javascript
function recalculateRequestBalance(requestId)
function recalculateBudget(budgetId)
function recalculateBudgetCategory(budgetId, budgetCategoryCode)
function recalculateAllBudgets()
function detectPaymentException(payment)
```

First-phase category burn rate:

```text
burn_rate = planned_amount / allocated_amount
projected_burn_rate = (planned_amount + current_payment_amount) / allocated_amount
```

If `allocated_amount` is blank or zero, return a warning instead of dividing.

### Notifications

```javascript
function createSlackJob(targetType, targetId, targetRole, message)
function processPendingJobs()
function sendSlackMessage(webhookUrl, message)
```

Failed Slack sends do not rollback approval.

### Monthly Report

```javascript
function listMonthlyReportReadyPayments()
function markMonthlyReportExported(paymentIds)
```

First phase does not rewrite CSV generation. It only exposes `payment_approved` rows for the existing flow.

## 4. Required Tables

`Schema.gs` must define headers for:

- `db_requests`
- `db_payments`
- `db_budgets`
- `db_budget_categories`
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
| import test data | `importBudgetRequests`, `importPaymentRequests`, `importBudgetCategories` | manual during PoC |
| notification worker | `processPendingJobs` | every 5 minutes |
| budget recalc | `recalculateAllBudgets` | manual or hourly |

## 7. Minimal Build Order

1. Update `Schema.gs` constants and headers.
2. Import `db_budget_categories`.
3. Change `db_requests` import to budget request master.
4. Change `db_payments` import to inherit category through `request_id`.
5. Split approval logic into budget request and payment transitions.
6. Add payment exception detection.
7. Add notification jobs.
8. Connect `payment_approved` to monthly report listing.

## 8. Implementation Checks

- individual budget approval appends event
- recurring budget requires business then executive approval
- payment category is inherited from request
- normal payment completes with finance approval only
- exceptional payment escalates to business then executive
- invalid transition is rejected
- Slack failure is logged but approval remains complete
- category burn-rate warning is available
