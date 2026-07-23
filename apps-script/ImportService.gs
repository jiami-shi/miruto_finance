const SOURCE_TABS = {
  INDIVIDUAL_REQUESTS: '事業部個別予算申請管理リスト',
  RECURRING_REQUESTS: '事業部定常予算申請管理リスト',
  PAYMENTS: 'imp_支払い管理リスト',
  BUDGET_SUMMARY: 'Sum_予算管理状況',
};

const CATEGORY_CODES = [
  ['development', '開発費用'],
  ['cogs', '原価費用'],
  ['advertising', '広告費用'],
  ['management', '管理費用'],
  ['expense', '経費'],
];

function importBudgetRequests() {
  const existing = indexBy_(readObjects_(SHEETS.REQUESTS), 'request_id');
  const rows = []
    .concat(readSourceObjects_(SOURCE_TABS.INDIVIDUAL_REQUESTS).map(function (row) {
      return mapBudgetRequest_(row, 'individual_budget', existing);
    }))
    .concat(readSourceObjects_(SOURCE_TABS.RECURRING_REQUESTS).map(function (row) {
      return mapBudgetRequest_(row, 'recurring_budget', existing);
    }))
    .filter(function (row) { return row && row.source_no; });

  return upsertMany_(SHEETS.REQUESTS, 'request_id', rows);
}

function importPaymentRequests() {
  const existing = indexBy_(readObjects_(SHEETS.PAYMENTS), 'payment_id');
  const requests = indexBy_(readObjects_(SHEETS.REQUESTS), 'source_no');
  const rows = readSourceObjects_(SOURCE_TABS.PAYMENTS).map(function (row) {
    return mapPaymentRequest_(row, existing, requests);
  }).filter(function (row) { return row && row.payment_no; });

  return upsertMany_(SHEETS.PAYMENTS, 'payment_id', rows);
}

function importBudgetCategories() {
  const budgets = readBudgetSummaryRows_();
  const now = nowIso_();
  const rows = [];

  budgets.forEach(function (budget) {
    CATEGORY_CODES.forEach(function (pair, offset) {
      const code = pair[0];
      const allocated = parseAmount_(budget[5 + offset]);
      const planned = parseAmount_(budget[11 + offset]);
      const actual = parseAmount_(budget[17 + offset]);
      if (!allocated && !planned && !actual) return;
      rows.push({
        budget_category_id: 'bcat_' + normalizeKey_(makeBudgetId_(budget[0])) + '_' + code,
        budget_id: makeBudgetId_(budget[0]),
        budget_category_code: code,
        allocated_amount: allocated,
        planned_amount: planned,
        actual_amount: actual,
        burn_rate: allocated ? planned / allocated : '',
        updated_at: now,
      });
    });
  });

  return upsertMany_(SHEETS.BUDGET_CATEGORIES, 'budget_category_id', rows);
}

function importHdBudgets() {
  const now = nowIso_();
  const rows = readBudgetSummaryRows_().map(function (row) {
    const allocated = parseAmount_(row[4]);
    const pending = parseAmount_(row[10]);
    const used = parseAmount_(row[16]);
    return {
      budget_id: makeBudgetId_(row[0]),
      budget_ref: row[0],
      budget_name: row[3],
      owner_name: '',
      period: '',
      allocated_amount: allocated,
      used_amount: used,
      pending_amount: pending,
      remaining_amount: allocated - used - pending,
      currency: 'JPY',
      updated_at: now,
    };
  }).filter(function (row) { return row.budget_ref; });

  return upsertMany_(SHEETS.BUDGETS, 'budget_id', rows);
}

function importAllSources() {
  return {
    budgets: importHdBudgets(),
    budget_categories: importBudgetCategories(),
    requests: importBudgetRequests(),
    payments: importPaymentRequests(),
  };
}

