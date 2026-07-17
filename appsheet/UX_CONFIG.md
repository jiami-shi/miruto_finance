# AppSheet UX Configuration

The generated AppSheet UI is not acceptable for approval. It hides evidence, overexposes IDs, and does not show budget risk.

## Table Permissions

In `Data > Tables`:

| table | Updates allowed | Add | Edit | Delete |
| --- | --- | --- | --- | --- |
| `db_requests` | Updates only | on for requesters/admin | on via actions | off |
| `db_payments` | Updates only | on for requesters/admin | on via actions | off |
| `db_budgets` | Read-only | off | off | off |
| `db_budget_categories` | Read-only | off | off | off |
| `db_approval_events` | Adds only | on | off | off |
| `db_users` | Read-only | off | off | off |
| `db_approval_rules` | Read-only | off | off | off |
| `db_notifications` | Read-only | off | off | off |
| `db_error_log` | Read-only | off | off | off |

Hide generated Add/Edit/Delete actions from normal approvers once explicit actions exist.

## Slices

### Budget approval slices

`slice_individual_budget_business_queue`

```appsheet
AND(
  [request_type] = "individual_budget",
  [budget_request_status] = "business_approval_pending",
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "business_approver"
)
```

`slice_recurring_budget_business_queue`

```appsheet
AND(
  [request_type] = "recurring_budget",
  [budget_request_status] = "business_approval_pending",
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "business_approver"
)
```

`slice_recurring_budget_executive_queue`

```appsheet
AND(
  [request_type] = "recurring_budget",
  [budget_request_status] = "executive_approval_pending",
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "executive_approver"
)
```

### Payment slices

`slice_my_payment_history`

```appsheet
[request_id].[requester_email] = USEREMAIL()
```

`slice_recurring_payment_drafts`

```appsheet
AND(
  [status_code] = "payment_draft",
  STARTSWITH([payment_id], "pay_recurring_")
)
```

The `pay_recurring_` prefix is deterministic and prevents old manually created
`payment_draft` rows from appearing in the recurring-generation work queue. Row visibility
is still enforced by the `db_payments` security filter.

`slice_finance_check_queue`

```appsheet
AND(
  [status_code] = "finance_check_pending",
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "finance_reviewer"
)
```

`slice_exception_business_queue`

```appsheet
AND(
  [status_code] = "exception_business_approval_pending",
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "business_approver"
)
```

`slice_exception_executive_queue`

```appsheet
AND(
  [status_code] = "exception_executive_approval_pending",
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "executive_approver"
)
```

## Views

Budget views:

| view | data | type | position |
| --- | --- | --- | --- |
| `個別予算 事業承認キュー` | `slice_individual_budget_business_queue` | Deck | Primary |
| `定常予算 事業承認キュー` | `slice_recurring_budget_business_queue` | Deck | Primary |
| `定常予算 役員承認キュー` | `slice_recurring_budget_executive_queue` | Deck | Primary |

Payment views:

| view | data | type | position |
| --- | --- | --- | --- |
| `自分の支払申請履歴` | `slice_my_payment_history` | Table | Primary |
| `定常予算 支払ドラフト` | `slice_recurring_payment_drafts` | Table | Primary |
| `経理確認キュー` | `slice_finance_check_queue` | Deck | Primary |
| `異常支払 事業承認キュー` | `slice_exception_business_queue` | Deck | Primary |
| `異常支払 役員承認キュー` | `slice_exception_executive_queue` | Deck | Primary |

For `slice_my_payment_history` and `slice_recurring_payment_drafts`, keep Updates enabled
but disable Adds and Deletes. New payments must use the dedicated `支払を登録` form.

Deck fields:

- Primary header: `request_title` or `payment_title`
- Secondary header: `vendor_name` for payments, `requester_name` for budgets
- Summary: amount column
- Sort: scheduled date descending, then amount descending

## Budget Detail Layout

Recommended order for `db_requests` detail:

1. `request_title`
2. `request_type`
3. `budget_request_status`
4. `approved_amount_tax_excluded`
5. `source_category_label`
6. `budget_category_code`
7. `valid_from`
8. `valid_to`
9. `budget_id`
10. `product_name`
11. `department`
12. related payments inline view
13. `recurring_consumed_amount`
14. `recurring_pending_amount`
15. `recurring_remaining_amount`
16. related approval events inline view

Hide technical IDs from normal detail top area:

- `request_id`
- `source_sheet_name`
- `source_no`
- `source_url`
- `created_at`
- `updated_at`

## Payment Detail Layout

Recommended order:

