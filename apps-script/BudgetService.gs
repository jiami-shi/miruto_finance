const PENDING_STATUSES = [
  'finance_checked',
  'business_approved',
  'executive_approved',
  'monthly_report_exported',
  'returned_to_finance',
];

function recalculateBudget(budgetId) {
  const budget = findObjectByKey_(SHEETS.BUDGETS, 'budget_id', budgetId);
  if (!budget) return;

  const payments = readObjects_(SHEETS.PAYMENTS).filter(function (payment) {
    return payment.budget_id === budgetId;
  });
  const pending = payments.filter(function (payment) {
    return PENDING_STATUSES.indexOf(payment.status_code) >= 0;
  }).reduce(function (sum, payment) {
    return sum + parseAmount_(payment.payment_amount_tax_excluded);
  }, 0);
  const used = payments.filter(function (payment) {
    return payment.status_code === 'completed';
  }).reduce(function (sum, payment) {
    return sum + parseAmount_(payment.payment_amount_tax_excluded);
  }, 0);
  const allocated = parseAmount_(budget.allocated_amount);

  updateObjectByKey_(SHEETS.BUDGETS, 'budget_id', budgetId, {
    used_amount: used,
    pending_amount: pending,
    remaining_amount: allocated - used - pending,
    updated_at: nowIso_(),
  });
}

function recalculateAllBudgets() {
  readObjects_(SHEETS.BUDGETS).forEach(function (budget) {
    recalculateBudget(budget.budget_id);
  });
}
