function importPaymentRequests(limit) {
  const rows = readSourceObjects_('imp_支払い管理リスト').slice(0, limit || 30);
  const now = nowIso_();

  rows.forEach(function (row) {
    if (!row['支払いNo']) {
      logError_('ImportService', 'importPaymentRequests', 'error', 'Missing payment number', row);
      return;
    }

    const paymentNo = row['支払いNo'];
    const businessRequestNo = row['事業部予算申請No'];
    const requestId = businessRequestNo ? 'req_individual_' + normalizeKey_(businessRequestNo) : 'req_unknown_' + normalizeKey_(paymentNo);
    const paymentId = 'pay_' + normalizeKey_(paymentNo);
    const budgetId = row['HD予算申請No'] ? makeBudgetId_(row['HD予算申請No']) : '';

    upsertObject_(SHEETS.REQUESTS, 'request_id', {
      request_id: requestId,
      source_sheet_name: 'imp_支払い管理リスト',
      source_no: businessRequestNo,
      request_type: 'payment_import',
      request_title: row['タイトル'],
      requester_name: row['申請者'],
      requester_email: '',
      department: '',
      product_name: '',
      cost_category: row['費目'],
      budget_id: budgetId,
      requested_amount: parseAmount_(row['予算承認額(税抜）']),
      currency: 'JPY',
      request_status: 'active',
      source_url: 'https://docs.google.com/spreadsheets/d/' + CONFIG.SOURCE_SPREADSHEET_ID,
      created_at: now,
      updated_at: now,
    });

    upsertObject_(SHEETS.PAYMENTS, 'payment_id', {
      payment_id: paymentId,
      request_id: requestId,
      payment_no: paymentNo,
      payment_title: row['タイトル'],
      requester_name: row['申請者'],
      payment_method: row['支払い方法'],
      vendor_name: row['支払先'],
      source_payment_status: row['支払いステータス'],
      scheduled_payment_date: row['支払日'],
      approved_amount_tax_excluded: parseAmount_(row['予算承認額(税抜）']),
      payment_amount_tax_excluded: parseAmount_(row['支払額(税抜）']),
      currency: 'JPY',
      evidence_url: row['証憑（バクラクリンク）'],
      memo: row['備考'],
      business_request_no: businessRequestNo,
      hd_budget_ref: row['HD予算申請No'],
      budget_id: budgetId,
      cost_category: row['費目'],
      status_code: 'payment_candidate',
      current_role: 'finance_reviewer',
      action_comment: '',
      last_action_at: '',
      created_at: now,
      updated_at: now,
    });
  });
}

function importHdBudgets(limit) {
  const rows = readSourceObjects_('HD取得予算管理リスト').slice(0, limit || 100);
  const now = nowIso_();

  rows.forEach(function (row) {
    if (!row['No']) return;
    const budgetId = makeBudgetId_('No:' + row['No']);
    upsertObject_(SHEETS.BUDGETS, 'budget_id', {
      budget_id: budgetId,
      budget_ref: 'No:' + row['No'] + ':' + row['執行予算名'],
      budget_name: row['執行予算名'],
      owner_name: row['オーナー'],
      period: '',
      allocated_amount: parseAmount_(row['取得額合計']),
      used_amount: 0,
      pending_amount: 0,
      remaining_amount: parseAmount_(row['取得額合計']),
      currency: 'JPY',
      updated_at: now,
    });
  });
}