1. `payment_title`
2. `payment_no`
3. `status_code`
4. `payment_amount_tax_excluded`
5. `scheduled_payment_date`
6. `vendor_name`
7. `payment_method`
8. `inherited_source_category_label`
9. `inherited_budget_category_code`
10. `request_approved_amount`
11. `request_remaining_amount`
12. `has_payment_exception`
13. `exception_reason`
14. `evidence_url`
15. `evidence_preview_url`
16. `memo`
17. `action_comment`
18. related approval events inline view

Do not show editable `cost_category` on payment forms.

## Evidence Preview

For `db_payments.evidence_url`:

| setting | value |
| --- | --- |
| Type | `URL` |
| Show | on |
| Editable | off |
| Display name | `証憑を開く` |

Create an action:

| setting | value |
| --- | --- |
| Action name | `証憑を開く` |
| For a record of this table | `db_payments` |
| Do this | `External: go to a website` |
| Target | `[evidence_url]` |
| Only if this condition is true | `ISNOTBLANK([evidence_url])` |
| Position | Prominent |

Add virtual column `evidence_preview_url`:

| setting | value |
| --- | --- |
| Type | `URL` |
| Show | on |
| Editable | off |
| Display name | `証憑プレビュー` |

Formula:

```appsheet
IF(
  CONTAINS([evidence_url], "drive.google.com/file/d/"),
  SUBSTITUTE(
    SUBSTITUTE([evidence_url], "/view?usp=sharing", "/preview"),
    "/view?usp=drive_link",
    "/preview"
  ),
  ""
)
```

Google Drive permissions still apply. If the AppSheet user cannot access the file, preview will fail.

## Core Actions

### Budget approve action for individual budget

Table: `db_requests`

Condition:

```appsheet
AND(
  [request_type] = "individual_budget",
  [budget_request_status] = "business_approval_pending",
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "business_approver"
)
```

Set:

```text
budget_request_status = approved
current_role = ""
approved_at = NOW()
updated_at = NOW()
```

### Budget approve action for recurring budget by business

Condition:

```appsheet
AND(
  [request_type] = "recurring_budget",
  [budget_request_status] = "business_approval_pending",
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "business_approver"
)
```

Set:

```text
budget_request_status = executive_approval_pending
current_role = executive_approver
updated_at = NOW()
```

### Budget approve action for recurring budget by executive

Condition:

```appsheet
AND(
  [request_type] = "recurring_budget",
  [budget_request_status] = "executive_approval_pending",
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "executive_approver"
)
```

Set:

```text
budget_request_status = approved
current_role = ""
approved_at = NOW()
updated_at = NOW()
```

### Payment finance approve

Condition:

```appsheet
AND(
  [status_code] = "finance_check_pending",
  NOT([has_payment_exception]),
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "finance_reviewer"
)
```

Set:

```text
status_code = payment_approved
current_role = ""
last_action_at = NOW()
updated_at = NOW()
```

### Submit recurring payment draft

Allow the linked requester, finance, or admin to submit only after the required payment
fields have been filled:

```appsheet
AND(
  [status_code] = "payment_draft",
  [payment_amount_tax_excluded] > 0,
  ISNOTBLANK([payment_method]),
  ISNOTBLANK([vendor_name]),
  ISNOTBLANK([scheduled_payment_date]),
  OR(
    [request_id].[requester_email] = USEREMAIL(),
    LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "finance_reviewer",
    LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "admin"
  )
)
```

Set:

```text
status_code = finance_check_pending
current_role = finance_reviewer
last_action_at = NOW()
updated_at = NOW()
```

### Payment escalation

Condition:

```appsheet
AND(
  [status_code] = "finance_check_pending",
  [has_payment_exception],
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "finance_reviewer"
)
```

Set:

```text
status_code = exception_business_approval_pending
current_role = business_approver
last_action_at = NOW()
updated_at = NOW()
```

### Exception payment approvals

Business approval set:

```text
status_code = exception_executive_approval_pending
current_role = executive_approver
last_action_at = NOW()
updated_at = NOW()
```

Executive approval set:

```text
status_code = payment_approved
current_role = ""
last_action_at = NOW()
updated_at = NOW()
```

For every state-changing action, add a grouped action that also adds a row to `db_approval_events`.

## Navigation

For normal approvers, show only queues relevant to their role. If a manager can see duplicate queues, check:

- each queue uses a slice, not the raw table
- each slice has a `LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code")` condition
- generated views for `db_requests` and `db_payments` are hidden from navigation

For admin, show:

- `db_budgets`
- `db_budget_categories`
- `db_notifications`
- `db_error_log`

## First UX Test

Expected:

- category appears on payment detail but is not editable
- Google Drive evidence button appears
- normal payment can be approved by finance only
- exceptional payment shows reason and escalation action
- budget approval queues differ for individual and recurring budgets
