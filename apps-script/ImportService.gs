function importBudgetRequests() {
  throw new Error('importBudgetRequests must be implemented from the validated source-sheet header mapping.');
}

function importPaymentRequests() {
  throw new Error('importPaymentRequests must be updated for the budget authorization model before use.');
}

function importBudgetCategories() {
  throw new Error('importBudgetCategories must import Sum_予算管理状況 into db_budget_categories.');
}

function importHdBudgets() {
  throw new Error('importHdBudgets must be updated together with db_budget_categories before use.');
}
