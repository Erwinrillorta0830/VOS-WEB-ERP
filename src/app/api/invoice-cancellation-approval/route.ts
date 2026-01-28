import { InvoiceService } from "@/modules/invoice-management/invoice-cancellation/services/invoice-service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const invoices = await InvoiceService.getAllRequests();

    const pendingCount = invoices.length;

    return NextResponse.json(
      {
        data: invoices,
        count: pendingCount,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("GET Invoice Cancellation Error:", error);
    return NextResponse.json(
      { message: "Failed to fetch invoices", error: error.message },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { action, updates, reason: bulkReason } = body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { message: "No requests provided for update" },
        { status: 400 },
      );
    }

    const results = await Promise.all(
      updates.map(async (item: any) => {
        const { requestId, invoiceId, orderNo, auditorId, rejection_reason } =
          item;

        if (action === "APPROVE") {
          if (!auditorId) {
            throw new Error("Auditor ID is required for approval");
          }

          return await InvoiceService.approveRequest(
            requestId,
            invoiceId,
            orderNo,
            auditorId,
          );
        }

        if (action === "REJECT") {
          const finalReason =
            rejection_reason || bulkReason || "No reason provided";

          return await InvoiceService.rejectRequest(
            requestId,
            invoiceId,
            auditorId,
            finalReason || "No reason provided",
          );
        }

        throw new Error(`Invalid action: ${action}`);
      }),
    );
    return NextResponse.json(
      {
        message: `Successfully processed ${results.length} item(s)`,
        data: results,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("PATCH Approval Action Error:", error);
    return NextResponse.json(
      { message: "Action failed", error: error.message },
      { status: 500 },
    );
  }
}
