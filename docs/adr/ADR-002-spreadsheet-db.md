# ADR-002: Use Google Sheets As First-Phase Database

## Status

Accepted

## Context

The current data volume is small, roughly hundreds of records. The priority is separating source sheets, database tables, and views, not moving to a heavier database.

## Decision

Use Google Sheets as the first-phase database.

Create controlled `db_*` sheets as the source of truth for the PoC, while existing source sheets remain import sources during migration.

## Consequences

Good:

- low cost
- easy to inspect and operate
- fits Google Workspace users
- enough for the first-phase data volume

Tradeoffs:

- direct sheet edits must be controlled
- schema changes need discipline
- Apps Script must use header-based access, not hard-coded column indexes

