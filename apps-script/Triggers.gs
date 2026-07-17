// Monthly automation: run once at the start of each month.
// Order matters — purge LAST month's unsubmitted drafts first, then create THIS month's drafts.
function monthlyFinanceRoutine() {
  const purged = purgeUnsubmittedDraftPayments();
  const drafted = generateRecurringPaymentDrafts();
  return { purged: purged, drafted: drafted };
}

// Run this ONCE (from the editor or the menu) to install the monthly time-driven trigger.
// It is idempotent — it removes any existing monthlyFinanceRoutine trigger before adding one.
function setupMonthlyTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'monthlyFinanceRoutine') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('monthlyFinanceRoutine')
    .timeBased()
    .onMonthDay(1)
    .atHour(6)
    .create();
  return 'Monthly trigger installed: monthlyFinanceRoutine on day 1 ~06:00 (Asia/Tokyo).';
}
