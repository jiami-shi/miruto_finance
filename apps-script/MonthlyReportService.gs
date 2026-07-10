function listMonthlyReportReadyPayments() {
  return readObjects_(SHEETS.PAYMENTS).filter(function (payment) {
    return payment.status_code === 'payment_approved';
  });
}

function markMonthlyReportExported(paymentIds) {
  paymentIds.forEach(function (paymentId) {
    updateObjectByKey_(SHEETS.PAYMENTS, 'payment_id', paymentId, {
      updated_at: nowIso_(),
    });
  });
}
