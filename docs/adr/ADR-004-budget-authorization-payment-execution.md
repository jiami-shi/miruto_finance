# ADR-004: Separate Budget Authorization From Payment Execution

## Status

Accepted

## Context

The original PoC treated each payment as the main approval object. That made every payment move through a fixed approval chain and left budget category selection too close to payment execution.

The business rule is different:

- category is chosen during budget request
- individual budgets need only business approval
- recurring budgets need business and executive approval
- normal payments should not repeat full approval
- exceptional payments should escalate

## Decision

Use budget requests as authorization objects and payments as execution objects.

- `db_requests` is the budget request master.
- `db_payments` references an approved budget request.
- payment category is inherited from the linked budget request.
- normal payment is approved by `finance_reviewer`.
- exceptional payment escalates to `business_approver -> executive_approver`.
- category burn-rate warning is calculated against `db_budget_categories`.

## Consequences

Good:

- fewer unnecessary approvals for normal payments
- category is controlled before payment execution
- recurring budgets can authorize repeated payments within a valid period
- audit history is clearer because budget approval and payment confirmation are separate

Tradeoffs:

- AppSheet needs separate budget and payment queues
- Apps Script needs two state machines
- existing PoC seed data must be realigned before workflow testing
- source category labels need a validated mapping to the five standard categories
