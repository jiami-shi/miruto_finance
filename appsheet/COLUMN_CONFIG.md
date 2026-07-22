# AppSheet Column Configuration

This is the manual AppSheet setup source of truth. There is no AppSheet MCP connector in this Codex environment.

## Setup Order

1. `db_users`
2. `db_budgets`
3. `db_budget_categories`
4. `db_requests`
5. `db_payments`
6. `db_approval_rules`
7. `db_approval_events`
8. `db_notifications`
9. `db_error_log`

## Shared Enum Values

### role values

```text
requester
finance_reviewer
business_approver
executive_approver
admin
system
```

For `db_users.role_code`, omit `system`.

### budget request type values

```text
individual_budget
recurring_budget
```

### budget request status values

```text
draft
submitted
business_approval_pending
business_approved
executive_approval_pending
executive_approved
approved
rejected
cancelled
error
```

### payment status values

```text
payment_draft
payment_submitted
finance_check_pending
exception_business_approval_pending
exception_executive_approval_pending
payment_approved
payment_rejected
payment_cancelled
payment_error
```

### budget category values

```text
development
cogs
advertising
management
expense
```

### budget payment activity values

```text
not_started
payment_active
fully_paid
payment_cancelled
```

### budget payment intent values

```text
will_pay
no_longer_needed
```

### action values

```text
submit
approve
approve_recurring
escalate
reject
cancel
return
resubmit
export
```

## `db_users`

| column | type | key | label | show | editable | required | app formula | initial value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `_RowNumber` | Number | off | off | off | off | off | empty | empty |
| `user_email` | Email | on | off | on | on | on | empty | empty |
| `display_name` | Text | off | on | on | on | on | empty | empty |
| `role_code` | Enum | off | off | on | on | on | empty | empty |
| `role_label_ja` | Text | off | off | on | on | on | empty | empty |
| `is_active` | Yes/No | off | off | on | on | on | empty | empty |

Put `role_code` options in `Type details > Values`, not in `App formula`.

## `db_budgets`

| column | type | key | label | show | editable | required | app formula | initial value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `_RowNumber` | Number | off | off | off | off | off | empty | empty |
| `budget_id` | Text | on | off | on | off | on | empty | empty |
| `budget_ref` | Text | off | on | on | off | on | empty | empty |
| `budget_name` | Text | off | off | on | off | on | empty | empty |
| `owner_name` | Text | off | off | on | off | off | empty | empty |
| `period` | Text | off | off | on | off | off | empty | empty |
| `allocated_amount` | Price | off | off | on | off | on | empty | empty |
| `used_amount` | Price | off | off | on | off | on | empty | empty |
| `pending_amount` | Price | off | off | on | off | on | empty | empty |
| `remaining_amount` | Price | off | off | on | off | on | empty | empty |
| `currency` | Enum | off | off | on | off | on | empty | empty |
| `updated_at` | DateTime | off | off | on | off | on | empty | empty |

## `db_budget_categories`

| column | type | key | label | show | editable | required | app formula | initial value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `_RowNumber` | Number | off | off | off | off | off | empty | empty |
| `budget_category_id` | Text | on | off | on | off | on | empty | empty |
| `budget_id` | Ref -> `db_budgets` | off | on | on | off | on | empty | empty |
| `budget_category_code` | Enum | off | off | on | off | on | empty | empty |
| `allocated_amount` | Price | off | off | on | off | on | empty | empty |
| `planned_amount` | Price | off | off | on | off | on | empty | empty |
| `actual_amount` | Price | off | off | on | off | on | empty | empty |
| `burn_rate` | Percent | off | off | on | off | off | empty | empty |
| `updated_at` | DateTime | off | off | on | off | on | empty | empty |

## `db_requests`

`db_requests` is the budget request master.

