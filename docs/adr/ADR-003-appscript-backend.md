# ADR-003: Use Apps Script For Backend Jobs

## Status

Accepted

## Context

The existing system already uses Apps Script, and the first phase should stay inside Google Workspace.

The new workflow needs backend processing, but not a custom UI server.

## Decision

Use Apps Script for backend jobs only.

Apps Script will handle:

- imports from existing sheets
- database synchronization
- approval event append
- budget recalculation
- Slack notification jobs
- monthly CSV connection
- error logging

## Consequences

Good:

- reuses existing operational knowledge
- no new infrastructure
- works well with Google Sheets and Drive

Tradeoffs:

- execution quotas and trigger reliability must be monitored
- backend functions need clear boundaries
- long-running operations should be split into small jobs
