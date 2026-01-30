import { z } from "zod";

export const InvoiceReportRowSchema = z.object({
  date_time: z.string().nullable().optional(),
  original_invoice: z.number(),
  sales_order_no: z.string(),
  customer_name: z.string(),
  amount: z.number(),
  defect_reason: z.string(),
  csr_remarks: z.string().nullable(),
  rejection_reason: z.string().nullable().optional(),
  // Auditor Fields
  approver_fname: z.string().nullable(),
  approver_lname: z.string().nullable(),
  approver_mname: z.string().nullable(),
  approver_dept: z.number().nullable(), 
  isAdmin: z.preprocess(
    (val) => (typeof val === "number" ? val === 1 : val),
    z.boolean().nullable().optional(),
  ),

  // CSR Fields (Added to fix TypeScript errors)
  requester_fname: z.string().nullable().optional(),
  requester_lname: z.string().nullable().optional(),
  requester_dept: z.number().nullable().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export type InvoiceReportRow = z.infer<typeof InvoiceReportRowSchema>;
