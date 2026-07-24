# Budget Payment Alert Configuration

This document is the source of truth for the AppSheet-first budget payment alert flow.
Do not use Apps Script for one-time column creation or data cleanup.

## 1. Add Sheet Columns First

In `db_requests`, add these four physical columns at the end of the Google Sheet:

| column | AppSheet type | purpose |
| --- | --- | --- |
| `payment_activity_status` | Enum | Payment execution status for an approved budget request |
| `payment_intent` | Enum | Requester says whether the budget will still be paid |
| `last_payment_alert_at` | DateTime | Last alert timestamp |
| `next_payment_alert_at` | DateTime | Next allowed alert timestamp |

After adding the headers, open AppSheet:

```text
Data -> Columns -> db_requests -> Regenerate schema
```

Current blocker as of 2026-07-22: live AppSheet `db_requests` still has 30 columns and these
four columns are not present, so the editor cannot be configured yet.

## 2. Column Settings

### `payment_activity_status`

| setting | value |
| --- | --- |
| Type | Enum |
| Values | `not_started`, `payment_active`, `fully_paid`, `payment_cancelled` |
| Initial value | `"not_started"` |
| Show | on |
| Editable | off |
| Required | off |
| Display name | `支払実行状況` |

### `payment_intent`

| setting | value |
| --- | --- |
| Type | Enum |
| Values | `will_pay`, `no_longer_needed` |
| Show | on |
| Editable | expression below |
| Required | off |
| Display name | `支払予定` |

Editable if:

```appsheet
OR(
  [requester_email] = USEREMAIL(),
  LOOKUP(USEREMAIL(), "db_users", "user_email", "role_code") = "admin"
)
```

Suggested values:

```appsheet
LIST("will_pay", "no_longer_needed")
```

### Alert timestamps

Apply to both `last_payment_alert_at` and `next_payment_alert_at`:

| setting | value |
| --- | --- |
| Type | DateTime |
| Show | on |
| Editable | off |
| Required | off |

Display names:

| column | display name |
| --- | --- |
| `last_payment_alert_at` | `最終支払確認通知日時` |
| `next_payment_alert_at` | `次回支払確認通知日時` |

## 3. Requester View

Create slice `slice_my_unpaid_budget_requests` on `db_requests`:

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

Create menu view:

| setting | value |
| --- | --- |
| View name | `未支払の予算申請` |
| For this data | `slice_my_unpaid_budget_requests` |
| View type | Table |
| Position | Menu |

## 4. AppSheet Alert Bot: Approved Budget With No Payment

Create an Automation bot on `db_requests`.

Event:

| setting | value |
| --- | --- |
| Event type | Scheduled |
| Frequency | Daily |
| For each row in table | `db_requests` |
| Run condition | expression below |

Run condition:

```appsheet
AND(
  [budget_request_status] = "approved",
  [payment_intent] <> "no_longer_needed",
  [approved_at] <= (NOW() - 30),
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
  ) = 0,
  OR(
    ISBLANK([last_payment_alert_at]),
    [last_payment_alert_at] <= (NOW() - 30)
  )
)
```

Process steps:

1. Call Slack webhook with a channel message.
2. Set current row values:

```text
last_payment_alert_at = NOW()
next_payment_alert_at = NOW() + 30
```

Slack body:

```json
{
  "text": "【支払確認】承認済み予算に支払登録がありません。申請者: <<[requester_name]>> / 件名: <<[request_title]>> / 支払予定がない場合は AppSheet で no_longer_needed を選択してください。"
}
```

## 5. AppSheet Alert Bot: Active Recurring Budget Missing Month-End Payment

Create another scheduled Automation bot on `db_requests`.

Schedule it for 09:00 JST on the 5th day of every month.

Run condition:

```appsheet
AND(
  [is_recurring_budget] = TRUE,
  [budget_request_status] = "approved",
  [payment_intent] <> "no_longer_needed",
  [valid_from] <= TODAY(),
  [valid_to] >= TODAY(),
  COUNT(
    SELECT(
      db_payments[payment_id],
      AND(
        [request_id] = [_THISROW].[request_id],
        [scheduled_payment_date] = EOMONTH(TODAY(), 0),
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
  ) = 0,
  OR(
    ISBLANK([last_payment_alert_at]),
    [last_payment_alert_at] < DATETIME(EOMONTH(TODAY(), -1) + 1)
  )
)
```

Process steps:

1. Call Slack webhook with a channel message.
2. Set current row values:

```text
last_payment_alert_at = NOW()
next_payment_alert_at = DATETIME(EOMONTH(TODAY(), 0) + 5)
```

Slack body:

```json
{
  "text": "【定常予算 支払確認】有効な定常予算ですが、今月の支払登録がありません。申請者: <<[requester_name]>> / 件名: <<[request_title]>>"
}
```

## 6. Activity Status Update

Use AppSheet actions/bots, not one-time Apps Script, to update `payment_activity_status`.

Create a data action on `db_requests`: `支払実行状況を再計算`

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

Run this action from bots when:

- a `db_payments.status_code` changes
- a `db_requests.payment_intent` changes
- a budget request becomes `approved`

## 7. Tests

- Approved budget older than 30 days with no payments sends one Slack alert.
- Re-running the scheduled bot on the same day does not duplicate alerts.
- `payment_intent = no_longer_needed` stops both alert bots.
- A linked `payment_draft`, `finance_check_pending`, or `payment_approved` sets activity to `payment_active`.
- Approved payment total greater than or equal to approved budget amount sets activity to `fully_paid`.
- Active recurring budget with no payment scheduled for the current month end sends an alert on the 5th.
- Active recurring budget with a current-month-end draft, pending, or approved payment does not alert.
