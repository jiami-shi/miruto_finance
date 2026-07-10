# AppSheet Column Configuration

This file is the source of truth for manual AppSheet column setup.

Current limitation: there is no AppSheet MCP connector in this Codex environment. AppSheet app configuration must be done manually in the AppSheet UI. Google Sheets data and repo files can be managed by Codex; AppSheet schema, slices, views, and actions cannot be directly edited by Codex here.

## Important AppSheet Rules

- Put fixed dropdown options in `Type details > Values`, not in `App formula`.
- Leave `App formula` empty unless the column must always be calculated.
- A dereference like `[payment_id].[request_id]` only works when `payment_id` is `Ref`.
- Configure referenced table keys first, then configure Ref columns.
- Do not use `_RowNumber` as a key.
- `db_approval_events` is an audit table. Users should not directly edit it.

## Setup Order

Configure tables in this order:

1. `db_users`
2. `db_requests`
3. `db_budgets`
4. `db_payments`
5. `db_approval_rules`
6. `db_approval_events`
7. `db_notifications`
8. `db_error_log`

## Shared Enum Values

### role values

Use these for `role_code`, `current_role`, `required_role`, `next_role`, and `actor_role`.

```text
requester
finance_reviewer
business_approver
executive_approver
admin
system
```

For `db_users.role_code`, omit `system`.

### payment status values

```text
payment_candidate
finance_checked
business_approved
executive_approved
monthly_report_exported
completed
returned_to_finance
returned_to_requester
rejected
cancelled
error
```

### action values

```text
approve
return
reject
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

`role_code` values:

```text
requester
finance_reviewer
business_approver
executive_approver
admin
```

Current seeded users in PoC DB:

| user_email | role_code |
| --- | --- |
| `jiamin_shi@reazon.jp` | `finance_reviewer` |
| `yuki_kurihara@reazon.jp` | `business_approver` |
| `yutaro_ninomiya@rudel.jp` | `executive_approver` |
| `tools@new-t.jp` | `admin` |

## `db_requests`

| column | type | key | label | show | editable | required | app formula | initial value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `_RowNumber` | Number | off | off | off | off | off | empty | empty |
| `request_id` | Text | on | off | on | off | on | empty | empty |
| `source_sheet_name` | Text | off | off | on | off | on | empty | empty |
| `source_no` | Text | off | off | on | off | on | empty | empty |
| `request_type` | Enum | off | off | on | off | on | empty | empty |
| `request_title` | Text | off | on | on | off | on | empty | empty |
| `requester_name` | Text | off | off | on | off | off | empty | empty |
| `requester_email` | Email | off | off | on | off | off | empty | empty |
| `department` | Text | off | off | on | off | off | empty | empty |
| `product_name` | Text | off | off | on | off | off | empty | empty |
| `cost_category` | Text | off | off | on | off | off | empty | empty |
| `budget_id` | Ref -> `db_budgets` | off | off | on | off | off | empty | empty |
| `requested_amount` | Price | off | off | on | off | off | empty | empty |
| `currency` | Enum | off | off | on | off | on | empty | empty |
| `request_status` | Enum | off | off | on | off | on | empty | empty |
| `source_url` | URL | off | off | on | off | off | empty | empty |
| `created_at` | DateTime | off | off | on | off | on | empty | empty |
| `updated_at` | DateTime | off | off | on | off | on | empty | empty |

`request_type` values:

```text
payment_import
individual
recurring
hd_budget
```

`currency` values:

```text
JPY
```

`request_status` values:

```text
active
returned_to_requester
cancelled
completed
error
```

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

## `db_payments`

Configure this before `db_approval_events`.

| column | type | key | label | show | editable | required | app formula | initial value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `_RowNumber` | Number | off | off | off | off | off | empty | empty |
| `payment_id` | Text | on | off | on | off | on | empty | empty |
| `request_id` | Ref -> `db_requests` | off | off | on | off | on | empty | empty |
| `payment_no` | Text | off | on | on | off | on | empty | empty |
| `payment_title` | Text | off | off | on | off | on | empty | empty |
| `requester_name` | Text | off | off | on | off | off | empty | empty |
| `payment_method` | Text | off | off | on | off | on | empty | empty |
| `vendor_name` | Text | off | off | on | off | off | empty | empty |
| `source_payment_status` | Text | off | off | on | off | off | empty | empty |
| `scheduled_payment_date` | Date | off | off | on | off | off | empty | empty |
| `approved_amount_tax_excluded` | Price | off | off | on | off | off | empty | empty |
| `payment_amount_tax_excluded` | Price | off | off | on | off | on | empty | empty |
| `currency` | Enum | off | off | on | off | on | empty | empty |
| `evidence_url` | URL | off | off | on | off | off | empty | empty |
| `memo` | LongText | off | off | on | off | off | empty | empty |
| `business_request_no` | Text | off | off | on | off | off | empty | empty |
| `hd_budget_ref` | Text | off | off | on | off | off | empty | empty |
| `budget_id` | Ref -> `db_budgets` | off | off | on | off | off | empty | empty |
| `cost_category` | Text | off | off | on | off | off | empty | empty |
| `status_code` | Enum | off | off | on | off | on | empty | empty |
| `current_role` | Enum | off | off | on | off | on | empty | empty |
| `action_comment` | LongText | off | off | on | on | off | empty | empty |
| `last_action_at` | DateTime | off | off | on | off | off | empty | empty |
| `created_at` | DateTime | off | off | on | off | on | empty | empty |
| `updated_at` | DateTime | off | off | on | off | on | empty | empty |

`status_code` values: use payment status values.

`current_role` values: use role values.

## `db_approval_rules`

| column | type | key | label | show | editable | required | app formula | initial value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `_RowNumber` | Number | off | off | off | off | off | empty | empty |
| `rule_id` | Text | on | off | on | on | on | empty | empty |
| `from_status` | Enum | off | off | on | on | on | empty | empty |
| `action` | Enum | off | off | on | on | on | empty | empty |
| `required_role` | Enum | off | off | on | on | on | empty | empty |
| `to_status` | Enum | off | off | on | on | on | empty | empty |
| `next_role` | Enum | off | off | on | on | off | empty | empty |
| `is_active` | Yes/No | off | off | on | on | on | empty | empty |

Use payment status values for `from_status` and `to_status`.

Use action values for `action`.

Use role values for `required_role` and `next_role`.

## `db_approval_events`

Audit table. Do not expose as an editable form to normal users.

| column | type | key | label | show | editable | required | app formula | initial value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `_RowNumber` | Number | off | off | off | off | off | empty | empty |
| `approval_event_id` | Text | on | off | on | off | on | empty | `UNIQUEID()` |
| `payment_id` | Ref -> `db_payments` | off | on | on | off | on | empty | empty |
| `request_id` | Ref -> `db_requests` | off | off | on | off | on | empty | `[payment_id].[request_id]` |
| `actor_email` | Email | off | off | on | off | on | empty | `USEREMAIL()` |
| `actor_role` | Enum | off | off | on | off | on | empty | `LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code")` |
| `action` | Enum | off | off | on | off | on | empty | empty |
| `from_status` | Enum | off | off | on | off | on | empty | empty |
| `to_status` | Enum | off | off | on | off | on | empty | empty |
| `comment` | LongText | off | off | on | off | off | empty | empty |
| `created_at` | DateTime | off | off | on | off | on | empty | `NOW()` |

