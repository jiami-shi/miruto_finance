function approveBudgetRequest(requestId, actorEmail, comment) {
  return applyBudgetRequestTransition(requestId, 'approve', actorEmail, comment || '');
}

function approveRecurringBudgetRequest(requestId, actorEmail, comment) {
  return applyBudgetRequestTransition(requestId, 'approve_recurring', actorEmail, comment || '');
}

function rejectBudgetRequest(requestId, actorEmail, comment) {
  return applyBudgetRequestTransition(requestId, 'reject', actorEmail, comment || '');
}

function cancelBudgetRequest(requestId, actorEmail, comment) {
  return applyBudgetRequestTransition(requestId, 'cancel', actorEmail, comment || '');
}

function approvePayment(paymentId, actorEmail, comment) {
  return applyPaymentTransition(paymentId, 'approve', actorEmail, comment || '');
}

function escalatePayment(paymentId, actorEmail, comment) {
  return applyPaymentTransition(paymentId, 'escalate', actorEmail, comment || '');
}

function rejectPayment(paymentId, actorEmail, comment) {
  return applyPaymentTransition(paymentId, 'reject', actorEmail, comment || '');
}

function cancelPayment(paymentId, actorEmail, comment) {
  return applyPaymentTransition(paymentId, 'cancel', actorEmail, comment || '');
}

function applyBudgetRequestTransition(requestId, action, actorEmail, comment) {
  const request = findObjectByKey_(SHEETS.REQUESTS, 'request_id', requestId);
  if (!request) throw new Error('Budget request not found: ' + requestId);
  const result = applyTransition_({
    targetType: 'budget_request',
    sheetName: SHEETS.REQUESTS,
    keyField: 'request_id',
    keyValue: requestId,
    statusField: 'budget_request_status',
    current: request,
    action: action,
    actorEmail: actorEmail,
    comment: comment,
  });
  if (result.to_status === 'approved') {
    updateObjectByKey_(SHEETS.REQUESTS, 'request_id', requestId, {
      approved_at: nowIso_(),
    });
  }
  return result.to_status;
}

function applyPaymentTransition(paymentId, action, actorEmail, comment) {
  const payment = findObjectByKey_(SHEETS.PAYMENTS, 'payment_id', paymentId);
  if (!payment) throw new Error('Payment not found: ' + paymentId);
  return applyTransition_({
    targetType: 'payment',
    sheetName: SHEETS.PAYMENTS,
    keyField: 'payment_id',
    keyValue: paymentId,
    statusField: 'status_code',
    current: payment,
    action: action,
    actorEmail: actorEmail,
    comment: comment,
  }).to_status;
}

function applyTransition_(args) {
  const user = findObjectByKey_(SHEETS.USERS, 'user_email', args.actorEmail);
  if (!user || String(user.is_active).toLowerCase() !== 'true') {
    throw new Error('Inactive or missing user: ' + args.actorEmail);
  }

  const fromStatus = args.current[args.statusField];
  const rule = readObjects_(SHEETS.APPROVAL_RULES).find(function (candidate) {
    return candidate.target_type === args.targetType &&
      candidate.from_status === fromStatus &&
      candidate.action === args.action &&
      candidate.required_role === user.role_code &&
      String(candidate.is_active).toLowerCase() === 'true';
  });

  if (!rule) {
    logError_('ApprovalService', 'applyTransition_', 'error', 'Invalid transition', {
      target_type: args.targetType,
      key: args.keyValue,
      action: args.action,
      actor_email: args.actorEmail,
      from_status: fromStatus,
      actor_role: user.role_code,
    });
    throw new Error('Invalid transition');
  }

  const now = nowIso_();
  const patch = {
    current_role: rule.next_role,
    updated_at: now,
  };
  patch[args.statusField] = rule.to_status;
  if (args.targetType === 'payment') {
    patch.action_comment = '';
    patch.last_action_at = now;
  }

  updateObjectByKey_(args.sheetName, args.keyField, args.keyValue, patch);

  appendApprovalEvent_({
    approval_event_id: makeId_('ape'),
    target_type: args.targetType,
    request_id: args.targetType === 'budget_request' ? args.keyValue : args.current.request_id,
    payment_id: args.targetType === 'payment' ? args.keyValue : '',
    actor_email: args.actorEmail,
    actor_role: user.role_code,
    action: args.action,
    from_status: fromStatus,
    to_status: rule.to_status,
    comment: args.comment,
    created_at: now,
  });

  if (args.current.budget_id) recalculateBudget(args.current.budget_id);
  if (rule.next_role) createSlackJob(args.targetType, args.keyValue, rule.next_role, buildApprovalMessage_(args, rule));

  return rule;
}

function appendApprovalEvent_(event) {
  appendObject_(SHEETS.APPROVAL_EVENTS, event);
}

function buildApprovalMessage_(args, rule) {
  return [
    'Finance workflow approval needed.',
    'Target: ' + args.targetType,
    'ID: ' + args.keyValue,
    'Next role: ' + rule.next_role,
  ].join('\n');
}
