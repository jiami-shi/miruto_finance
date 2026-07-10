// ponytail: one-time migration from the payment-first model to the
// budget-authorization + payment-execution model (ADR-004). Safe to re-run;
// each step rewrites its target sheet from scratch using SCHEMA as the
// header source of truth.

const SOURCE_CATEGORY_TO_BUDGET_CATEGORY_ = {
  '広告費': 'advertising',
  '広告費用': 'advertising',
  '開発費': 'development',
  '開発費用': 'development',
  '原価': 'cogs',
  '原価費用': 'cogs',
  '管理費': 'management',
  '管理費用': 'management',
  '経費': 'expense',
};

function migrateToBudgetAuthorizationModel() {
  migrateRequests_();
  migratePayments_();
  ensureBudgetCategoriesSheet_();
  ensureApprovalEventsTargetType_();
  seedApprovalRulesV2_();
  Logger.log('Migration complete.');
}

// Rerun-safe subset: use this after migrateToBudgetAuthorizationModel has
// already renamed db_requests headers (migrateRequests_ is NOT rerun-safe
// because it reads pre-migration header names).
function rerunPaymentAndDerivedMigration() {
  migratePayments_();
  ensureBudgetCategoriesSheet_();
  ensureApprovalEventsTargetType_();
  seedApprovalRulesV2_();
  Logger.log('Payment/derived migration complete.');
}

function readRawRows_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { sheet: sheet, headers: values[0] || [], rows: [] };
  const headers = values[0];
  const rows = values.slice(1).filter(function (row) {
    return row.some(function (cell) { return cell !== ''; });
  });
  return { sheet: sheet, headers: headers, rows: rows };
}

function writeSheet_(sheet, headers, objects) {
  sheet.clear();
  const body = objects.map(function (obj) {
    return headers.map(function (header) { return obj[header] !== undefined ? obj[header] : ''; });
  });
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (body.length) sheet.getRange(2, 1, body.length, headers.length).setValues(body);
}

function mapBudgetCategory_(sourceLabel) {
  return SOURCE_CATEGORY_TO_BUDGET_CATEGORY_[sourceLabel] || 'expense';
}

