/**
 * One-shot activation + self-check.
 * Run this from the Apps Script editor to (1) trigger the one-time OAuth consent
 * for the Spreadsheet scope, and (2) confirm the back-end can read the PoC DB and
 * whether the Slack webhook Script Property is set. Read-only and safe to re-run.
 * The secret is never printed — only whether it exists and its length.
 */
function activateAndCheck() {
  const lines = ['=== activateAndCheck ==='];

  try {
    lines.push('Running as: ' + Session.getActiveUser().getEmail());
  } catch (e) {
    lines.push('Running as: (email unavailable: ' + e.message + ')');
  }

  // Opening the DB triggers the Spreadsheet OAuth scope on first run.
  const db = SpreadsheetApp.openById(CONFIG.DB_SPREADSHEET_ID);
  lines.push('DB opened: ' + db.getName());
  const sheetNames = db.getSheets().map(function (s) { return s.getName(); });
  lines.push('Sheets (' + sheetNames.length + '): ' + sheetNames.join(', '));

  ['db_users', 'db_requests', 'db_payments', 'db_approval_events'].forEach(function (name) {
    try {
      lines.push(name + ' rows: ' + readObjects_(name).length);
    } catch (e) {
      lines.push(name + ': ERROR ' + e.message);
    }
  });

  const webhook = PropertiesService.getScriptProperties()
    .getProperty(CONFIG.SLACK_WEBHOOK_URL_PROPERTY);
  lines.push('Slack webhook property (' + CONFIG.SLACK_WEBHOOK_URL_PROPERTY + '): ' +
    (webhook ? 'SET (' + webhook.length + ' chars)' : 'NOT SET'));

  const report = lines.join('\n');
  Logger.log(report);
  return report;
}
