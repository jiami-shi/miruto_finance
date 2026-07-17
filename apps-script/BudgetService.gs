const PENDING_STATUSES = [
  'finance_check_pending',
  'exception_business_approval_pending',
  'exception_executive_approval_pending',
];

function generateRecurringPaymentDrafts(targetMonth) {
  const month = recurringDraftMonth_(targetMonth);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const existingIds = readObjects_(SHEETS.PAYMENTS).reduce(function (ids, payment) {
      ids[String(payment.payment_id)] = true;
      return ids;
    }, {});
    const result = {
      target_month: month.key,
      inserted: 0,
      skipped_existing: 0,
      skipped_ineligible: 0,
    };

    readObjects_(SHEETS.REQUESTS).forEach(function (request) {
      if (request.request_type !== 'recurring_budget' ||
          request.budget_request_status !== 'approved' ||
          !request.requester_email ||
          !isMonthInRequestValidity_(request, month)) {
        result.skipped_ineligible++;
        return;
      }

      const paymentId = recurringDraftPaymentId_(request.request_id, month.key);
      if (existingIds[paymentId]) {
        result.skipped_existing++;
        return;
      }

      const now = nowIso_();
      appendObject_(SHEETS.PAYMENTS, {
        payment_id: paymentId,
        request_id: request.request_id,
        payment_no: 'DRAFT-' + month.key.replace('-', '') + '-' + (request.source_no || request.request_id),
        payment_title: (request.request_title || request.source_no || request.request_id) + ' ' + month.key,
        requester_name: request.requester_name || request.requester_email,
        payment_amount_tax_excluded: '',
        currency: request.currency || 'JPY',
        memo: '[AUTO] ' + month.key + ' recurring payment draft',
        business_request_no: request.source_no,
        hd_budget_ref: request.hd_budget_ref,
        budget_id: request.budget_id,
        status_code: 'payment_draft',
        current_role: 'finance_reviewer',
        created_at: now,
        updated_at: now,
      });
      existingIds[paymentId] = true;
      result.inserted++;
    });

    return result;
  } finally {
    lock.releaseLock();
  }
}

function recurringDraftMonth_(targetMonth) {
  const key = String(typeof targetMonth === 'string' && targetMonth || Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy-MM'
  )).trim();
  const match = key.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) throw new Error('targetMonth must be YYYY-MM');

  const year = Number(match[1]);
  const month = Number(match[2]);
  return {
    key: key,
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0),
  };
}

function isMonthInRequestValidity_(request, month) {
  const validFrom = parseSheetDate_(request.valid_from);
  const validTo = parseSheetDate_(request.valid_to);
  if (!validFrom || !validTo) return false;
  return validFrom <= month.end && validTo >= month.start;
}

function parseSheetDate_(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const match = String(value).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function recurringDraftPaymentId_(requestId, monthKey) {
  return 'pay_recurring_' + normalizeKey_(requestId) + '_' + monthKey.replace('-', '');
}

function testRecurringPaymentDraftHelpers() {
  const july = recurringDraftMonth_('2026-07');
  if (!isMonthInRequestValidity_({ valid_from: '2026-07-15', valid_to: '2026/08/10' }, july)) {
    throw new Error('Overlapping month should be eligible');
  }
  if (isMonthInRequestValidity_({ valid_from: '2026-08-01', valid_to: '' }, july)) {
    throw new Error('Future validity should be ineligible');
  }
  if (isMonthInRequestValidity_({ valid_from: '', valid_to: '' }, july)) {
    throw new Error('Missing validity should be ineligible');
  }
  if (parseSheetDate_('2026-02-31')) throw new Error('Invalid dates must be rejected');
  if (recurringDraftPaymentId_('req_1', '2026-07') !== 'pay_recurring_req_1_202607') {
    throw new Error('Draft ID must be stable');
  }
  if (recurringDraftPaymentId_('req_1', '2026-07') === recurringDraftPaymentId_('req_1', '2026-08')) {
    throw new Error('Different months need different draft IDs');
  }
  return 'ok';
}

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
