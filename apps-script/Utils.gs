function nowIso_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function makeId_(prefix) {
  return prefix + '_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '_' + Utilities.getUuid().slice(0, 8);
}

function normalizeKey_(value) {
  return String(value || '').trim().replace(/[^A-Za-z0-9_-]+/g, '_');
}

function makeBudgetId_(value) {
  const match = String(value || '').match(/No[:：]?(\d+)/);
  return match ? 'bud_No_' + match[1] : 'bud_' + normalizeKey_(value);
}

function parseAmount_(value) {
  if (typeof value === 'number') return value;
  const cleaned = String(value || '').replace(/[¥￥,\s]/g, '');
  return cleaned ? Number(cleaned) : 0;
}
