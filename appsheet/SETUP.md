# AppSheet Setup Guide

## 1. Data Source

Use the PoC database Google Spreadsheet containing:

- `db_requests`
- `db_payments`
- `db_budgets`
- `db_approval_events`
- `db_users`
- `db_approval_rules`
- `db_evidence_files`
- `db_notifications`
- `db_error_log`

Do not connect AppSheet directly to the original import tabs for approval actions.

## 2. Tables

| table | key | updates |
| --- | --- | --- |
| `db_payments` | `payment_id` | AppSheet actions |
| `db_requests` | `request_id` | read-only |
| `db_budgets` | `budget_id` | read-only |
| `db_approval_events` | `approval_event_id` | add only |
| `db_users` | `user_email` | admin only |
| `db_approval_rules` | `rule_id` | admin only |
| `db_notifications` | `notification_id` | read-only |
| `db_error_log` | `error_id` | read-only |

## 3. User Role Expression

Use this expression where a current user role is needed:

```appsheet
LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code")
```

Use this for active user checks:

```appsheet
LOOKUP(USEREMAIL(), "db_users", "user_email", "is_active") = TRUE
```

## 4. Security Filters

### `db_payments`

Admins can see all rows. Other users can see rows where their role is the current role.

```appsheet
OR(
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "admin",
  [current_role] = LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code")
)
```

### `db_approval_events`

Admins see all. Approvers see events for payments currently assigned to their role.

```appsheet
OR(
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "admin",
  IN(
    [payment_id],
    SELECT(
      db_payments[payment_id],
      [current_role] = LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code")
    )
  )
)
```

## 5. Slices

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

### `slice_admin_errors`

```appsheet
LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "admin"
```

## 6. Views

| view | source | type |
| --- | --- | --- |
| `経理確認キュー` | `slice_finance_queue` | deck/table |
| `事業承認キュー` | `slice_business_queue` | deck/table |
| `役員承認キュー` | `slice_executive_queue` | deck/table |
| `支払詳細` | `db_payments` | detail |
| `承認履歴` | `db_approval_events` | inline table |
| `予算残高` | `db_budgets` | detail/table |
| `通知ジョブ` | `db_notifications` | admin table |
| `エラーログ` | `db_error_log` | admin table |

## 7. Detail Layout

`支払詳細` should show:

- `payment_no`
- `payment_title`
- `vendor_name`
- `payment_amount_tax_excluded`
- `payment_method`
- `scheduled_payment_date`
- `cost_category`
- `budget_id`
- related budget remaining amount
- `evidence_url`
- `memo`
- approval history inline

## 8. Actions

Keep AppSheet actions simple. The preferred implementation is to call an Apps Script webhook/function for state transitions. If webhook integration is not ready, use grouped actions to update `db_payments` and add `db_approval_events`.

### Show condition for approve

```appsheet
IN(
  [status_code],
  SELECT(
    db_approval_rules[from_status],
    AND(
      [action] = "approve",
      [required_role] = LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code"),
      [is_active] = TRUE
    )
  )
)
```

### Finance approve target values

For `payment_candidate` or `returned_to_finance`:

```appsheet
IF(
  [status_code] = "returned_to_finance",
  "finance_checked",
  "finance_checked"
)
```

Set:

- `status_code`: `finance_checked`
- `current_role`: `business_approver`
- `last_action_at`: `NOW()`
- `updated_at`: `NOW()`

### Business approve target values

Set:

- `status_code`: `business_approved`
- `current_role`: `executive_approver`
- `last_action_at`: `NOW()`
- `updated_at`: `NOW()`

### Executive approve target values

Set:

- `status_code`: `executive_approved`
- `current_role`: blank or `system`
- `last_action_at`: `NOW()`
- `updated_at`: `NOW()`

### Return action

Business and executive return to finance:

- `status_code`: `returned_to_finance`
- `current_role`: `finance_reviewer`

Finance return to requester:

- `status_code`: `returned_to_requester`
- `current_role`: `requester`

### Reject action

Set:

- `status_code`: `rejected`
- `current_role`: blank

## 9. Comment Input

Use a lightweight `action_comment` column in `db_payments` for AppSheet action input, then copy it to `db_approval_events.comment`.

After event append, clear `action_comment`.

## 10. Bots

Use Bots only for AppSheet-local convenience:

- on payment status change, add approval event if webhook is not used
- on status change to next approver, add notification job

Preferred backend path: Apps Script owns event append and notification creation.

## 11. Admin Checks

Admin must be able to inspect:

- payments stuck in `error`
- notification jobs with `failed`
- payments without approval events
- payments with missing `budget_id`

