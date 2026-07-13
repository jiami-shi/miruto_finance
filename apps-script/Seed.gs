/**
 * Seed test-ready data for the acceptance run (TEST_PLAN.md / GO_LIVE_CHECKLIST.md).
 * Idempotent: uses fixed test IDs and upserts, so re-running updates in place (no duplicates).
 * Self-contained: does not depend on existing rows. budget_id is left blank (the exception
 * logic does not use it); category burn-rate (which needs db_budgets) is out of scope here.
 *
 * Creates:
 *   db_requests
 *     req_test_ind_1   individual, business_approval_pending  -> TC-001
 *     req_test_rec_1   recurring,  business_approval_pending  -> TC-002 then TC-003
 *     req_test_pay_1   individual, approved (¥1,000,000)      -> parent for TC-005/006 payments
 *     req_test_rec_pay recurring,  approved, valid 2026-01..06 -> parent for TC-009 payment
 *   db_payments (all finance_check_pending, current_role finance_reviewer)
 *     pay_test_normal_1..5  ¥100,000 each within budget       -> TC-005 (5 normal payments)
 *     pay_test_over_1..2    ¥1,500,000 > remaining            -> TC-006 (残額超過)
 *     pay_test_outofperiod_1 ¥50,000 dated 2026-09-15 (> valid_to) -> TC-009 (期間外)
 */
