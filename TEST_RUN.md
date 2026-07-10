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

First workflow test payment:

- `pay_PAY-37`

First evidence UI test payment:

- `pay_PAY-T100`

Expected approval path:

```text
finance_reviewer approve
business_approver approve
executive_approver approve
```
