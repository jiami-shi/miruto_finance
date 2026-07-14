/**
 * Adds an `evidence_file` header column to db_payments (idempotent).
 * Run once, then in AppSheet: Data → db_payments → Regenerate Structure, and set the new
 * column's type to `File`. This enables direct in-app upload + native PDF/image preview,
 * replacing the fragile Google Drive /preview URL approach. The legacy `evidence_url` column
 * is kept untouched for historical rows.
 */
function addEvidenceFileColumn() {
  var sheet = getSheet_('db_payments');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('evidence_file') !== -1) {
    Logger.log('evidence_file column already exists.');
    return 'exists';
  }
  var col = sheet.getLastColumn() + 1;
  sheet.getRange(1, col).setValue('evidence_file');
  var msg = 'Added evidence_file header at column ' + col + '.';
  Logger.log(msg);
  return msg;
}
