import { CancellationRequest } from "../../invoice-cancellation/types";
import { InvoiceRow } from "../types";

export function mapRequestsToInvoiceRows(
  pendingRequests: CancellationRequest[],
  approvedRequests: CancellationRequest[],
): InvoiceRow[] {
  const pending = pendingRequests.map((req) => ({
    ...req,
    ui_status: "PENDING" as const,
  }));

  const approved = approvedRequests.map((req) => ({
    ...req,
    ui_status: "APPROVED" as const,
  }));

  return [...pending, ...approved].map(
    (req: any): InvoiceRow => ({
      id: req.id,
      invoice_id: req.invoice_id,
      invoice_no: req.invoice_no,
      customer_code: req.customer_code,
      sales_order_id: req.sales_order_id,
      total_amount: req.total_amount,
      reason_code: req.reason_code || "N/A",
      remarks: req.remarks ?? null,
      status: req.ui_status,
      
      
      // Approver Mapping (Resolves)
      approver_fname: req.approver_fname || null,
      approver_mname: req.approver_mname || null,
      approver_lname: req.approver_lname || null,
      approver_dept: req.approver_dept || null,
      
      // Requester Mapping (Resolves)
      requester_fname: req.requester_fname || null,
      requester_lname: req.requester_lname || null,
      requester_dept: req.requester_dept || null,

      // Legacy support for your existing approved_by string
      approved_by: req.approver_fname
        ? `${req.approver_fname} ${req.approver_lname}`.trim()
        : "Pending Approval",
        
      date_approved: req.date_approved || req.updated_at || null,
    }),
  );
}