# AppSheet UX Configuration

This file defines the minimum usable approval UI. The default AppSheet generated UI is not acceptable for approval because it hides the evidence link and shows low-value technical fields.

## Current Test Data Note

The first 20 seeded payments mostly do not have `evidence_url`.

Additional evidence test rows were added to the PoC DB:

| payment_id | payment_no | evidence |
| --- | --- | --- |
| `pay_PAY-T100` | `PAY-T100` | yes |
| `pay_PAY-T103` | `PAY-T103` | yes |
| `pay_PAY-T60` | `PAY-T60` | yes |
| `pay_PAY-T61` | `PAY-T61` | yes |
| `pay_PAY-T107` | `PAY-T107` | yes |

Use `pay_PAY-T100` for the first evidence UI test.

## Table Permissions UX

In `Data > Tables`:

| table | Updates allowed | Add | Edit | Delete |
| --- | --- | --- | --- | --- |
| `db_payments` | Updates only | off | on | off |
| `db_requests` | Read-only | off | off | off |
| `db_budgets` | Read-only | off | off | off |
| `db_approval_events` | Adds only | on | off | off |
| `db_users` | Read-only | off | off | off |
| `db_approval_rules` | Read-only | off | off | off |
| `db_notifications` | Read-only | off | off | off |
| `db_error_log` | Read-only | off | off | off |

Hide system-generated Add/Delete actions for normal users. Approval should happen through explicit approve/return/reject actions, not the default Edit form.

## Primary Payment View

Create or update the finance queue view:

| setting | value |
| --- | --- |
| View name | `経理確認キュー` |
| For this data | `slice_finance_queue` |
| View type | `Deck` |
| Position | `Primary` |
| Sort by | `scheduled_payment_date` descending, then `payment_amount_tax_excluded` descending |
| Group by | none for first PoC |

Deck card fields:

| AppSheet field | value |
| --- | --- |
| Primary header | `payment_title` |
| Secondary header | `vendor_name` |
| Summary column | `payment_amount_tax_excluded` |
| Image | empty |

If AppSheet asks for columns:

- Title/main: `payment_title`
- Subtitle: `payment_no`
- Detail: `vendor_name`
- Detail: `payment_amount_tax_excluded`

Do not use `requester_name` as the primary header. It makes every row look the same.

## Payment Detail View

Create or update detail view:

| setting | value |
| --- | --- |
| View name | `支払詳細` |
| For this data | `db_payments` or queue slice |
| View type | `Detail` |

Recommended field order:

1. `payment_title`
2. `payment_no`
3. `status_code`
4. `current_role`
5. `payment_amount_tax_excluded`
6. `scheduled_payment_date`
7. `vendor_name`
8. `payment_method`
9. `cost_category`
10. `budget_id`
11. `evidence_url`
12. `memo`
13. `action_comment`
14. related approval events inline view

Hide these from the main detail view:

- `payment_id`
- `request_id`
- `source_payment_status`
- `business_request_no`
- `hd_budget_ref`
- `created_at`
- `updated_at`

They can remain visible in admin/debug views later.

## Evidence Link Display

For `db_payments.evidence_url`:

| setting | value |
| --- | --- |
| Type | `URL` |
| Show | on |
| Editable | off |
| Required | off |
| Display name | `証憑を開く` |

Create an action:

| setting | value |
| --- | --- |
| Action name | `証憑を開く` |
| For a record of this table | `db_payments` |
| Do this | `External: go to a website` |
| Target | `[evidence_url]` |
| Only if this condition is true | `ISNOTBLANK([evidence_url])` |
| Display prominently | on |

Use the action as the user-facing evidence button. The raw URL can be shown in detail during PoC, but the button is easier for approvers.

## Google Drive Evidence Preview

If the evidence is a Google Drive file URL like:

```text
https://drive.google.com/file/d/1xgjbsBLPqospES_14V3GrkXJq0yj3obL/view?usp=sharing
```

AppSheet can show a better inline preview than it can for external services such as freee or Bakuraku.

### Recommended PoC setup

Add a virtual column on `db_payments`:

| setting | value |
| --- | --- |
| Column name | `evidence_preview_url` |
| Type | `URL` |
| App formula | see below |
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

Add `evidence_preview_url` near `evidence_url` in the payment detail view.

### Preview caveat

Google Drive files must be accessible to the AppSheet user. If Drive permissions block the current user, the preview/link will fail even when the URL format is correct.

For non-Google-Drive evidence URLs, keep using the `証憑を開く` action instead of expecting inline preview.

## Amount Display

For amount columns:

- `payment_amount_tax_excluded`: Type `Price`
- `approved_amount_tax_excluded`: Type `Price`
- `allocated_amount`: Type `Price`
- `used_amount`: Type `Price`
- `pending_amount`: Type `Price`
- `remaining_amount`: Type `Price`

If AppSheet shows `$`, change the app locale/currency if available. If not, keep it for PoC and fix display later. Do not block the approval flow on currency symbol polish.

## Navigation

For normal approvers, show only:

- `経理確認キュー`
- `事業承認キュー`
- `役員承認キュー`

For admin, also show:

- `予算残高`
- `通知ジョブ`
- `エラーログ`

Hide these generated views from navigation:

- `db_requests`
- `db_users`
- `db_approval_rules`
- `db_approval_events`

They can still exist as referenced/inline data.

## Remove Default Clutter

In `Behavior > Actions`, hide or disable generated system actions for normal users:

- Delete
- Add
- default Edit if custom approval actions are ready

For now, keep Edit only if needed to enter `action_comment`. Once approve/return/reject actions exist, remove default Edit from the main view.

## First UX Test

Use:

```text
pay_PAY-T100
```

Expected detail page:

- approver can read title, vendor, payment amount, scheduled date, payment method
- `証憑を開く` button appears
- raw technical IDs are not the first thing shown
- action comment is visible near the bottom
