# AppSheet Setup Guide

Use this only as the high-level setup sequence. Exact column settings are in [COLUMN_CONFIG.md](COLUMN_CONFIG.md). Exact views/actions are in [UX_CONFIG.md](UX_CONFIG.md).

## 1. Data Source

Create a new AppSheet app from the PoC database:

https://docs.google.com/spreadsheets/d/194C4nXsWYCEQEsuwuWVmZ18XJrGs8B_gGmhg698wfsY

Do not connect approval actions directly to the original source/import tabs.

Required tables:

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

## 2. Core Model

- `db_requests` is budget request authorization.
- `db_payments` is payment execution confirmation.
- Category is selected on `db_requests`, not on `db_payments`.
- Normal payment is approved by `finance_reviewer` only.
- Exceptional payment escalates to `business_approver -> executive_approver`.

## 3. User Role Expression

```appsheet
LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code")
```

Active user check:

```appsheet
LOOKUP(USEREMAIL(), "db_users", "user_email", "is_active") = TRUE
```

## 4. Security Filters

### `db_requests`

```appsheet
OR(
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "admin",
  [current_role] = LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code"),
  [requester_email] = USEREMAIL()
)
```

### `db_payments`

```appsheet
OR(
  IN("admin", LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code")),
  IN([current_role], LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code")),
  [request_id].[requester_email] = USEREMAIL()
)
```

### `db_approval_events`

```appsheet
OR(
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "admin",
  [actor_email] = USEREMAIL()
)
```

Use broader event visibility only if approvers need to inspect full history.

## 5. Build Sequence

1. Configure table keys and refs from `COLUMN_CONFIG.md`.
2. Add `db_budget_categories`.
3. Hide or disable editable `db_payments.cost_category`.
4. Create slices from `UX_CONFIG.md`.
5. Create queue views from `UX_CONFIG.md`.
6. Create state-changing grouped actions.
7. Add one `db_approval_events` insert to every grouped action.
8. Test one row per queue before exposing the app.

## 6. Required Queues

Budget queues:

- `個別予算 事業承認キュー`
- `定常予算 事業承認キュー`
- `定常予算 役員承認キュー`

Payment queues:

- `経理確認キュー`
- `異常支払 事業承認キュー`
- `異常支払 役員承認キュー`

## 7. Admin Checks

Admin must be able to inspect:

- requests stuck in `error`
- payments stuck in `payment_error`
- notification jobs with `failed`
- rows without approval events
- payments without linked approved budget request
- payments where category was not inherited from request
