# Test Run

## 2026-07-10 PoC Setup

Status: in progress

PoC database:

- https://docs.google.com/spreadsheets/d/194C4nXsWYCEQEsuwuWVmZ18XJrGs8B_gGmhg698wfsY

Confirmed:

- `db_users` has real test users
- Slack test channel exists: `C0BGD8Q6GUW`
- Slack Incoming Webhook URL is available and must be stored only in Apps Script Script Properties
- test data can use historical payment records
- AppSheet should be configured as a new app

Still needed:

- AppSheet app creation from PoC DB
- Apps Script deployment or paste into Apps Script project

Latest test data was replaced from the pasted 2026 payment export.

Current seeded data:

- 11 latest payments
- 11 generated requests
- 3 budgets
- all payment evidence URLs are Google Drive links
- budget balances are based on `Sum_予算管理状況`
- source payment status is `経理確認済`
- workflow status is initialized as `finance_checked`
- current role is initialized as `business_approver`

First workflow test payment:

- `pay_PAY-234`

First evidence UI test payment:

- `pay_PAY-234`

Expected approval path:

```text
business_approver approve
executive_approver approve
```

For finance reviewer testing, manually reset one payment to:

```text
status_code = payment_candidate
current_role = finance_reviewer
```
