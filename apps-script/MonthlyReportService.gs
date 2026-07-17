const MONTHLY_REPORT_PAYMENT_METHODS = ['振込前払い', '翌月末払い'];

const MONTHLY_REPORT_EXPORT_HEADERS = [
  '確定日', '担当ID', '配信開始日', '配信終了日', 'トップクライアント', 'クライアント名',
  'クライアントサイト名', '事業', '配信数', '単位', '入金日', '仕入れ先', '媒体名',
  '媒体名(仕入先)', '空白', '空白', '備 考', '支払日', '仕入単価', '仕入価格',
  'ネット単価', 'ネット価格', '空白', 'グロス単価', 'グロス価格', '社内備考',
  '空白', '空白', '空白', '粗利', '原価項目', '製品種別', '', '支払いNo',
  '予算申請No', '支払いNo', '予算申請No',
];

function listMonthlyReportReadyPayments() {
  return readObjects_(SHEETS.PAYMENTS).filter(isMonthlyReportReadyPayment_);
}

function generateMonthlyReportExport() {
  const payments = listMonthlyReportReadyPayments();
  const sheet = ensureMonthlyReportExportSheet_();
  const existingPaymentNos = getExistingMonthlyReportPaymentNos_(sheet);
  const rows = payments.filter(function (payment) {
    return existingPaymentNos.indexOf(String(payment.payment_no)) === -1;
  }).map(buildMonthlyReportExportRow_);

  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, MONTHLY_REPORT_EXPORT_HEADERS.length).setValues(rows);
  }
  return { inserted: rows.length, skipped: payments.length - rows.length };
}

function generateMonthlyReport() {
  return generateMonthlyReportExport();
}

function isMonthlyReportReadyPayment_(payment) {
  return payment.status_code === 'payment_approved' &&
    MONTHLY_REPORT_PAYMENT_METHODS.indexOf(String(payment.payment_method || '').trim()) >= 0;
}

function buildMonthlyReportExportRow_(payment) {
  const request = payment.request_id ? findObjectByKey_(SHEETS.REQUESTS, 'request_id', payment.request_id) : null;
  const categoryLabel = request ? request.source_category_label : '';
  const categoryCode = request ? request.budget_category_code : '';
  const amount = parseAmount_(payment.payment_amount_tax_excluded);
  const businessRequestNo = payment.business_request_no || (request ? request.source_no : '');
  return [
    todayJp_(), 'YK03', monthStartJp_(payment.scheduled_payment_date), '', '-', '自社',
    'miruto', 'ECロールアップ', 1, '件', payment.scheduled_payment_date || '',
    payment.vendor_name, payment.payment_title, payment.payment_title, '', '',
    '支払いNo：' + payment.payment_no, payment.scheduled_payment_date || '', amount, amount,
    0, 0, '', 0, '', '', '', '', '', '', categoryLabel || categoryCode,
    (request ? request.product_name : '') || '共通', '', payment.payment_no, businessRequestNo,
    payment.payment_no, businessRequestNo,
  ];
}

function ensureMonthlyReportExportSheet_() {
  const db = getDb_();
  var sheet = db.getSheetByName(SHEETS.MONTHLY_REPORT_EXPORT);
  if (!sheet) sheet = db.insertSheet(SHEETS.MONTHLY_REPORT_EXPORT);
  if (sheet.getLastRow() < 2) {
    sheet.clear();
    sheet.getRange(1, 1).setValue('10日ごろ');
    sheet.getRange(2, 1, 1, MONTHLY_REPORT_EXPORT_HEADERS.length).setValues([MONTHLY_REPORT_EXPORT_HEADERS]);
  }
  return sheet;
}

function getExistingMonthlyReportPaymentNos_(sheet) {
  if (sheet.getLastRow() < 3) return [];
  return sheet.getRange(3, 34, sheet.getLastRow() - 2, 1).getValues().map(function (row) {
    return String(row[0] || '');
  }).filter(Boolean);
}

function todayJp_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd');
}

function monthStartJp_(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '';
  return Utilities.formatDate(new Date(date.getFullYear(), date.getMonth(), 1), Session.getScriptTimeZone(), 'yyyy/MM/dd');
}
