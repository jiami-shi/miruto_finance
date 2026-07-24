const PENDING_STATUSES = [
  'finance_check_pending',
  'exception_business_approval_pending',
  'exception_executive_approval_pending',
];
const RECURRING_DRAFT_PAYMENT_METHODS = ['振込前払い', '翌月末払い', 'クレカ払い'];

// Auto-draft one recurring payment per active recurring budget for the target month.
// Rule: budget is recurring_budget + approved + the target month is inside valid_from..valid_to,
// AND its latest payment used a recurring method. We clone that latest
// payment (vendor / method / title / currency), leave the amount BLANK for the user to fill, and
// skip if the month already has a payment (draft or real) for that budget.
function generateRecurringPaymentDrafts(targetMonth) {
  const month = recurringDraftMonth_(targetMonth);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const existingIds = {};
    const paymentsByRequest = {};
    readObjects_(SHEETS.PAYMENTS).forEach(function (payment) {
      existingIds[String(payment.payment_id)] = true;
      const rid = String(payment.request_id || '');
      if (!rid) return;
      (paymentsByRequest[rid] = paymentsByRequest[rid] || []).push(payment);
    });

    const result = {
      target_month: month.key,
      inserted: 0,
      skipped_existing: 0,
      skipped_ineligible: 0,
      skipped_no_recurring_template: 0,
    };

    readObjects_(SHEETS.REQUESTS).forEach(function (request) {
      if (request.request_type !== 'recurring_budget' ||
          request.budget_request_status !== 'approved' ||
          !request.requester_email ||
          !isMonthInRequestValidity_(request, month)) {
        result.skipped_ineligible++;
        return;
      }

      const rid = String(request.request_id);
      const priorPayments = paymentsByRequest[rid] || [];
      const template = latestRecurringPaymentTemplate_(priorPayments);
      if (!template) {
        result.skipped_no_recurring_template++;
        return;
      }

      const paymentId = recurringDraftPaymentId_(request.request_id, month.key);
      if (existingIds[paymentId] || hasPaymentInMonth_(priorPayments, month)) {
        result.skipped_existing++;
        return;
      }

      const now = nowIso_();
      appendObject_(SHEETS.PAYMENTS, {
        payment_id: paymentId,
        request_id: request.request_id,
        payment_no: 'DRAFT-' + month.key.replace('-', '') + '-' + (request.source_no || request.request_id),
        payment_title: template.payment_title || request.request_title || request.request_id,
        requester_name: template.requester_name || request.requester_name || request.requester_email,
        payment_method: template.payment_method,
        vendor_name: template.vendor_name || '',
        scheduled_payment_date: recurringScheduledDate_(template.payment_method, month),
        payment_amount_tax_excluded: '', // The requester or finance fills this before submission.
        currency: template.currency || request.currency || 'JPY',
        memo: '[AUTO] ' + month.key + ' recurring payment draft',
        business_request_no: request.source_no,
        hd_budget_ref: '',
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

// Delete unsubmitted recurring drafts left over from earlier months.
// SAFETY: only ever touches rows whose status_code is exactly 'payment_draft', and only those
// created strictly before the cutoff month start (default = current month ↁEclears last month and
// older). Never touches submitted/approved payments. Run monthly on day 1.
function purgeUnsubmittedDraftPayments(cutoffMonth) {
  const cutoff = recurringDraftMonth_(cutoffMonth || currentMonthKey_());
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = getSheet_(SHEETS.PAYMENTS);
    const headers = getHeaderMap_(sheet);
    const statusCol = headers['status_code'];
    const createdCol = headers['created_at'];
    if (statusCol == null || createdCol == null) throw new Error('db_payments missing status_code/created_at');

    const values = sheet.getDataRange().getValues();
    const rowsToDelete = [];
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][statusCol]) !== 'payment_draft') continue; // ONLY drafts
      const created = parseSheetDate_(values[r][createdCol]);
      if (!created) continue; // unparseable ↁEleave it (safe)
      if (created < cutoff.start) rowsToDelete.push(r + 1);
    }
    for (var i = rowsToDelete.length - 1; i >= 0; i--) {
      sheet.deleteRow(rowsToDelete[i]);
    }
    return { cutoff_month: cutoff.key, deleted: rowsToDelete.length };
  } finally {
    lock.releaseLock();
  }
}

function currentMonthKey_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM');
}

// The template = the most recent prior payment that used a recurring method.
function latestRecurringPaymentTemplate_(payments) {
  const candidates = payments.filter(function (payment) {
    return RECURRING_DRAFT_PAYMENT_METHODS.indexOf(String(payment.payment_method || '').trim()) >= 0;
  });
  if (!candidates.length) return null;
  candidates.sort(function (a, b) { return paymentSortMillis_(b) - paymentSortMillis_(a); });
  return candidates[0];
}

function paymentSortMillis_(payment) {
  const date = parseSheetDate_(payment.scheduled_payment_date) || parseSheetDate_(payment.created_at);
  return date ? date.getTime() : 0;
}

function hasPaymentInMonth_(payments, month) {
  return payments.some(function (payment) {
    const date = parseSheetDate_(payment.scheduled_payment_date) || parseSheetDate_(payment.created_at);
    return date && date >= month.start && date <= month.end;
  });
}

// Credit card billing dates vary, so its draft date is intentionally blank.
function recurringScheduledDate_(method, month) {
  if (String(method || '').trim() === 'クレカ払い') return '';
  const isEndOfNextMonth = String(method || '').trim() === '翌月末払い';
  const date = isEndOfNextMonth
    ? new Date(month.start.getFullYear(), month.start.getMonth() + 2, 0)
    : new Date(month.start.getFullYear(), month.start.getMonth(), 1);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
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
  if (!hasPaymentInMonth_([{ scheduled_payment_date: '2026-07-10' }], july)) {
    throw new Error('Payment inside target month must be detected');
  }
  if (hasPaymentInMonth_([{ scheduled_payment_date: '2026-06-30' }], july)) {
    throw new Error('Payment outside target month must not count');
  }
  if (!latestRecurringPaymentTemplate_([
    { payment_method: 'クレカ払い', scheduled_payment_date: '2026-07-01' },
  ])) {
    throw new Error('Credit card payments must be eligible recurring templates');
  }
  if (latestRecurringPaymentTemplate_([
    { payment_method: '経費精算', scheduled_payment_date: '2026-07-01' },
  ])) {
    throw new Error('Expense reimbursements must not create recurring drafts');
  }
  if (recurringScheduledDate_('クレカ払い', july) !== '') {
    throw new Error('Credit card draft dates must be filled by the requester or finance');
  }
  if (recurringScheduledDate_('振込前払い', july) !== '2026-07-01') {
    throw new Error('Prepaid transfers must schedule to the first of the month');
  }
  if (recurringScheduledDate_('翌月末払い', july) !== '2026-08-31') {
    throw new Error('Next-month-end payments must schedule to the end of the following month');
  }
  return 'ok';
}
