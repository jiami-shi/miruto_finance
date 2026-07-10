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
- product model changed to budget authorization + payment execution confirmation

Current seeded data before schema alignment:

- 11 latest payments
- 11 generated requests
- 3 budgets
- all payment evidence URLs are Google Drive links
- budget balances are based on `Sum_予算管理状況`

Important:

- Existing PoC rows were created under the older payment-first model.
- Before the next test run, align the PoC DB with `appsheet/COLUMN_CONFIG.md`.
- Add `db_budget_categories`.
- Convert `db_requests` into budget request master rows with `request_type`, `source_category_label`, and `budget_category_code`.
- Hide or remove editable payment-level `cost_category`.

Next expected tests:

1. `individual_budget` approval by `business_approver`.
2. `recurring_budget` approval by `business_approver`, then `executive_approver`.
3. normal `finance_check_pending` payment approved by `finance_reviewer`.
4. exceptional payment escalated to `business_approver`, then `executive_approver`.
5. Google Drive evidence preview from payment detail.

No full workflow test has passed under the new state model yet.
