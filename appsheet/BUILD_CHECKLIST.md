# AppSheet PoC Build Checklist

## 1. Create App

Create a new AppSheet app from:

https://docs.google.com/spreadsheets/d/194C4nXsWYCEQEsuwuWVmZ18XJrGs8B_gGmhg698wfsY

Use these tables:

- `db_payments`
- `db_requests`
- `db_budgets`
- `db_approval_events`
- `db_users`
- `db_approval_rules`
- `db_notifications`
- `db_error_log`

## 2. Confirm Keys

| table | key |
| --- | --- |
| `db_payments` | `payment_id` |
| `db_requests` | `request_id` |
| `db_budgets` | `budget_id` |
| `db_approval_events` | `approval_event_id` |
| `db_users` | `user_email` |
| `db_approval_rules` | `rule_id` |
| `db_notifications` | `notification_id` |
| `db_error_log` | `error_id` |

For complete column setup, use [COLUMN_CONFIG.md](COLUMN_CONFIG.md).

For usable approval screens, use [UX_CONFIG.md](UX_CONFIG.md).

## 3. Replace User Emails

Done in `db_users`.

Current roles:

- `finance_reviewer`
- `business_approver`
- `executive_approver`
- `admin`

## 4. Add Security Filter For `db_payments`

```appsheet
OR(
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "admin",
  [current_role] = LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code")
)
```

## 5. Create Slices

### `slice_finance_queue`

```appsheet
AND(
  [current_role] = "finance_reviewer",
  IN([status_code], {"payment_candidate", "returned_to_finance"}),
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "finance_reviewer"
)
```

### `slice_business_queue`

```appsheet
AND(
  [current_role] = "business_approver",
  [status_code] = "finance_checked",
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "business_approver"
)
```

### `slice_executive_queue`

```appsheet
AND(
  [current_role] = "executive_approver",
  [status_code] = "business_approved",
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "executive_approver"
)
```

## 6. Create Views

| view | source |
| --- | --- |
| `経理確認キュー` | `slice_finance_queue` |
| `事業承認キュー` | `slice_business_queue` |
| `役員承認キュー` | `slice_executive_queue` |
| `支払詳細` | `db_payments` |
| `エラーログ` | `db_error_log` |
| `通知ジョブ` | `db_notifications` |

## 7. First Manual Test

Use one payment:

```text
pay_PAY-T100
```

Expected flow:

```text
payment_candidate
  -> finance_checked
  -> business_approved
  -> executive_approved
```

Do not test all 20 rows first. One row is enough to prove the workflow wiring.

Use `pay_PAY-T100` for evidence-link testing because the earlier first 20 seeded rows mostly do not have `evidence_url`.
