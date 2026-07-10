const PENDING_STATUSES = [
  'finance_check_pending',
  'exception_business_approval_pending',
  'exception_executive_approval_pending',
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
    return payment.status_code === 'payment_approved';
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

function recalculateBudgetCategory(budgetId, budgetCategoryCode) {
  const row = readObjects_(SHEETS.BUDGET_CATEGORIES).find(function (category) {
    return category.budget_id === budgetId && category.budget_category_code === budgetCategoryCode;
  });
  if (!row) return;
  const allocated = parseAmount_(row.allocated_amount);
  const planned = parseAmount_(row.planned_amount);
  updateObjectByKey_(SHEETS.BUDGET_CATEGORIES, 'budget_category_id', row.budget_category_id, {
    burn_rate: allocated ? planned / allocated : '',
    updated_at: nowIso_(),
  });
}

function recalculateAllBudgets() {
  readObjects_(SHEETS.BUDGETS).forEach(function (budget) {
    recalculateBudget(budget.budget_id);
  });
}
