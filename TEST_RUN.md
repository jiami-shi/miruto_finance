# Test Run

## 2026-07-10 PoC Setup

Status: in progress

PoC database:

- https://docs.google.com/spreadsheets/d/194C4nXsWYCEQEsuwuWVmZ18XJrGs8B_gGmhg698wfsY

Confirmed:

- `db_users` has real test users
- Slack test channel exists: `C0BGD8Q6GUW`
- test data can use historical payment records
- AppSheet should be configured as a new app

Still needed:

- Slack Incoming Webhook URL for channel `C0BGD8Q6GUW`
- AppSheet app creation from PoC DB
- Apps Script deployment or paste into Apps Script project

First target test payment:

- `pay_PAY-37`

Expected approval path:

```text
finance_reviewer approve
business_approver approve
executive_approver approve
```

