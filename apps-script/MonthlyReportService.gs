function listMonthlyReportReadyPayments() {
  return readObjects_(SHEETS.PAYMENTS).filter(function (payment) {
    return payment.status_code === 'executive_approved';
  });
}

function markMonthlyReportExported(paymentIds) {
  paymentIds.forEach(function (paymentId) {
    updateObjectByKey_(SHEETS.PAYMENTS, 'payment_id', paymentId, {
      status_code: 'monthly_report_exported',
      current_role: '',
      updated_at: nowIso_(),
    });
  });
}