| column | type | key | label | show | editable | required | app formula | initial value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `_RowNumber` | Number | off | off | off | off | off | empty | empty |
| `request_id` | Text | on | off | off | off | on | empty | `UNIQUEID()` only for AppSheet-created rows |
| `source_sheet_name` | Text | off | off | off | off | on | empty | empty |
| `source_no` | Text | off | off | off | off | on | empty | empty |
| `request_type` | Enum | off | off | on | on | on | empty | empty |
| `request_title` | Text | off | on | on | on | on | empty | empty |
| `requester_email` | Email | off | off | on | off | off | empty | `USEREMAIL()` for AppSheet-created rows |
| `requester_name` | Text | off | off | on | on | off | empty | empty |
| `department` | Text | off | off | on | on | off | empty | empty |
| `product_name` | Text | off | off | on | on | off | empty | empty |
| `source_category_label` | Text | off | off | on | on | on | empty | empty |
| `budget_category_code` | Enum | off | off | on | on | on | empty | empty |
| `approved_amount_tax_excluded` | Price | off | off | on | on | on | empty | empty |
| `currency` | Enum | off | off | on | on | on | empty | `JPY` |
| `valid_from` | Date | off | off | on | on | required-if below | empty | empty |
| `valid_to` | Date | off | off | on | on | required-if below | empty | empty |
| `budget_request_status` | Enum | off | off | on | off | on | empty | `submitted` |
| `current_role` | Enum | off | off | off | off | off | empty | `business_approver` |
| `hd_budget_ref` | Text | off | off | off | on | off | empty | empty |
| `budget_id` | Ref -> `db_budgets` | off | off | off | on | off | empty | empty |
| `source_url` | URL | off | off | off | off | off | empty | empty |
| `created_at` | DateTime | off | off | off | off | on | empty | `NOW()` |
| `submitted_at` | DateTime | off | off | off | off | off | empty | `NOW()` |
| `approved_at` | DateTime | off | off | off | off | off | empty | empty |
| `updated_at` | DateTime | off | off | off | off | on | empty | `NOW()` |
| `payment_activity_status` | Enum | off | off | on | off | off | empty | `"not_started"` |
| `payment_intent` | Enum | off | off | on | editable-if below | off | empty | empty |
| `last_payment_alert_at` | DateTime | off | off | on | off | off | empty | empty |
| `next_payment_alert_at` | DateTime | off | off | on | off | off | empty | empty |

Required-if for `valid_from` and `valid_to`:

```appsheet
[request_type] = "recurring_budget"
```

Editable-if for `payment_intent`:

```appsheet
OR(
  [requester_email] = USEREMAIL(),
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "admin"
)
```

Suggested values for `payment_intent`:

```appsheet
LIST("will_pay", "no_longer_needed")
```

Display names:

| column | display name |
| --- | --- |
| `payment_activity_status` | `支払実行状況` |
| `payment_intent` | `支払予定` |
| `last_payment_alert_at` | `最終支払確認通知日時` |
| `next_payment_alert_at` | `次回支払確認通知日時` |

Before configuring these columns in AppSheet, add them to the physical `db_requests`
sheet and regenerate the AppSheet schema. Do not use Apps Script for this one-time
column addition.

## `db_payments`

Configure this before `db_approval_events`.

| column | type | key | label | show | editable | required | app formula | initial value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `_RowNumber` | Number | off | off | off | off | off | empty | empty |
| `payment_id` | Text | on | off | off | off | on | empty | empty |
| `request_id` | Ref -> `db_requests` | off | off | on | on | on | empty | empty |
| `payment_no` | Text | off | on | off | off | on | empty | empty |
| `payment_title` | Text | off | off | on | on | on | empty | empty |
| `requester_name` | Text | off | off | on | off | off | empty | empty |
| `payment_method` | Text | off | off | on | on | on | empty | empty |
| `vendor_name` | Text | off | off | on | on | off | empty | empty |
| `source_payment_status` | Text | off | off | off | off | off | empty | empty |
| `scheduled_payment_date` | Date | off | off | on | on | off | empty | empty |
| `payment_amount_tax_excluded` | Price | off | off | on | on | on | empty | empty |
| `currency` | Enum | off | off | on | on | on | empty | `JPY` |
| `evidence_url` | URL | off | off | on | on | off | empty | empty |
| `memo` | LongText | off | off | on | on | off | empty | empty |
| `business_request_no` | Text | off | off | off | off | off | empty | empty |
| `hd_budget_ref` | Text | off | off | off | off | off | empty | empty |
| `budget_id` | Ref -> `db_budgets` | off | off | off | off | off | `[request_id].[budget_id]` | empty |
| `status_code` | Enum | off | off | on | off | on | empty | `payment_submitted` |
| `current_role` | Enum | off | off | off | off | on | empty | `finance_reviewer` |
| `action_comment` | LongText | off | off | on | on | off | empty | empty |
| `last_action_at` | DateTime | off | off | off | off | off | empty | empty |
| `created_at` | DateTime | off | off | off | off | on | empty | `NOW()` |
| `updated_at` | DateTime | off | off | off | off | on | empty | `NOW()` |

Do not add editable `cost_category` to `db_payments`. If it already exists, set `Show=off`, `Editable=off`, `Required=off`.

### Virtual columns on `db_payments`

| column | type | app formula |
| --- | --- | --- |
| `inherited_budget_category_code` | Text | `[request_id].[budget_category_code]` |
| `inherited_source_category_label` | Text | `[request_id].[source_category_label]` |
| `request_approved_amount` | Price | `[request_id].[approved_amount_tax_excluded]` |
| `request_remaining_amount` | Price | `[request_id].[approved_amount_tax_excluded] - SUM(SELECT(db_payments[payment_amount_tax_excluded], AND([request_id] = [_THISROW].[request_id], [payment_id] <> [_THISROW].[payment_id], IN([status_code], {"finance_check_pending", "exception_business_approval_pending", "exception_executive_approval_pending", "payment_approved"}))))` |
| `has_payment_exception` | Yes/No | `OR([payment_amount_tax_excluded] > [request_remaining_amount], AND([request_id].[request_type] = "recurring_budget", OR([scheduled_payment_date] < [request_id].[valid_from], [scheduled_payment_date] > [request_id].[valid_to])))` |
| `exception_reason` | LongText | `IFS([payment_amount_tax_excluded] > [request_remaining_amount], "予算申請の残額を超過", AND([request_id].[request_type] = "recurring_budget", OR([scheduled_payment_date] < [request_id].[valid_from], [scheduled_payment_date] > [request_id].[valid_to])), "定常予算の有効期間外")` |

