# AppSheet UX Configuration

The generated AppSheet UI is not acceptable for approval. It hides evidence, overexposes IDs, and does not show budget risk.

## Table Permissions

In `Data > Tables`:

| table | Updates allowed | Add | Edit | Delete |
| --- | --- | --- | --- | --- |
| `db_requests` | Updates only | on for requesters/admin | on via actions | off |
| `db_payments` | Updates only | on for requesters/admin | on via actions | off |
| `db_budgets` | Adds and updates | on | on | off |
| `db_budget_categories` | Adds and updates | on | on | off |
| `db_approval_events` | Adds only | on | off | off |
| `db_users` | Read-only | off | off | off |
| `db_approval_rules` | Read-only | off | off | off |
| `db_notifications` | Read-only | off | off | off |
| `db_error_log` | Read-only | off | off | off |
| `db_vendors` | Adds and updates | on | on via approval action | off |

Hide generated Add/Edit/Delete actions from normal approvers once explicit actions exist.

Maintenance Form views:

| view | data | type | position | Show if |
| --- | --- | --- | --- | --- |
| `月次HD予算を登録` | `db_budgets` | Form | Menu | finance reviewer or admin |
| `カテゴリ予算を追加` | `db_budget_categories` | Form | Menu | finance reviewer or admin |
| `取引先を追加` | `db_vendors` | Form | Menu | all signed-in applicants |

The finance/admin Show-if expression uses scalar comparisons because `role_code` is an
AppSheet `Enum` backed by Text:

```appsheet
OR(
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "finance_reviewer",
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "admin"
)
```

Do not use `IN(role, LOOKUP(...role_code...))`; the second argument is Text, not a list.

Role-less users keep only the normal applicant views (`ホーム`, `未支払予算申請`,
`予算を申請`, `予算申請履歴`, `支払を登録`, `支払申請履歴`,
`定常予算 支払ドラフト`) plus `取引先を追加`. Approval queues and operational views
must have a scalar `role_code` Show-if condition.

## Slices

### Budget approval slices

`slice_individual_budget_business_queue`

```appsheet
AND(
  [request_type] = "individual_budget",
  [budget_request_status] = "business_approval_pending",
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "business_approver",
  ISNOTBLANK([budget_id]),
  [approved_amount_tax_excluded] <= [budget_id].[remaining_amount]
)
```

`slice_recurring_budget_business_queue`

```appsheet
AND(
  [request_type] = "recurring_budget",
  [budget_request_status] = "business_approval_pending",
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "business_approver",
  ISNOTBLANK([budget_id]),
  [approved_amount_tax_excluded] <= [budget_id].[remaining_amount]
)
```

`slice_recurring_budget_executive_queue`

```appsheet
AND(
  [request_type] = "recurring_budget",
  [budget_request_status] = "executive_approval_pending",
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "executive_approver",
  ISNOTBLANK([budget_id]),
  [approved_amount_tax_excluded] <= [budget_id].[remaining_amount]
)
```

`slice_my_unpaid_budget_requests`