function seedTestData() {
  var tz = Session.getScriptTimeZone();
  var now = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss");
  var D = function (y, m, d) { return new Date(y, m - 1, d); }; // month is 1-based here
  var drive = 'https://drive.google.com/file/d/1TESTevidenceFILEid0000000000000/view?usp=drive_link';

  var requests = [
    { request_id: 'req_test_ind_1', source_sheet_name: 'test', source_no: 'T-IND-1',
      request_type: 'individual_budget', request_title: '[TEST] 個別予算 事業承認待ち',
      requester_email: 'jiamin_shi@reazon.jp', requester_name: 'テスト申請', department: 'テスト部',
      source_category_label: '消耗品費', budget_category_code: 'expense',
      approved_amount_tax_excluded: 500000, currency: 'JPY',
      budget_request_status: 'business_approval_pending', current_role: 'business_approver',
      created_at: now, submitted_at: now, updated_at: now },

    { request_id: 'req_test_rec_1', source_sheet_name: 'test', source_no: 'T-REC-1',
      request_type: 'recurring_budget', request_title: '[TEST] 定常予算 事業→役員 承認',
      requester_email: 'jiamin_shi@reazon.jp', requester_name: 'テスト申請', department: 'テスト部',
      source_category_label: '広告費', budget_category_code: 'advertising',
      approved_amount_tax_excluded: 2000000, currency: 'JPY',
      valid_from: D(2026, 1, 1), valid_to: D(2026, 12, 31),
      budget_request_status: 'business_approval_pending', current_role: 'business_approver',
      created_at: now, submitted_at: now, updated_at: now },

    { request_id: 'req_test_pay_1', source_sheet_name: 'test', source_no: 'T-PAY-1',
      request_type: 'individual_budget', request_title: '[TEST] 支払用 承認済み予算(個別)',
      requester_email: 'jiamin_shi@reazon.jp', requester_name: 'テスト申請', department: 'テスト部',
      source_category_label: '消耗品費', budget_category_code: 'expense',
      approved_amount_tax_excluded: 1000000, currency: 'JPY',
      budget_request_status: 'approved', current_role: '', approved_at: now,
      created_at: now, submitted_at: now, updated_at: now },

    { request_id: 'req_test_rec_pay', source_sheet_name: 'test', source_no: 'T-REC-PAY',
      request_type: 'recurring_budget', request_title: '[TEST] 支払用 承認済み予算(定常)',
      requester_email: 'jiamin_shi@reazon.jp', requester_name: 'テスト申請', department: 'テスト部',
      source_category_label: '広告費', budget_category_code: 'advertising',
      approved_amount_tax_excluded: 1000000, currency: 'JPY',
      valid_from: D(2026, 1, 1), valid_to: D(2026, 6, 30),
      budget_request_status: 'approved', current_role: '', approved_at: now,
      created_at: now, submitted_at: now, updated_at: now }
  ];

  var payments = [];
  for (var i = 1; i <= 5; i++) {
    payments.push({ payment_id: 'pay_test_normal_' + i, request_id: 'req_test_pay_1',
      payment_no: 'T-N-' + i, payment_title: '[TEST] 通常支払 ' + i, requester_name: 'テスト',
      payment_method: '銀行振込', vendor_name: 'テスト取引先', scheduled_payment_date: D(2026, 7, 20),
      payment_amount_tax_excluded: 100000, currency: 'JPY', evidence_url: (i <= 3 ? drive : ''),
      status_code: 'finance_check_pending', current_role: 'finance_reviewer',
      created_at: now, updated_at: now });
  }
  for (var j = 1; j <= 2; j++) {
    payments.push({ payment_id: 'pay_test_over_' + j, request_id: 'req_test_pay_1',
      payment_no: 'T-O-' + j, payment_title: '[TEST] 超過支払 ' + j, requester_name: 'テスト',
      payment_method: '銀行振込', vendor_name: 'テスト取引先', scheduled_payment_date: D(2026, 7, 20),
      payment_amount_tax_excluded: 1500000, currency: 'JPY', evidence_url: drive,
      status_code: 'finance_check_pending', current_role: 'finance_reviewer',
      created_at: now, updated_at: now });
  }
  payments.push({ payment_id: 'pay_test_outofperiod_1', request_id: 'req_test_rec_pay',
    payment_no: 'T-OOP-1', payment_title: '[TEST] 期間外 定常支払', requester_name: 'テスト',
    payment_method: '銀行振込', vendor_name: 'テスト取引先', scheduled_payment_date: D(2026, 9, 15),
    payment_amount_tax_excluded: 50000, currency: 'JPY', evidence_url: drive,
    status_code: 'finance_check_pending', current_role: 'finance_reviewer',
    created_at: now, updated_at: now });

  requests.forEach(function (r) { upsertObject_('db_requests', 'request_id', r); });
  payments.forEach(function (p) { upsertObject_('db_payments', 'payment_id', p); });

  var msg = 'Seeded/updated ' + requests.length + ' requests and ' + payments.length + ' payments.';
  Logger.log(msg);
  return msg;
}

/**
 * Removes only the rows this seed created (test IDs). Use to clean up after the acceptance run.
 */
function removeTestData() {
  var reqIds = ['req_test_ind_1', 'req_test_rec_1', 'req_test_pay_1', 'req_test_rec_pay'];
  var payIds = ['pay_test_normal_1', 'pay_test_normal_2', 'pay_test_normal_3', 'pay_test_normal_4',
    'pay_test_normal_5', 'pay_test_over_1', 'pay_test_over_2', 'pay_test_outofperiod_1'];
  var removed = deleteRowsByKey_('db_payments', 'payment_id', payIds) +
    deleteRowsByKey_('db_requests', 'request_id', reqIds);
  var msg = 'Removed ' + removed + ' test rows.';
  Logger.log(msg);
  return msg;
}

function deleteRowsByKey_(sheetName, keyField, keyValues) {
  var sheet = getSheet_(sheetName);
  var headers = getHeaderMap_(sheet);
  var keyCol = headers[keyField];
  var values = sheet.getDataRange().getValues();
  var count = 0;
  for (var r = values.length - 1; r >= 1; r--) { // bottom-up so row indexes stay valid
    if (keyValues.indexOf(String(values[r][keyCol])) !== -1) {
      sheet.deleteRow(r + 1);
      count++;
    }
  }
  return count;
}
