function approvePayment(paymentId, actorEmail, comment) {
  return applyTransition(paymentId, 'approve', actorEmail, comment || '');
}

function returnPayment(paymentId, actorEmail, comment) {
  return applyTransition(paymentId, 'return', actorEmail, comment || '');
}

function rejectPayment(paymentId, actorEmail, comment) {
  return applyTransition(paymentId, 'reject', actorEmail, comment || '');
}

function applyTransition(paymentId, action, actorEmail, comment) {
  const payment = findObjectByKey_(SHEETS.PAYMENTS, 'payment_id', paymentId);
  if (!payment) throw new Error('Payment not found: ' + paymentId);

  const user = findObjectByKey_(SHEETS.USERS, 'user_email', actorEmail);
  if (!user || String(user.is_active).toLowerCase() !== 'true') {
    throw new Error('Inactive or missing user: ' + actorEmail);
  }

  const rule = readObjects_(SHEETS.APPROVAL_RULES).find(function (candidate) {
    return candidate.from_status === payment.status_code &&
      candidate.action === action &&
      candidate.required_role === user.role_code &&
      String(candidate.is_active).toLowerCase() === 'true';
  });

  if (!rule) {
    logError_('ApprovalService', 'applyTransition', 'error', 'Invalid transition', {
      payment_id: paymentId,
      action: action,
      actor_email: actorEmail,
      from_status: payment.status_code,
      actor_role: user.role_code,
    });
    throw new Error('Invalid transition');
  }

  const now = nowIso_();
  updateObjectByKey_(SHEETS.PAYMENTS, 'payment_id', paymentId, {
    status_code: rule.to_status,
    current_role: rule.next_role,
    action_comment: '',
    last_action_at: now,
    updated_at: now,
  });

  appendApprovalEvent_({
    approval_event_id: makeId_('ape'),
    payment_id: paymentId,
    request_id: payment.request_id,
    actor_email: actorEmail,
    actor_role: user.role_code,
    action: action,
    from_status: payment.status_code,
    to_status: rule.to_status,
    comment: comment,
    created_at: now,
  });

  if (payment.budget_id) recalculateBudget(payment.budget_id);
  if (rule.next_role) createSlackJob(paymentId, rule.next_role, buildApprovalMessage_(payment, rule));

  return rule.to_status;
}

function appendApprovalEvent_(event) {
  appendObject_(SHEETS.APPROVAL_EVENTS, event);
}

function buildApprovalMessage_(payment, rule) {
  return [
    '支払承認の確認をお願いします。',
    '支払いNo: ' + payment.payment_no,
    'タイトル: ' + payment.payment_title,
    '次のロール: ' + rule.next_role,
  ].join('\n');
}
