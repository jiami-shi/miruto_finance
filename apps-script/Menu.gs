// Custom spreadsheet menu ("ribbon") so the finance functions can be run with one click.
// NOTE: this menu only appears when the Apps Script project is BOUND to the DB spreadsheet
// (Extensions -> Apps Script from that sheet). If the project is standalone, run the functions
// from the Apps Script editor instead, or bind the project to the DB spreadsheet.
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('財務ワークフロー')
    .addItem('月報を生成 (gen_支払月報)', 'menuGenerateMonthlyReport_')
    .addItem('定常支払の下書きを生成', 'menuGenerateRecurringDrafts_')
    .addItem('未提出の下書きを削除', 'menuPurgeDrafts_')
    .addSeparator()
    .addItem('月次処理を今すぐ実行（削除+下書き生成）', 'menuRunMonthlyRoutine_')
    .addItem('月次自動処理をセットアップ（毎月1日）', 'menuSetupMonthlyTriggers_')
    .addSeparator()
    .addItem('予算を再計算', 'menuRecalculateBudgets_')
    .addToUi();
}

function menuRunMonthlyRoutine_() {
  runAndToast_('月次処理', function () { return monthlyFinanceRoutine(); });
}

function menuSetupMonthlyTriggers_() {
  runAndToast_('月次自動セットアップ', function () { return setupMonthlyTriggers(); });
}

function menuGenerateMonthlyReport_() {
  runAndToast_('月報生成', function () { return generateMonthlyReport(); });
}

function menuGenerateRecurringDrafts_() {
  runAndToast_('定常支払 下書き生成', function () { return generateRecurringPaymentDrafts(); });
}

function menuPurgeDrafts_() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert(
    '未提出の下書きを削除',
    '先月以前の未提出（payment_draft）だけを削除します。提出済み・承認済みは削除しません。実行しますか？',
    ui.ButtonSet.OK_CANCEL
  );
  if (answer !== ui.Button.OK) return;
  runAndToast_('下書き削除', function () { return purgeUnsubmittedDraftPayments(); });
}

function menuRecalculateBudgets_() {
  runAndToast_('予算再計算', function () { recalculateAllBudgets(); return { done: true }; });
}

function runAndToast_(title, fn) {
  try {
    const result = fn();
    SpreadsheetApp.getActiveSpreadsheet().toast(JSON.stringify(result), title + ' 完了', 10);
  } catch (err) {
    SpreadsheetApp.getUi().alert(title + ' でエラー', String(err && err.message || err), SpreadsheetApp.getUi().ButtonSet.OK);
    throw err;
  }
}