If AppSheet shows `Invalid dereference. Column payment_id is not a Ref`, fix `db_approval_events.payment_id` first:

- Type: `Ref`
- Referenced table: `db_payments`
- Key: off

If `Ref` is unavailable or broken, fix `db_payments.payment_id` first:

- Type: `Text`
- Key: on

## `db_notifications`

| column | type | key | label | show | editable | required | app formula | initial value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `_RowNumber` | Number | off | off | off | off | off | empty | empty |
| `notification_id` | Text | on | off | on | off | on | empty | empty |
| `payment_id` | Ref -> `db_payments` | off | on | on | off | off | empty | empty |
| `type` | Enum | off | off | on | off | on | empty | empty |
| `target_role` | Enum | off | off | on | off | off | empty | empty |
| `target_channel` | Text | off | off | on | off | off | empty | empty |
| `message` | LongText | off | off | on | off | on | empty | empty |
| `status` | Enum | off | off | on | off | on | empty | empty |
| `attempt_count` | Number | off | off | on | off | on | empty | empty |
| `last_error` | LongText | off | off | on | off | off | empty | empty |
| `created_at` | DateTime | off | off | on | off | on | empty | empty |
| `sent_at` | DateTime | off | off | on | off | off | empty | empty |

`type` values:

```text
slack
```

`status` values:

```text
pending
sent
failed
cancelled
```

## `db_error_log`

| column | type | key | label | show | editable | required | app formula | initial value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `_RowNumber` | Number | off | off | off | off | off | empty | empty |
| `error_id` | Text | on | off | on | off | on | empty | empty |
| `service_name` | Text | off | on | on | off | on | empty | empty |
| `function_name` | Text | off | off | on | off | on | empty | empty |
| `severity` | Enum | off | off | on | off | on | empty | empty |
| `message` | LongText | off | off | on | off | on | empty | empty |
| `context_json` | LongText | off | off | on | off | off | empty | empty |
| `created_at` | DateTime | off | off | on | off | on | empty | empty |

`severity` values:

```text
info
warning
error
critical
```

## Known Current UI Mistake

The user tried entering enum values into `App formula` for `db_users.role_code`.

That is wrong. The fix is:

- clear `App formula`
- open `Type details`
- put role values in `Values`
- turn off `Allow other values`
- set input mode to dropdown

## Verification Checklist

After column setup:

- no table uses `_RowNumber` as key
- every `*_id` key column is `Text`, except Ref columns pointing to those keys
- `db_approval_events.payment_id` is `Ref -> db_payments`
- `db_approval_events.request_id` accepts `[payment_id].[request_id]`
- `db_users.role_code` has empty App formula
- `db_payments.payment_id` is Text key
- `db_payments.payment_no` is label
- all DateTime columns are DateTime, not Text