Keep category burn-rate formula simple in AppSheet. Use Apps Script for exact category balance if the expression becomes slow.

For draft rows, make these fields editable only while the row is still a draft and the
current user is its requester, finance, or admin:

```appsheet
OR(
  [status_code] <> "payment_draft",
  AND(
    [status_code] = "payment_draft",
    OR(
      [request_id].[requester_email] = USEREMAIL(),
      LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "finance_reviewer",
      LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "admin"
    )
  )
)
```

Apply that `Editable_If` to `payment_title`, `payment_method`, `vendor_name`,
`scheduled_payment_date`, `payment_amount_tax_excluded`, `evidence_url`, and `memo`. The
non-draft branch preserves the existing payment intake form behavior.

### Virtual columns on `db_requests`

| column | type | app formula |
| --- | --- | --- |
| `recurring_consumed_amount` | Price | `SUM(SELECT(db_payments[payment_amount_tax_excluded], AND([request_id] = [_THISROW].[request_id], [status_code] = "payment_approved")))` |
| `recurring_pending_amount` | Price | `SUM(SELECT(db_payments[payment_amount_tax_excluded], AND([request_id] = [_THISROW].[request_id], IN([status_code], {"payment_submitted", "finance_check_pending", "exception_business_approval_pending", "exception_executive_approval_pending"}))))` |
| `recurring_remaining_amount` | Price | `[approved_amount_tax_excluded] - [recurring_consumed_amount] - [recurring_pending_amount]` |

Show these three columns only for recurring budgets:

```appsheet
IN("recurring_budget", [request_type])
```

## `db_approval_events`

Audit table. Do not expose as an editable form to normal users.

| column | type | key | label | show | editable | required | app formula | initial value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `_RowNumber` | Number | off | off | off | off | off | empty | empty |
| `approval_event_id` | Text | on | off | off | off | on | empty | `UNIQUEID()` |
| `target_type` | Enum | off | off | on | off | on | empty | empty |
| `request_id` | Ref -> `db_requests` | off | off | off | off | off | empty | empty |
| `payment_id` | Ref -> `db_payments` | off | on | off | off | off | empty | empty |
| `actor_email` | Email | off | off | on | off | on | empty | `USEREMAIL()` |
| `actor_role` | Enum | off | off | on | off | on | empty | `LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code")` |
| `action` | Enum | off | off | on | off | on | empty | empty |
| `from_status` | Enum | off | off | on | off | on | empty | empty |
| `to_status` | Enum | off | off | on | off | on | empty | empty |
| `comment` | LongText | off | off | on | off | off | empty | empty |
| `created_at` | DateTime | off | off | on | off | on | empty | `NOW()` |

Display names:

| column | display name |
| --- | --- |
| `target_type` | `対象種別` |
| `actor_email` | `実行者` |
| `actor_role` | `役割` |
| `action` | `操作` |
| `from_status` | `変更前` |
| `to_status` | `変更後` |
| `comment` | `コメント` |
| `created_at` | `日時` |

Use `ステータス` as the display name for `db_requests.budget_request_status` and
`db_payments.status_code`. Hide generated `Related *` reverse-reference columns from
normal views unless a specific detail view needs one.

If AppSheet shows `Invalid dereference`, fix the referenced column type first. Dereference only works on `Ref` columns.

## `db_approval_rules`, `db_notifications`, `db_error_log`

Keep the existing columns unless rebuilding the PoC DB. They are admin/backend tables:

- `db_approval_rules`: read-only in AppSheet.
- `db_notifications`: read-only in AppSheet.
- `db_error_log`: read-only in AppSheet.

For `db_notifications`, keep legacy `payment_id` if it already exists, and add:

- `target_type`
- `target_id`

## Verification Checklist

- no table uses `_RowNumber` as key
- `db_requests.request_id` is Text key
- `db_payments.payment_id` is Text key
- `db_payments.request_id` is `Ref -> db_requests`
- `db_payments.cost_category` is absent or hidden/read-only
- `db_budget_categories.budget_id` is `Ref -> db_budgets`
- `db_approval_events.payment_id` is `Ref -> db_payments`
- `db_approval_events.request_id` is `Ref -> db_requests`
- enum values are in Type details, not App formula
