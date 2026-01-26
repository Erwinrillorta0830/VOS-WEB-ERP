import { InvoiceRow } from "../types";
import { CancellationRequest } from "@/modules/invoice-management/invoice-cancellation/types";

// We create a type that represents the minimum data needed to process an approval
type ApprovableItem = Pick<InvoiceRow, "id" | "invoice_id"> & {
  order_no?: string;
};

export function mapToApprovalParams(
  request: ApprovableItem | CancellationRequest,
  auditorId: number,
) {
  return {
    requestId: request.id,
    invoiceId: request.invoice_id,
    // Use order_no if it exists (from CancellationRequest),
    // otherwise it remains undefined or you can map it from sales_order_id
    orderNo:
      "order_no" in request
        ? request.order_no
        : (request as any).sales_order_id,
    auditorId,
  };
}
