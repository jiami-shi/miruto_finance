# Project Plan

## Milestone 0: Product Definition

Status: done

Deliverables:

- PRD drafted
- project documentation rules defined
- initial ADRs created
- handoff file created

## Milestone 1: PoC Design

Status: done

Goal:

Design the minimum AppSheet + Google Sheets + Apps Script PoC for payment approval.

Scope:

- confirm source spreadsheet headers
- define `db_*` sheet schemas
- define AppSheet tables, slices, views, and actions
- define Apps Script file structure and key functions
- define Slack notification job flow
- define test data and acceptance cases

Exit criteria:

- `DESIGN.md` exists: done
- `appsheet/SETUP.md` exists: done
- `apps-script/IMPLEMENTATION_PLAN.md` exists: done
- `TEST_PLAN.md` exists: done
- ADRs are updated if any decision changes: no decision change
- `HANDOFF.md` reflects the latest state: done

## Milestone 2: PoC Build

Status: in progress

Goal:

Build the smallest working approval workflow for 20-30 test records.

Scope:

- create Google Sheets database tabs: done
- seed 20-30 payment records: done, 20 records
- implement import mapping: local Apps Script code drafted
- configure AppSheet approval queue: pending
- implement approve / reject / return: local Apps Script code drafted
- append approval events: local Apps Script code drafted
- create and process Slack notification jobs: local Apps Script code drafted
- verify budget pending calculation: pending in Apps Script runtime

Current artifact:

- `Finance Workflow PoC DB`: https://docs.google.com/spreadsheets/d/194C4nXsWYCEQEsuwuWVmZ18XJrGs8B_gGmhg698wfsY

## Milestone 3: Monthly Report Connection

Status: pending

Goal:

Connect `executive_approved` payments to the existing monthly CSV flow without rewriting the full export.

## Milestone 4: Pilot

Status: pending

Goal:

Run with a small group of real users and stabilize permissions, audit logs, and recovery operations.
