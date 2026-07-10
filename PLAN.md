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

- create Google Sheets database tabs: done for old schema, needs alignment
- seed latest payment records: done
- add/align `db_budget_categories`: pending
- make `db_requests` the budget request master: pending in PoC DB
- make payment category inherited/read-only: pending in AppSheet
- configure budget approval queues: pending
- configure finance confirmation queue: pending
- configure exceptional payment queues: pending
- append approval events: pending in AppSheet runtime
- create and process Slack notification jobs: local Apps Script code exists, needs state model update
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
