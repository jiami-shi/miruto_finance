# AppSheet PoC Build Checklist

## 1. Create App

Create a new AppSheet app from:

https://docs.google.com/spreadsheets/d/194C4nXsWYCEQEsuwuWVmZ18XJrGs8B_gGmhg698wfsY

Use these tables:

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

## 2. Confirm Keys

| table | key |
| --- | --- |
| `db_requests` | `request_id` |
| `db_payments` | `payment_id` |
| `db_budgets` | `budget_id` |
| `db_budget_categories` | `budget_category_id` |
| `db_approval_events` | `approval_event_id` |
| `db_users` | `user_email` |
| `db_approval_rules` | `rule_id` |
| `db_notifications` | `notification_id` |
| `db_error_log` | `error_id` |

Use [COLUMN_CONFIG.md](COLUMN_CONFIG.md) for exact columns.

## 3. Confirm Refs

- `db_requests.budget_id` -> `db_budgets`
- `db_payments.request_id` -> `db_requests`
- `db_payments.budget_id` -> `db_budgets`
- `db_budget_categories.budget_id` -> `db_budgets`
- `db_approval_events.request_id` -> `db_requests`
- `db_approval_events.payment_id` -> `db_payments`

## 4. Hide Old Payment Category

If `db_payments.cost_category` exists:

- Show: off
- Editable: off
- Required: off

Payment category must be displayed through:

- `[request_id].[source_category_label]`
- `[request_id].[budget_category_code]`

## 5. Create Slices and Views

Use [UX_CONFIG.md](UX_CONFIG.md).

Required budget queues:

- `個別予算 事業承認キュー`
- `定常予算 事業承認キュー`
- `定常予算 役員承認キュー`

Required payment queues:

- `経理確認キュー`
- `異常支払 事業承認キュー`
- `異常支払 役員承認キュー`

## 6. Create Actions

Minimum actions:

- individual budget approve
- recurring budget business approve
- recurring budget executive approve
- budget reject/cancel
- normal payment finance approve
- exceptional payment escalate
- exceptional payment business approve
- exceptional payment executive approve
- payment reject/cancel

Every state-changing action must append one `db_approval_events` row.

## 7. First Manual Tests

Run only one row per case first:

1. `individual_budget`: business approval -> `approved`
2. `recurring_budget`: business approval -> executive approval -> `approved`
3. normal payment: finance approval -> `payment_approved`
4. exceptional payment: finance escalation -> business approval -> executive approval -> `payment_approved`
5. evidence link opens from payment detail

Do not test all rows until these pass.