function mapBudgetRequest_(row, requestType, existing) {
  const sourceNo = first_(row, ['No.', 'No']);
  if (!sourceNo) return null;

  const requestId = 'req_individual_' + normalizeKey_(sourceNo);
  const current = existing[requestId] || {};
  const now = nowIso_();
  const approved = isApprovedSourceRow_(row);
  const status = current.budget_request_status || (approved ? 'approved' : 'business_approval_pending');
  const categoryLabel = first_(row, ['コスト項目', '費目']);

  return {
    request_id: requestId,
    source_sheet_name: requestType === 'recurring_budget' ? SOURCE_TABS.RECURRING_REQUESTS : SOURCE_TABS.INDIVIDUAL_REQUESTS,
    source_no: sourceNo,
    request_type: requestType,
    request_title: first_(row, ['タイトル']),
    comment: first_(row, ['コメント欄', 'コメント']),
    requester_email: current.requester_email || '',
    requester_name: first_(row, ['記入者']),
    department: current.department || '',
    product_name: first_(row, ['プロダクト名', 'プロダクト']),
    source_category_label: categoryLabel,
    budget_category_code: mapBudgetCategory_(categoryLabel),
    approved_amount_tax_excluded: parseAmount_(first_(row, ['暫定コスト', 'コスト見込み（税込み）', '月次コスト見込み（税込み）'])),
    currency: current.currency || 'JPY',
    valid_from: first_(row, ['契約開始日']),
    valid_to: first_(row, ['契約終了予定日']),
    budget_request_status: status,
    current_role: current.current_role || (status === 'approved' ? '' : 'business_approver'),
    budget_id: makeBudgetId_(first_(row, ['執行予算No', '紐づけ予算No'])),
    source_url: first_(row, ['証憑資料', '契約書、利用規約リンク']),
    created_at: current.created_at || first_(row, ['申請日']) || now,
    submitted_at: current.submitted_at || first_(row, ['申請日']) || now,
    approved_at: current.approved_at || (status === 'approved' ? now : ''),
    updated_at: now,
    vendor_name: current.vendor_name || first_(row, ['取引先', '支払先', '仕入れ先']),
  };
}

function mapPaymentRequest_(row, existing, requestsBySourceNo) {
  const paymentNo = first_(row, ['支払いNo']);
  if (!paymentNo) return null;

  const paymentId = 'pay_' + normalizeKey_(paymentNo);
  const current = existing[paymentId] || {};
  const sourceNo = first_(row, ['事業部予算申請No']);
  const request = requestsBySourceNo[sourceNo] || {};
  const status = current.status_code || 'finance_check_pending';
  const now = nowIso_();

  return {
    payment_id: paymentId,
    request_id: current.request_id || request.request_id || ('req_individual_' + normalizeKey_(sourceNo)),
    payment_no: paymentNo,
    payment_title: first_(row, ['タイトル']),
    requester_name: first_(row, ['申請者', '記入者']),
    payment_method: normalizePaymentMethod_(first_(row, ['支払い方法'])),
    vendor_name: first_(row, ['支払先']),
    source_payment_status: first_(row, ['支払いステータス']),
    scheduled_payment_date: first_(row, ['支払日']),
    payment_amount_tax_excluded: parseAmount_(first_(row, ['支払額(税抜）'])),
    currency: current.currency || 'JPY',
    evidence_url: first_(row, ['証憑（バクラクリンク）']),
    memo: first_(row, ['備考']),
    business_request_no: sourceNo,
    hd_budget_ref: first_(row, ['HD予算申請No']),
    budget_id: makeBudgetId_(first_(row, ['HD予算申請No'])),
    status_code: status,
    current_role: current.current_role || (status === 'finance_check_pending' ? 'finance_reviewer' : ''),
    action_comment: current.action_comment || '',
    last_action_at: current.last_action_at || '',
    created_at: current.created_at || first_(row, ['記入日']) || now,
    updated_at: now,
  };
}

function readBudgetSummaryRows_() {
  const sheet = getSourceSheet_(SOURCE_TABS.BUDGET_SUMMARY);
  const values = sheet.getDataRange().getDisplayValues();
  return values.slice(2).filter(function (row) {
    return row[0] && String(row[0]).indexOf('No:') === 0;
  });
}

function upsertMany_(sheetName, keyField, rows) {
  const counts = { inserted: 0, updated: 0 };
  rows.forEach(function (row) {
    counts[upsertObject_(sheetName, keyField, row)]++;
  });
  return counts;
}

function indexBy_(rows, key) {
  return rows.reduce(function (map, row) {
    if (row[key] !== '') map[String(row[key])] = row;
    return map;
  }, {});
}

function first_(row, keys) {
  for (var i = 0; i < keys.length; i++) {
    const value = row[keys[i]];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function isApprovedSourceRow_(row) {
  return first_(row, ['承認フラグ']) === '1' || /承認済/.test(String(first_(row, ['承認ステータス'])));
}

function normalizePaymentMethod_(value) {
  const text = String(value || '').trim();
  if (text === '翌月末支払い') return '翌月末払い';
  if (/クレジット|クレカ/.test(text)) return 'クレカ払い';
  if (/経費|立替/.test(text)) return '経費精算';
  return text;
}
