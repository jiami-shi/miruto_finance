# ADR-001: Use AppSheet For Approval UI

## Status

Accepted

## Context

The current GAS Web App approval UI is fragile, difficult to embed reliably in Google Sites, and depends on custom UI logic.

The first phase needs a small, secure, maintainable approval queue for a limited internal group.

## Decision

Use AppSheet as the first-phase approval UI.

AppSheet will provide:

- role-based approval queues
- payment detail pages
- evidence link display
- approve / reject / return actions
- admin views for errors and notifications

## Consequences

Good:

- lower implementation cost than a custom web app
- Google login and Workspace integration are native
- faster PoC with less custom UI code

Tradeoffs:

- AppSheet expression and permission design must be carefully reviewed
- complex UX customization is limited
- source data shape must stay clean