function migrateRequests_() {
  const raw = readRawRows_(SHEETS.REQUESTS);
  const idx = {};
  raw.headers.forEach(function (h, i) { if (h) idx[h] = i; });
  const get = function (row, name) { return idx[name] != null ? row[idx[name]] : ''; };

  const now = nowIso_();
  const objects = raw.rows.map(function (row, position) {
    const sourceLabel = get(row, 'cost_category');
    const isRecurringFixture = position === 1;
    const isIndividualPendingFixture = position === 0;
    const requestType = isRecurringFixture ? 'recurring_budget' : 'individual_budget';

    var status = 'approved';
    var currentRole = '';
    var validFrom = '';
    var validTo = '';

    if (isIndividualPendingFixture) {
      status = 'business_approval_pending';
      currentRole = 'business_approver';
    } else if (isRecurringFixture) {
      status = 'business_approval_pending';
      currentRole = 'business_approver';
      validFrom = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const to = new Date();
      to.setDate(to.getDate() + 90);
      validTo = Utilities.formatDate(to, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }

    return {
      request_id: get(row, 'request_id'),
      source_sheet_name: get(row, 'source_sheet_name'),
      source_no: get(row, 'source_no'),
      request_type: requestType,
      request_title: get(row, 'request_title'),
      requester_email: get(row, 'requester_email'),
      requester_name: get(row, 'requester_name'),
      department: get(row, 'department'),
      product_name: get(row, 'product_name'),
      source_category_label: sourceLabel,
      budget_category_code: mapBudgetCategory_(sourceLabel),
      approved_amount_tax_excluded: get(row, 'requested_amount'),
      currency: get(row, 'currency') || 'JPY',
      valid_from: validFrom,
      valid_to: validTo,
      budget_request_status: status,
      current_role: currentRole,
      hd_budget_ref: '',
      budget_id: get(row, 'budget_id'),
      source_url: get(row, 'source_url'),
      created_at: get(row, 'created_at') || now,
      submitted_at: get(row, 'created_at') || now,
      approved_at: status === 'approved' ? now : '',
      updated_at: now,
    };
  });

  writeSheet_(raw.sheet, SCHEMA.REQUESTS, objects);
}

function migratePayments_() {
  const raw = readRawRows_(SHEETS.PAYMENTS);
  const idx = {};
  raw.headers.forEach(function (h, i) { if (h) idx[h] = i; });
  const get = function (row, name) { return idx[name] != null ? row[idx[name]] : ''; };

  const requestsById = {};
  readObjects_(SHEETS.REQUESTS).forEach(function (r) { requestsById[r.request_id] = r; });

  const now = nowIso_();

  const eligibleIndexes = [];
  raw.rows.forEach(function (row, position) {
    const request = requestsById[get(row, 'request_id')];
    if (request && request.budget_request_status === 'approved') eligibleIndexes.push(position);
  });
  const normalFixtureIndex = eligibleIndexes[0];
  const exceptionFixtureIndex = eligibleIndexes[1];
  var exceptionFixtureUsed = false;

  const objects = raw.rows.map(function (row, position) {
    const requestId = get(row, 'request_id');
    const request = requestsById[requestId];
    const isNormalFixture = position === normalFixtureIndex;
    const isExceptionFixture = position === exceptionFixtureIndex;

    var statusCode = 'payment_approved';
    var currentRole = '';
    var amount = get(row, 'payment_amount_tax_excluded');

    if (request && request.budget_request_status !== 'approved') {
      // Payment cannot execute against a budget request still in authorization.
      statusCode = 'payment_draft';
      currentRole = '';
    } else if (isNormalFixture) {
      statusCode = 'finance_check_pending';
      currentRole = 'finance_reviewer';
    } else if (isExceptionFixture) {
      statusCode = 'finance_check_pending';
      currentRole = 'finance_reviewer';
      const approved = Number(request.approved_amount_tax_excluded) || 0;
      amount = approved + 100000; // force has_payment_exception in AppSheet
      exceptionFixtureUsed = true;
    }

    return {
      payment_id: get(row, 'payment_id'),
      request_id: requestId,
      payment_no: get(row, 'payment_no'),
      payment_title: get(row, 'payment_title'),
      requester_name: get(row, 'requester_name'),
      payment_method: get(row, 'payment_method'),
      vendor_name: get(row, 'vendor_name'),
      source_payment_status: get(row, 'source_payment_status'),
      scheduled_payment_date: get(row, 'scheduled_payment_date'),
      payment_amount_tax_excluded: amount,
      currency: get(row, 'currency') || 'JPY',
      evidence_url: get(row, 'evidence_url'),
      memo: get(row, 'memo'),
      business_request_no: get(row, 'business_request_no'),
      hd_budget_ref: get(row, 'hd_budget_ref'),
      budget_id: get(row, 'budget_id'),
      status_code: statusCode,
      current_role: currentRole,
      action_comment: '',
      last_action_at: '',
      created_at: get(row, 'created_at') || now,
      updated_at: now,
    };
  });

  writeSheet_(raw.sheet, SCHEMA.PAYMENTS, objects);
  if (!exceptionFixtureUsed) {
    Logger.log('Warning: no exception payment fixture was created; check row 2 of db_payments manually.');
  }
}

function ensureBudgetCategoriesSheet_() {
  var sheet = getDb_().getSheetByName(SHEETS.BUDGET_CATEGORIES);
  if (!sheet) sheet = getDb_().insertSheet(SHEETS.BUDGET_CATEGORIES);

  const requests = readObjects_(SHEETS.REQUESTS);
  const budgets = readObjects_(SHEETS.BUDGETS);
  const now = nowIso_();

  const plannedByKey = {};
  requests.forEach(function (r) {
    if (!r.budget_id || !r.budget_category_code) return;
    const key = r.budget_id + '::' + r.budget_category_code;
    plannedByKey[key] = (plannedByKey[key] || 0) + (Number(r.approved_amount_tax_excluded) || 0);
  });

  const categoriesByBudget = {};
  Object.keys(plannedByKey).forEach(function (key) {
    const parts = key.split('::');
    const budgetId = parts[0];
    if (!categoriesByBudget[budgetId]) categoriesByBudget[budgetId] = [];
    categoriesByBudget[budgetId].push(parts[1]);
  });

  const objects = [];
  budgets.forEach(function (budget) {
    const codes = categoriesByBudget[budget.budget_id] || [];
    const allocatedTotal = parseAmount_(budget.allocated_amount);
    const perCategoryAllocated = codes.length ? allocatedTotal / codes.length : allocatedTotal;
    codes.forEach(function (code) {
      const planned = plannedByKey[budget.budget_id + '::' + code] || 0;
      objects.push({
        budget_category_id: 'bcat_' + normalizeKey_(budget.budget_id) + '_' + code,
        budget_id: budget.budget_id,
        budget_category_code: code,
        allocated_amount: perCategoryAllocated,
        planned_amount: planned,
        actual_amount: 0,
        burn_rate: perCategoryAllocated ? planned / perCategoryAllocated : '',
        updated_at: now,
      });
    });
  });

  writeSheet_(sheet, SCHEMA.BUDGET_CATEGORIES, objects);
}

function ensureApprovalEventsTargetType_() {
  const sheet = getSheet_(SHEETS.APPROVAL_EVENTS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];
  if (headers.indexOf('target_type') >= 0) return;

  const raw = readRawRows_(SHEETS.APPROVAL_EVENTS);
  const idx = {};
  raw.headers.forEach(function (h, i) { if (h) idx[h] = i; });
  const get = function (row, name) { return idx[name] != null ? row[idx[name]] : ''; };

  const objects = raw.rows.map(function (row) {
    return {
      approval_event_id: get(row, 'approval_event_id'),
      target_type: get(row, 'payment_id') ? 'payment' : 'budget_request',
      request_id: get(row, 'request_id'),
      payment_id: get(row, 'payment_id'),
      actor_email: get(row, 'actor_email'),
      actor_role: get(row, 'actor_role'),
      action: get(row, 'action'),
      from_status: get(row, 'from_status'),
      to_status: get(row, 'to_status'),
      comment: get(row, 'comment'),
      created_at: get(row, 'created_at'),
    };
  });

  writeSheet_(raw.sheet, SCHEMA.APPROVAL_EVENTS, objects);
}

function seedApprovalRulesV2_() {
  const sheet = getSheet_(SHEETS.APPROVAL_RULES);
  const headers = ['rule_id', 'target_type', 'from_status', 'action', 'required_role', 'to_status', 'next_role', 'is_active'];

  const rules = [
    // budget_request: individual_budget
    ['rule_budget_individual_approve', 'budget_request', 'business_approval_pending', 'approve', 'business_approver', 'approved', '', true],
    ['rule_budget_individual_reject', 'budget_request', 'business_approval_pending', 'reject', 'business_approver', 'rejected', '', true],
    ['rule_budget_individual_cancel', 'budget_request', 'business_approval_pending', 'cancel', 'business_approver', 'cancelled', '', true],
    // budget_request: recurring_budget
    ['rule_budget_recurring_business_approve', 'budget_request', 'business_approval_pending', 'approve_recurring', 'business_approver', 'executive_approval_pending', 'executive_approver', true],
    ['rule_budget_recurring_business_reject', 'budget_request', 'business_approval_pending', 'reject', 'business_approver', 'rejected', '', true],
    ['rule_budget_recurring_executive_approve', 'budget_request', 'executive_approval_pending', 'approve', 'executive_approver', 'approved', '', true],
    ['rule_budget_recurring_executive_reject', 'budget_request', 'executive_approval_pending', 'reject', 'executive_approver', 'rejected', '', true],
    // payment: normal path
    ['rule_payment_finance_approve', 'payment', 'finance_check_pending', 'approve', 'finance_reviewer', 'payment_approved', '', true],
    ['rule_payment_finance_reject', 'payment', 'finance_check_pending', 'reject', 'finance_reviewer', 'payment_rejected', '', true],
    ['rule_payment_finance_cancel', 'payment', 'finance_check_pending', 'cancel', 'finance_reviewer', 'payment_cancelled', '', true],
    ['rule_payment_finance_escalate', 'payment', 'finance_check_pending', 'escalate', 'finance_reviewer', 'exception_business_approval_pending', 'business_approver', true],
    // payment: exception path
    ['rule_payment_exception_business_approve', 'payment', 'exception_business_approval_pending', 'approve', 'business_approver', 'exception_executive_approval_pending', 'executive_approver', true],
    ['rule_payment_exception_business_reject', 'payment', 'exception_business_approval_pending', 'reject', 'business_approver', 'payment_rejected', '', true],
    ['rule_payment_exception_executive_approve', 'payment', 'exception_executive_approval_pending', 'approve', 'executive_approver', 'payment_approved', '', true],
    ['rule_payment_exception_executive_reject', 'payment', 'exception_executive_approval_pending', 'reject', 'executive_approver', 'payment_rejected', '', true],
  ];

  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, rules.length, headers.length).setValues(rules);
}
