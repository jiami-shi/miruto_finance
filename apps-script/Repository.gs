function getDb_() {
  return SpreadsheetApp.openById(CONFIG.DB_SPREADSHEET_ID);
}

function getSheet_(name) {
  const sheet = getDb_().getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet: ' + name);
  return sheet;
}

function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.reduce(function (map, header, index) {
    if (header) map[String(header)] = index;
    return map;
  }, {});
}

function readObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter(function (row) {
    return row.some(function (cell) { return cell !== ''; });
  }).map(function (row) {
    return headers.reduce(function (obj, header, index) {
      if (header) obj[header] = row[index];
      return obj;
    }, {});
  });
}

function findObjectByKey_(sheetName, keyField, keyValue) {
  return readObjects_(sheetName).find(function (row) {
    return String(row[keyField]) === String(keyValue);
  }) || null;
}

function appendObject_(sheetName, object) {
  const sheet = getSheet_(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(function (header) { return object[header] ?? ''; }));
}

function upsertObject_(sheetName, keyField, object) {
  if (findObjectByKey_(sheetName, keyField, object[keyField])) {
    updateObjectByKey_(sheetName, keyField, object[keyField], object);
    return 'updated';
  }
  appendObject_(sheetName, object);
  return 'inserted';
}

function updateObjectByKey_(sheetName, keyField, keyValue, patch) {
  const sheet = getSheet_(sheetName);
  const headers = getHeaderMap_(sheet);
  const keyCol = headers[keyField];
  if (keyCol == null) throw new Error('Missing key field: ' + keyField);

  const values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][keyCol]) === String(keyValue)) {
      Object.keys(patch).forEach(function (field) {
        if (headers[field] == null) throw new Error('Missing field: ' + field);
        sheet.getRange(r + 1, headers[field] + 1).setValue(patch[field]);
      });
      return;
    }
  }
  throw new Error('Row not found: ' + keyField + '=' + keyValue);
}

function getSourceSheet_(name) {
  const sheet = SpreadsheetApp.openById(CONFIG.SOURCE_SPREADSHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error('Missing source sheet: ' + name);
  return sheet;
}

function readSourceObjects_(sheetName) {
  const sheet = getSourceSheet_(sheetName);
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter(function (row) {
    return row.some(function (cell) { return cell !== ''; });
  }).map(function (row) {
    return headers.reduce(function (obj, header, index) {
      if (header) obj[String(header).replace(/\s+/g, '')] = row[index];
      return obj;
    }, {});
  });
}
