# Project Plan

## Milestone 0: Product Definition

Status: done

Deliverables:

- PRD drafted
- project documentation rules defined
- initial ADRs created
- handoff file created

## Milestone 1: PoC Design

Status: superseded

Original design focused on per-payment approval. It was replaced by the budget authorization + payment execution model.

## Milestone 2: PoC Build

Status: in progress

Goal:

Build the smallest working workflow for:

```text
budget request approval
payment finance confirmation
exceptional payment escalation
approval event audit log
```

Current scope:

- create Google Sheets database tabs: done, aligned to `COLUMN_CONFIG.md`
- seed latest payment records: done (but not test-ready — see `TEST_RUN.md`)
- add/align `db_budget_categories`: done
- make `db_requests` the budget request master: done in PoC DB
- make payment category inherited/read-only: done in AppSheet (no `cost_category`; inherited columns)
- configure budget approval queues: done (individual/recurring business, recurring executive)
- configure finance confirmation queue: done
- configure exceptional payment queues: done (exception business, exception executive)
- append approval events: done — two audit bots (`_audit_payment_event`, `_audit_budget_request_event`) append `db_approval_events` on each status change (see `TEST_RUN.md`)
- create and process Slack notification jobs: local Apps Script code exists, needs state model update + deploy
- verify budget category warning: pending

Current artifact:

- `Finance Workflow PoC DB`: https://docs.google.com/spreadsheets/d/194C4nXsWYCEQEsuwuWVmZ18XJrGs8B_gGmhg698wfsY

Exit criteria:

- individual budget enters only business approver queue
- recurring budget enters business then executive queue
- payment inherits budget category and cannot edit category
- normal payment is approved by finance only
- exceptional payment escalates to business then executive
- all approve/reject/cancel actions append `db_approval_events`
- Google Drive evidence link is visible on payment detail
- category burn-rate warning is visible

## Milestone 3: Monthly Report Connection

Status: pending

Goal:

Connect `payment_approved` payments to the existing monthly CSV flow without rewriting the full export.

## Milestone 4: Pilot

Status: pending

Goal:

Run with a small group of real users and stabilize permissions, audit logs, and recovery operations.

# 2026-07-17 recurring payment drafts

- [x] Generate one empty-amount `payment_draft` per approved recurring budget and month.
- [x] Use deterministic `payment_id` plus a script lock so reruns do not duplicate rows.
- [x] Limit generation to requests with an owner email and an active validity period.
- [x] Document requester/finance draft editing, submission, payment history, and usage formulas.
- [ ] Run `generateRecurringPaymentDrafts()` in Apps Script for the first target month.
- [ ] Add a monthly Apps Script trigger after the first manual run is verified.
- [x] Add consumed, pending, and remaining virtual columns to `db_requests` in AppSheet.
- [ ] Add the documented payment-history/draft slices, views, and submit action in AppSheet.
