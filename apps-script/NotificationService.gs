function createSlackJob(paymentId, targetRole, message) {
  appendObject_(SHEETS.NOTIFICATIONS, {
    notification_id: makeId_('ntf'),
    payment_id: paymentId,
    type: 'slack',
    target_role: targetRole,
    target_channel: CONFIG.SLACK_DEFAULT_CHANNEL,
    message: message,
    status: 'pending',
    attempt_count: 0,
    last_error: '',
    created_at: nowIso_(),
    sent_at: '',
  });
}

function processPendingJobs() {
  // ponytail: sequential job scan is fine for PoC volume; use locking/batching if notifications grow.
  readObjects_(SHEETS.NOTIFICATIONS).filter(function (job) {
    return job.status === 'pending';
  }).forEach(function (job) {
    try {
      sendSlackMessage_(job.message);
      updateObjectByKey_(SHEETS.NOTIFICATIONS, 'notification_id', job.notification_id, {
        status: 'sent',
        sent_at: nowIso_(),
        attempt_count: Number(job.attempt_count || 0) + 1,
      });
    } catch (error) {
      updateObjectByKey_(SHEETS.NOTIFICATIONS, 'notification_id', job.notification_id, {
        status: 'failed',
        attempt_count: Number(job.attempt_count || 0) + 1,
        last_error: error.message,
      });
      logError_('NotificationService', 'processPendingJobs', 'error', error.message, job);
    }
  });
}
