function logError_(serviceName, functionName, severity, message, context) {
  appendObject_(SHEETS.ERROR_LOG, {
    error_id: makeId_('err'),
    service_name: serviceName,
    function_name: functionName,
    severity: severity,
    message: message,
    context_json: JSON.stringify(context || {}),
    created_at: nowIso_(),
  });
}
