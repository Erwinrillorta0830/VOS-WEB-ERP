import { z } from "zod";

export const InvoiceSchema = z.object({
  id: z.number(),
  invoice_id: z.number(),
  invoice_no: z.string(),
  customer_code: z.string(),
  sales_order_id: z.string(),
  total_amount: z.number(),
  reason_code: z.string(),
  remarks: z.string().nullable(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  date_approved: z.string().nullable().optional(),

  // This MUST be here to fix the mapping error
  approved_by: z.string().nullable().optional(),

  // Requester Fields (Resolves)
  requester_fname: z.string().nullable().optional(),
  requester_lname: z.string().nullable().optional(),
  requester_dept: z.number().nullable().optional(),

  // Approver Fields (Resolves missing mname in)
  approver_fname: z.string().nullable().optional(),
  approver_mname: z.string().nullable().optional(),
  approver_lname: z.string().nullable().optional(),
  approver_dept: z.number().nullable().optional(),
});

export type ApprovalTab = "PENDING" | "APPROVED" | "REJECTED";
export type InvoiceAction = "APPROVE" | "REJECT";
export const ApprovalActionEnum = z.enum(["APPROVE", "REJECT"]);

export type ApprovalAction = z.infer<typeof ApprovalActionEnum>;
export type InvoiceRow = z.infer<typeof InvoiceSchema>;
