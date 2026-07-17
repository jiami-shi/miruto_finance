import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs/milestone2");
const outputPath = path.join(outputDir, "finance_workflow_poc_db.xlsx");

const sheets = {
  db_requests: [
    "request_id",
    "source_sheet_name",
    "source_no",
    "request_type",
    "request_title",
    "comment",
    "requester_email",
    "requester_name",
    "department",
    "product_name",
    "source_category_label",
    "budget_category_code",
    "approved_amount_tax_excluded",
    "currency",
    "valid_from",
    "valid_to",
    "budget_request_status",
    "current_role",
    "hd_budget_ref",
    "budget_id",
    "source_url",
    "created_at",
    "submitted_at",
    "approved_at",
    "updated_at",
  ],
  db_payments: [
    "payment_id",
    "request_id",
    "payment_no",
    "payment_title",
    "requester_name",
    "payment_method",
    "vendor_name",
    "source_payment_status",
    "scheduled_payment_date",
    "payment_amount_tax_excluded",
    "currency",
    "evidence_url",
    "memo",
    "business_request_no",
    "hd_budget_ref",
    "budget_id",
    "status_code",
    "current_role",
    "action_comment",
    "last_action_at",
    "created_at",
    "updated_at",
  ],
  db_budgets: [
    "budget_id",
    "budget_ref",
    "budget_name",
    "owner_name",
    "period",
    "allocated_amount",
    "used_amount",
    "pending_amount",
    "remaining_amount",
    "currency",
    "updated_at",
  ],
  db_budget_categories: [
    "budget_category_id",
    "budget_id",
    "budget_category_code",
    "allocated_amount",
    "planned_amount",
    "actual_amount",
    "burn_rate",
    "updated_at",
  ],
  db_approval_events: [
    "approval_event_id",
    "target_type",
    "request_id",
    "payment_id",
    "actor_email",
    "actor_role",
    "action",
    "from_status",
    "to_status",
    "comment",
    "created_at",
  ],
  db_users: ["user_email", "display_name", "role_code", "role_label_ja", "is_active"],
  db_approval_rules: [
    "rule_id",
    "target_type",
    "from_status",
    "action",
    "required_role",
    "to_status",
    "next_role",
    "is_active",
  ],
  db_evidence_files: [
    "evidence_file_id",
    "payment_id",
    "drive_file_id",
    "drive_url",
    "file_name",
    "mime_type",
    "created_at",
  ],
  db_notifications: [
    "notification_id",
    "target_type",
    "target_id",
    "type",
    "target_role",
    "target_channel",
    "message",
    "status",
    "attempt_count",
    "last_error",
    "created_at",
    "sent_at",
  ],
  db_error_log: [
    "error_id",
    "service_name",
    "function_name",
    "severity",
    "message",
    "context_json",
    "created_at",
  ],
};

const rows = {
  db_users: [
    ["replace-finance@example.com", "経理確認者", "finance_reviewer", "経理確認者", true],
    ["replace-business@example.com", "事業承認者", "business_approver", "事業承認者", true],
    ["replace-executive@example.com", "役員承認者", "executive_approver", "役員承認者", true],
    ["replace-admin@example.com", "管理者", "admin", "管理者", true],
  ],
  db_approval_rules: [
    ["rule_budget_individual_business_approve", "budget_request", "business_approval_pending", "approve", "business_approver", "approved", "", true],
    ["rule_budget_recurring_business_approve", "budget_request", "business_approval_pending", "approve_recurring", "business_approver", "executive_approval_pending", "executive_approver", true],
    ["rule_budget_recurring_executive_approve", "budget_request", "executive_approval_pending", "approve", "executive_approver", "approved", "", true],
    ["rule_payment_finance_approve", "payment", "finance_check_pending", "approve", "finance_reviewer", "payment_approved", "", true],
    ["rule_payment_finance_escalate", "payment", "finance_check_pending", "escalate", "finance_reviewer", "exception_business_approval_pending", "business_approver", true],
    ["rule_payment_exception_business_approve", "payment", "exception_business_approval_pending", "approve", "business_approver", "exception_executive_approval_pending", "executive_approver", true],
    ["rule_payment_exception_executive_approve", "payment", "exception_executive_approval_pending", "approve", "executive_approver", "payment_approved", "", true],
  ],
};

function colLetter(index) {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
}

function writeSheet(workbook, name, headers, bodyRows = []) {
  const sheet = workbook.worksheets.add(name);
  const values = [headers, ...bodyRows];
  const lastCol = colLetter(headers.length - 1);
  const range = sheet.getRange(`A1:${lastCol}${values.length}`);
  range.values = values;
  sheet.getRange(`A1:${lastCol}1`).format = {
    fill: "#1F4E78",
    font: { bold: true, color: "#FFFFFF" },
  };
  sheet.getRange(`A1:${lastCol}${Math.max(values.length, 2)}`).format.borders = {
    preset: "all",
    style: "thin",
    color: "#D9E2F3",
  };
  sheet.freezePanes.freezeRows(1);
  sheet.getUsedRange().format.autofitColumns();
}

await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
for (const [name, headers] of Object.entries(sheets)) {
  writeSheet(workbook, name, headers, rows[name] ?? []);
}

const summary = await workbook.inspect({
  kind: "sheet,table",
  tableMaxRows: 5,
  tableMaxCols: 8,
  maxChars: 8000,
});
await fs.writeFile(path.join(outputDir, "finance_workflow_poc_db.inspect.ndjson"), summary.ndjson);

for (const name of Object.keys(sheets)) {
  const preview = await workbook.render({
    sheetName: name,
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  await fs.writeFile(
    path.join(outputDir, `${name}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);

console.log(outputPath);