```appsheet
AND(
  [requester_email] = USEREMAIL(),
  [budget_request_status] = "approved",
  OR(
    ISBLANK([payment_activity_status]),
    [payment_activity_status] = "not_started"
  ),
  [payment_intent] <> "no_longer_needed"
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

### Vendor approval slice

`slice_vendor_business_queue`

```appsheet
AND(
  [approval_status] = "business_approval_pending",
  OR(
    LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "business_approver",
    LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "admin"
  )
)
```

## Views

Budget views:

| view | data | type | position |
| --- | --- | --- | --- |
| `個別予算 事業承認キュー` | `slice_individual_budget_business_queue` | Deck | Primary |
| `定常予算 事業承認キュー` | `slice_recurring_budget_business_queue` | Deck | Primary |
| `定常予算 役員承認キュー` | `slice_recurring_budget_executive_queue` | Deck | Primary |
| `未支払の予算申請` | `slice_my_unpaid_budget_requests` | Table | Menu |

Payment views:

| view | data | type | position |
| --- | --- | --- | --- |
| `自分の支払申請履歴` | `slice_my_payment_history` | Table | Primary |
| `定常予算 支払ドラフト` | `slice_recurring_payment_drafts` | Table | Primary |
| `経理確認キュー` | `slice_finance_check_queue` | Deck | Primary |
| `異常支払 事業承認キュー` | `slice_exception_business_queue` | Deck | Primary |
| `異常支払 役員承認キュー` | `slice_exception_executive_queue` | Deck | Primary |

Vendor approval view:

| view | data | type | position |
| --- | --- | --- | --- |
| `取引先 事業承認キュー` | `slice_vendor_business_queue` | Deck | Primary |

Use the same `business_approver` / `admin` expression as the slice for the view Show-if.

Audit view:

| view | data | type | position | sort |
| --- | --- | --- | --- | --- |
| `承認履歴` | `db_approval_events` | Table | Menu | `created_at` descending |

The audit view is visible only to roles allowed by the `db_approval_events` security
filter. Keep the generated audit form out of normal navigation.

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
2. `is_recurring_budget` (display name: `定常予算ですか？`, default: `FALSE`)
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
16. `payment_activity_status`
17. `payment_intent`
18. `last_payment_alert_at`
19. `next_payment_alert_at`
20. related approval events inline view

Display `approved_amount_tax_excluded` as `申請金額（定常予算は月額・税抜）`.
For recurring requests, display:

- `recurring_consumed_amount` as `累計支払額`
- `recurring_pending_amount` as `本月申請中額`
- `recurring_remaining_amount` as `本月残額`

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

Configure the system-generated file action:

| setting | value |
| --- | --- |
| Action | `Open File (evidence_file)` |
| Display name | `証憑を開く` |
| Position | Primary |

Do not create a second custom file action. Set both system-generated
`Open Url (evidence_preview_url)` and `Open Url (evidence_url)` actions to `Hide`.

For payment approval detail views, set **Main image** to `None`. An actual image in
`evidence_image` can render in an AppSheet image slot, but a PDF cannot. The production
flow is PDF-heavy, so use the single `証憑を開く` primary action for both PDFs and images
instead of showing empty image blocks.

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

### Vendor approve action

Action name: `取引先を事業承認`

Set:

```text
approval_status = "approved"
approved_by = USEREMAIL()
approved_at = TEXT(NOW())
```

Availability condition:

```appsheet
AND(
  [approval_status] = "business_approval_pending",
  OR(
    LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "business_approver",
    LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "admin"
  )
)
```

`is_active` becomes true from its App formula after approval.

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

## Budget Payment Alerts

Detailed setup lives in [BUDGET_PAYMENT_ALERTS.md](BUDGET_PAYMENT_ALERTS.md). Use AppSheet
Automation for these alerts. Do not use Apps Script for one-time column creation or cleanup.

Create action `支払実行状況を再計算` on `db_requests`.

Set `payment_activity_status` to:

```appsheet
IFS(
  [payment_intent] = "no_longer_needed", "payment_cancelled",
  SUM(
    SELECT(
      db_payments[payment_amount_tax_excluded],
      AND(
        [request_id] = [_THISROW].[request_id],
        [status_code] = "payment_approved"
      )
    )
  ) >= [approved_amount_tax_excluded], "fully_paid",
  COUNT(
    SELECT(
      db_payments[payment_id],
      AND(
        [request_id] = [_THISROW].[request_id],
        IN(
          [status_code],
          LIST(
            "payment_draft",
            "payment_submitted",
            "finance_check_pending",
            "exception_business_approval_pending",
            "exception_executive_approval_pending",
            "payment_approved"
          )
        )
      )
    )
  ) > 0, "payment_active",
  TRUE, "not_started"
)
```

Create two scheduled alert bots:

- approved budget older than 30 days with no linked payment
- active recurring budget with no payment scheduled for the current month end on day 5

Both bots send Slack channel messages and update:

```text
last_payment_alert_at = NOW()
next_payment_alert_at = <next allowed alert datetime>
```

## Navigation

### Mobile layout

- Keep only five role workflow views in Primary Navigation:
  `予算 事業承認キュー`, `予算承認`, `経理確認キュー`,
  `支払 事業承認キュー`, and `支払承認`.
- Put application forms, histories, and duplicate exception queues in Menu Navigation.
- Enable `Use tabs in mobile view` on the `ホーム` dashboard.
- Use Deck for `予算残高`: primary `budget_name`, secondary `budget_id`, summary
  `remaining_amount`.
- Use Deck for `カテゴリ別消化`: primary `budget_id`, secondary
  `budget_category_code`, summary `burn_rate`.
- Keep the generated payment Ref actions, but set their user-facing names:
  `View Ref (budget_id)` -> `HD予算を見る` and
  `View Ref (request_id)` -> `予算申請を見る`.

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
