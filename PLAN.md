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

Status: next

Goal:

Build the smallest working approval workflow for 20-30 test records.

Scope:

- create Google Sheets database tabs
- implement import mapping
- configure AppSheet approval queue
- implement approve / reject / return
- append approval events
- create and process Slack notification jobs
- verify budget pending calculation

## Milestone 3: Monthly Report Connection

Status: pending

Goal:

Connect `executive_approved` payments to the existing monthly CSV flow without rewriting the full export.

## Milestone 4: Pilot

Status: pending

Goal:

Run with a small group of real users and stabilize permissions, audit logs, and recovery operations.
