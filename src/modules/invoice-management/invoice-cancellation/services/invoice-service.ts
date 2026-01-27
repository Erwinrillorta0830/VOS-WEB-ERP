import { SalesInvoice, CancellationRequest } from "../types";
import { InvoiceReportRow } from "../../invoice-summary-report/types";
import {
  DEPARTMENTS,
  toBool,
} from "@/components/shared/(invoice-cancellation)/constants/constants";

const API_BASE = (
  process.env.API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  ""
).replace(/\/+$/, "");

const getHeaders = () => ({
  Authorization: `Bearer ${process.env.DIRECTUS_STATIC_TOKEN}`,
  "Content-Type": "application/json",
});

/**
 * RECURSIVE FETCH ALL
 * Safely fetches all items from a Directus collection by handling pagination.
 */
async function fetchAll<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  let allItems: T[] = [];
  const limit = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const queryObj = {
      ...params,
      limit: String(limit),
      offset: String(offset),
    };
    const query = new URLSearchParams(queryObj).toString();

    const res = await fetch(`${API_BASE}/items/${endpoint}?${query}`, {
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!res.ok) break;

    const result = await res.json();
    const data = result.data || [];
    allItems = [...allItems, ...data];

    if (data.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }
  return allItems;
}

export const InvoiceService = {
  /**
   * Discovery (CSR View)
   * Fetches invoices eligible for cancellation.
   */
  async getInvoicesForCancellation(): Promise<SalesInvoice[]> {
    return await fetchAll<SalesInvoice>("sales_invoice", {
      "filter[transaction_status][_eq]": "For Dispatch",
      "filter[sales_type][_eq]": "1",
      fields:
        "order_id,invoice_id,invoice_no,customer_code,total_amount,transaction_status,sales_type",
    });
  },

  /**
   * Submission (CSR Action)
   */
  async requestCancellation(payload: Partial<CancellationRequest>) {
    const reqRes = await fetch(
      `${API_BASE}/items/invoice_cancellation_requests`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ ...payload, status: "PENDING" }),
      },
    );

    if (!reqRes.ok) {
      const errData = await reqRes.json();
      throw new Error(
        errData.errors?.[0]?.message || "Failed to create request",
      );
    }

    const createdRequest = await reqRes.json();
    const requestId = createdRequest.data.request_id;

    const invRes = await fetch(
      `${API_BASE}/items/sales_invoice/${payload.invoice_id}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ transaction_status: "PENDING CANCEL" }),
      },
    );

    if (!invRes.ok) {
      await fetch(
        `${API_BASE}/items/invoice_cancellation_requests/${requestId}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        },
      );
      throw new Error("Could not lock invoice. Request rolled back.");
    }

    return createdRequest;
  },

  /**
   * Approval Execution
   */
  async approveRequest(
    requestId: number,
    pkInvoiceId: number | string,
    orderNo: string,
    auditorId: number,
  ) {
    const timestamp = new Date().toISOString();
    // 1. Update request status
    const reqUpdate = await fetch(
      `${API_BASE}/items/invoice_cancellation_requests/${requestId}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          status: "APPROVED",
          approved_by: auditorId,
          action_date: new Date().toISOString(),
          date_approved: timestamp,
        }),
      },
    );
    if (!reqUpdate.ok) throw new Error("Failed to update request status");

    // 2. Update invoice status
    const invUpdate = await fetch(
      `${API_BASE}/items/sales_invoice/${pkInvoiceId}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ transaction_status: "CANCELLED" }),
      },
    );
    if (!invUpdate.ok) throw new Error("Failed to set invoice to Cancelled");

    // 3. Update related order
    const orders = await fetchAll<any>("sales_order", {
      "filter[order_no][_eq]": orderNo,
      fields: "order_id",
    });

    if (orders.length > 0) {
      await fetch(`${API_BASE}/items/sales_order/${orders[0].order_id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ order_status: "For Invoicing" }),
      });
    }
  },

  /**
   * Rejection
   */
  async rejectRequest(
    requestId: number,
    pkInvoiceId: number | string,
    auditorId: number,
  ) {
    await fetch(
      `${API_BASE}/items/invoice_cancellation_requests/${requestId}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          status: "REJECTED",
          action_date: new Date().toISOString(),
          approved_by: auditorId,
        }),
      },
    );

    const invRes = await fetch(
      `${API_BASE}/items/sales_invoice/${pkInvoiceId}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ transaction_status: "For Dispatch" }),
      },
    );

    if (!invRes.ok) throw new Error("Could not return invoice to CSR");
  },
  /**
   * AUDIT VIEW (Auditor Dashboard)
   * Fetches all requests and joins User and Invoice details for the Approval Table.
   */
  async getAllRequests(): Promise<any[]> {
    const allRequests = await fetchAll<any>("invoice_cancellation_requests", {
      "filter[status][_in]": "PENDING,APPROVED,REJECTED",
      fields:
        "request_id,invoice_id,reason_code,remarks,sales_order_id,status,date_approved,approved_by,requested_by",
      sort: "-date_approved",
    });

    if (allRequests.length === 0) return [];

    const invoiceIds = [...new Set(allRequests.map((r) => r.invoice_id))];

    const [relevantInvoices, users] = await Promise.all([
      fetchAll<any>("sales_invoice", {
        "filter[invoice_id][_in]": invoiceIds.join(","),
        fields: "invoice_id,invoice_no,customer_code,total_amount",
      }),
      fetchAll<any>("user", {
        fields: "user_id,user_fname,user_mname,user_lname,user_department",
      }),
    ]);

    // Create string-keyed maps for robust ID matching
    const invoiceMap = new Map(
      relevantInvoices.map((inv) => [String(inv.invoice_id), inv]),
    );
    const userMap = new Map(users.map((u) => [String(u.user_id), u]));

    return allRequests.map((req) => {
      const inv = invoiceMap.get(String(req.invoice_id));
      const getCleanId = (val: any) =>
        typeof val === "object" ? val?.id : val;

      // 1. Map Approver
      const auditor = userMap.get(String(getCleanId(req.approved_by)));

      // 2. Map Requester - MATCHES MODAL PAYLOAD (requested_by)
      const requester = userMap.get(String(getCleanId(req.requested_by)));

      return {
        ...req,
        id: req.request_id,
        invoice_no: inv?.invoice_no || "N/A",
        customer_code: inv?.customer_code || "N/A",
        total_amount: inv?.total_amount || 0,
        order_no: req.sales_order_id,
        date_approved: req.date_approved,

        approver_fname: auditor?.user_fname || null,
        approver_mname: auditor?.user_mname || null,
        approver_lname: auditor?.user_lname || null,
        approver_dept: auditor?.user_department || null,

        requester_fname: requester?.user_fname || null,
        requester_lname: requester?.user_lname || null,
        requester_dept: requester?.user_department || null,
      };
    });
  },
  /**
   * REPORT VIEW DATA (Fixed Syntax & Redundancy)
   */
  async getReportViewData(): Promise<InvoiceReportRow[]> {
    const requests = await fetchAll<any>("invoice_cancellation_requests", {
      fields:
        "invoice_id,reason_code,remarks,sales_order_id,status,date_approved,approved_by,created_at,requested_by",
      sort: "-created_at",
    });

    if (requests.length === 0) return [];

    const [invoices, users, customers] = await Promise.all([
      fetchAll<any>("sales_invoice", {
        fields: "invoice_id,customer_code,total_amount",
      }),
      fetchAll<any>("user", {
        fields: "user_id,user_fname,user_mname,user_lname,user_department",
      }),
      fetchAll<any>("customer", { fields: "customer_code,customer_name" }),
    ]);

    // Create maps using String keys for reliability
    const invoiceMap = new Map(
      invoices.map((inv) => [String(inv.invoice_id), inv]),
    );
    const userMap = new Map(users.map((u) => [String(u.user_id), u]));
    const customerMap = new Map(
      customers.map((c) => [String(c.customer_code).trim(), c.customer_name]),
    );

    return requests.map((req) => {
      const inv = invoiceMap.get(String(req.invoice_id));

      // Auditor (Dept 11)
      const auditorId =
        typeof req.approved_by === "object"
          ? req.approved_by?.id
          : req.approved_by;
      const auditor = auditorId ? userMap.get(String(auditorId)) : null;

      // CSR (Dept 7)
      const requesterId =
        typeof req.requested_by === "object"
          ? req.requested_by?.id
          : req.requested_by;
      const requester = requesterId ? userMap.get(String(requesterId)) : null;

      const custName = inv?.customer_code
        ? customerMap.get(String(inv.customer_code).trim())
        : "N/A";

      return {
        date_time: req.created_at || req.date_approved || null,
        original_invoice: Number(req.invoice_id),
        sales_order_no: req.sales_order_id || "N/A",
        customer_name: custName || "N/A",
        amount: Number(inv?.total_amount) || 0,
        defect_reason: req.reason_code || "Uncategorized",
        csr_remarks: req.remarks || null,
        status: req.status as "PENDING" | "APPROVED" | "REJECTED",

        approver_fname: auditor?.user_fname || null,
        approver_mname: auditor?.user_mname || null,
        approver_lname: auditor?.user_lname || null,
        approver_dept: auditor ? Number(auditor.user_department) : null,

        // Fixes 'requester properties do not exist'
        requester_fname: requester?.user_fname || null,
        requester_lname: requester?.user_lname || null,
        requester_dept: requester ? Number(requester.user_department) : null,

        isAdmin:
          auditor?.user_department === DEPARTMENTS.AUDITOR &&
          toBool(auditor?.isAdmin),
      };
    });
  },
};
