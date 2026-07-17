# Go-Live Checklist & Acceptance Run

The Milestone 2 build is essentially complete. What remains is **① activation (owner-only) →
② deploy or preview → ③ acceptance test**. Work top to bottom.

References: [`TEST_PLAN.md`](TEST_PLAN.md) (TC-001–011) and [`TEST_RUN.md`](TEST_RUN.md) (what was built).

---

## Part A. Pre-deployment checklist

### A-0. Recurring payment production activation (completed 2026-07-17)

- [x] AppSheet slices `slice_my_payment_history` and
  `slice_recurring_payment_drafts` are live.
- [x] Menu views `自分の支払申請履歴` and `定常予算 支払ドラフト` are live.
- [x] Action `支払ドラフトを経理へ提出` validates amount, payment method, vendor,
  and scheduled date before moving a draft to `finance_check_pending`.
- [x] `db_payments` security filter allows finance to inspect payments, requesters to
  inspect linked payments, and other approvers to inspect their assigned queue.
- [x] Apps Script monthly trigger runs `generateRecurringPaymentDrafts` on day 1,
  between 05:00 and 06:00 Asia/Tokyo, with immediate failure notification.
- [x] AppSheet editor reports `No issues found` and the preview is runnable.

The trigger intentionally generates nothing until a recurring request is `approved`, has
`requester_email`, and has a validity range overlapping the target month.

### A-1. Owner-only steps (GAS activation)

- [ ] **One-time OAuth consent** — open the Apps Script project and run one function that uses
  SpreadsheetApp (e.g. `sendSlackMessage_`) once manually, then approve the scopes in the browser.
  Without this, the back-end cannot read the DB.
- [ ] **Set the Slack webhook Script Property** — Apps Script → Project Settings → Script
  Properties → add:
  - key: `FINANCE_WORKFLOW_SLACK_WEBHOOK_URL`
  - value: a Slack Incoming Webhook URL (`https://hooks.slack.com/services/...`). The destination
    channel is bound to the webhook at creation time.
  - Note: `SLACK_DEFAULT_CHANNEL` (`C0BGD8Q6GUW`) is defined in config but **not used** by the
    send code — the actual destination is whatever channel the webhook is bound to.

### A-2. Data (db_users / seed data)

- [ ] `db_users` has the 5 roles with **real Workspace emails**: `finance_reviewer`,
  `business_approver`, `executive_approver`, `requester`, `admin` ([TEST_PLAN.md](TEST_PLAN.md) §2).
- [ ] Seed-data variation ([TEST_PLAN.md](TEST_PLAN.md) §3):
  - [ ] `individual_budget` ≥3, `recurring_budget` ≥3
  - [ ] normal payments within budget ≥5 (**currently only 1** → add more)
  - [ ] payments exceeding request remaining amount ≥2
  - [ ] recurring-budget payment **outside** `valid_from`/`valid_to` ≥1 (for TC-009; currently none)
  - [ ] Google Drive evidence links ≥3, rows sharing one budget/category ≥3, ≥1 category over 100% burn rate
- [ ] Do NOT load full production history into the PoC. Never overwrite the existing production sheet.

### A-3. AppSheet structure (just confirm it exists)

- [ ] 9 role-gated actions (3 on db_requests, 4 on db_payments + 証憑を開く) — green in Errors & Warnings
- [ ] 6 slices + 6 deck views (one per queue)
- [ ] Two audit bots, **no Error badge**:
  - `_audit_payment_event` (db_payments, `target_type="payment"`)
  - `_audit_budget_request_event` (db_requests, `target_type="budget_request"`)
- [ ] `db_approval_events` has been regenerated (`target_type` and Ref types present) ✅

---

## Part B. How to run it (2 options)

Everything is role-gated (depends on `USEREMAIL()`), so it must be run **as the user of that role**.

- **B-1. Preview as user (recommended, no deploy needed).** In the editor preview, set "view as"
  a specific test-user email; the slice security filters then apply. TC-001–010 can be verified
  this way. Preview *as the owner* does not enforce the slices reliably — always enter an explicit
  test-user email.
- **B-2. Deploy (production-like).** Manage → Deploy, share with the A-1 test users, verify with
  real logins. Use this when moving toward Pilot.

Either way, running transitions mutates the PoC seed data (fine — it is test data).

---

## Part C. Acceptance run (per-TC steps and checks)

For each TC: who does it, what they do, what to check. After every state change, confirm one new
row lands in `db_approval_events`.

| TC | Who | Action | Pass criteria |
|----|-----|--------|---------------|
| **001** individual budget approve | business | approve an individual in `business_approval_pending` | `budget_request_status=approved`, `current_role` blank, `approved_at` set, +1 audit row |
| **002** recurring business approve | business | approve a recurring in `business_approval_pending` | `=executive_approval_pending`, `current_role=executive_approver`, +1 audit row |
| **003** recurring executive approve | executive | approve the same recurring | `=approved`, `current_role` blank, `approved_at` set, +1 audit row |
| **004** payment inherits category | anyone | open a payment detail | shows `source_category_label` / `budget_category_code`; **no** editable `cost_category` |
| **005** normal payment finance approve | finance | approve a non-exceptional `finance_check_pending` payment | `status_code=payment_approved`, `current_role` blank, +1 audit row, no business/executive queue item |
| **006** over-budget escalation | finance | handle a payment with `has_payment_exception=TRUE` | finance-approve hidden/blocked, escalate visible, `=exception_business_approval_pending`, `current_role=business_approver`, +1 audit row |
| **007** exceptional business approve | business | approve the exceptional payment | `=exception_executive_approval_pending`, `current_role=executive_approver`, +1 audit row |
| **008** exceptional executive approve | executive | approve | `status_code=payment_approved`, `current_role` blank, +1 audit row |
| **009** recurring payment outside period | — | inspect an out-of-period payment | `has_payment_exception=TRUE`, `exception_reason` contains `定常予算の有効期間外`, enters exceptional path |
| **010** unauthorized cannot approve | wrong role | try to approve | action hidden/blocked; calling GAS directly is rejected by validation |
| **011** Slack failure | admin | force a Slack send failure | approval stays committed, notification job = `failed`, error is recorded |

**Reading the audit log**: after each action, open `db_approval_events` and confirm one new row
with the correct `target_type` (payment/budget_request), `from_status`→`to_status`, `actor_email`,
`created_at`.

**Also verify**:
- [ ] burn-rate warning shows for the over-100% category
- [ ] no branch depends on Japanese status text (code keys off `status_code` / `budget_request_status`)
- [ ] the existing monthly CSV flow is unchanged

---

## Part D. Success criteria (summary of [TEST_PLAN.md](TEST_PLAN.md) §5)

- individual vs. recurring budgets follow different approval paths
- normal payments need finance only; exceptional payments escalate business → executive
- every state change appends an audit event ✅ (bots built; verify E2E)
- queues show only role-relevant rows
- payment category is inherited/read-only; warning appears over 100%

## Part E. Rollback ([TEST_PLAN.md](TEST_PLAN.md) §6)

If something breaks: disable AppSheet access → stop Apps Script triggers → archive the PoC DB →
continue the current spreadsheet workflow. Never overwrite a production sheet.

---

## Recording results

After running, append dated results (pass/fail + notes per TC) to `TEST_RUN.md`.
