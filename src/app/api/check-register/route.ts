import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_BASE = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";

// --- 1. Interfaces ---
interface CollectionRow {
  id: number;
  collection_date: string;
  salesman_id: number;
  isCancelled: { data: number[] };
}
interface CollectionDetailRow {
  id: number;
  collection_id: number;
  type: number;
  bank: number;
  customer_code: string | null;
  check_no: string;
  chequeDate: string;
  amount: number;
  origin_type?: number | null;
}

// --- 2. Pagination Bypass Helper ---
async function fetchAll(url: string) {
  let allItems: any[] = [];
  const limit = 1000;
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const separator = url.includes("?") ? "&" : "?";
    const response = await fetch(
      `${url}${separator}limit=${limit}&offset=${offset}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
        cache: "no-store",
      }
    );
    if (!response.ok) break;
    const result = await response.json();
    const data = result.data || [];
    allItems = [...allItems, ...data];
    if (data.length < limit) hasMore = false;
    else offset += limit;
  }
  return allItems;
}

// --- 3. GET Route ---
export async function GET() {
  if (!API_BASE)
    return NextResponse.json({ message: "API_BASE missing" }, { status: 500 });

  try {
    const base = API_BASE.replace(/\/$/, "");

    const [
      collectionsRaw,
      detailsRaw,
      coaRaw,
      banksRaw,
      customersRaw,
      salesmenRaw,
    ] = await Promise.all([
      fetchAll(`${base}/items/collection`),
      fetchAll(`${base}/items/collection_details`),
      fetchAll(`${base}/items/chart_of_accounts`),
      fetchAll(`${base}/items/bank_names`),
      fetchAll(`${base}/items/customer`),
      fetchAll(`${base}/items/salesman`),
    ]);

    const collectionsMap = new Map();
    (collectionsRaw as CollectionRow[]).forEach((c) => {
      // Only include non-cancelled collections
      if (c.isCancelled?.data?.[0] === 0) collectionsMap.set(c.id, c);
    });

    const coaMap = new Map(coaRaw.map((coa: any) => [coa.coa_id, coa]));
    const banksMap = new Map(banksRaw.map((b: any) => [b.id, b.bank_name]));
    const customersMap = new Map(
      customersRaw.map((c: any) => [c.customer_code, c])
    );
    const salesmenMap = new Map(salesmenRaw.map((s: any) => [s.id, s]));

    const checkCOAIds = [2, 96, 98];
    const checksData: any[] = [];

    // Summary Aggregators
    let totals = {
      amt: 0,
      count: 0,
      clrAmt: 0,
      clrCnt: 0,
      pdcAmt: 0,
      pdcCnt: 0,
      dtAmt: 0,
      dtCnt: 0,
    };

    (detailsRaw as CollectionDetailRow[]).forEach((detail) => {
      const header = collectionsMap.get(detail.collection_id);
      if (!header || !checkCOAIds.includes(detail.type)) return;

      const amount = Number(detail.amount) || 0;
      const customer = detail.customer_code
        ? customersMap.get(detail.customer_code)
        : null;

      // Update specific totals for summary
      if (detail.type === 2) {
        totals.clrAmt += amount;
        totals.clrCnt++;
      } else if (detail.type === 96) {
        totals.pdcAmt += amount;
        totals.pdcCnt++;
      } else if (detail.type === 98) {
        totals.dtAmt += amount;
        totals.dtCnt++;
      }

      totals.amt += amount;
      totals.count++;

      // Use a safe ID to prevent "received undefined" error
      const s_id = header.salesman_id ?? 0;

      checksData.push({
        id: detail.id,
        collection_id: detail.collection_id,
        date_received: header.collection_date,
        check_number: detail.check_no || "N/A",
        bank_name: banksMap.get(detail.bank) || "Unknown",
        customer_name: customer?.customer_name || "Unidentified Customer",
        customer_code: detail.customer_code || "N/A",
        salesman_name: salesmenMap.get(s_id)?.salesman_name || "Unknown",
        salesman_id: s_id, // Fix for Zod/frontend validation
        amount: amount,
        check_date: detail.chequeDate,
        status:
          detail.type === 2
            ? "Cleared"
            : detail.type === 96
            ? "Post Dated Check"
            : "Dated Check",
        coa_title: coaMap.get(detail.type)?.account_title || "Unknown",
        is_cleared: detail.type === 2 ? 1 : 0,
        origin_type_label:
          detail.origin_type === 96
            ? "PDC"
            : detail.origin_type === 98
            ? "Dated"
            : "Original",
        payment_type: detail.type,
      });
    });

    checksData.sort(
      (a, b) =>
        new Date(b.date_received).getTime() -
        new Date(a.date_received).getTime()
    );

    // Response object matches frontend validation schema
    return NextResponse.json({
      checks: checksData,
      summary: {
        total_checks: totals.count,
        total_amount: Number(totals.amt.toFixed(2)),
        cleared_count: totals.clrCnt,
        cleared_amount: Number(totals.clrAmt.toFixed(2)),
        pending_count: totals.pdcCnt + totals.dtCnt,
        pending_amount: Number((totals.pdcAmt + totals.dtAmt).toFixed(2)),
        post_dated_count: totals.pdcCnt,
        post_dated_amount: Number(totals.pdcAmt.toFixed(2)),
        dated_check_count: totals.dtCnt,
        dated_check_amount: Number(totals.dtAmt.toFixed(2)),
      },
      status_distribution: [
        {
          status: "Cleared",
          count: totals.clrCnt,
          amount: totals.clrAmt,
          percentage:
            totals.count > 0 ? (totals.clrCnt / totals.count) * 100 : 0,
        },
        {
          status: "Post Dated Check",
          count: totals.pdcCnt,
          amount: totals.pdcAmt,
          percentage:
            totals.count > 0 ? (totals.pdcCnt / totals.count) * 100 : 0,
        },
        {
          status: "Dated Check",
          count: totals.dtCnt,
          amount: totals.dtAmt,
          percentage:
            totals.count > 0 ? (totals.dtCnt / totals.count) * 100 : 0,
        },
      ],
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: "Error", details: err.message },
      { status: 500 }
    );
  }
}

// --- 4. PATCH Route ---
export async function PATCH(request: Request) {
  try {
    const { action, updates } = await request.json();
    const base = API_BASE.replace(/\/$/, "");
    const promises = updates.map(async (item: any) => {
      const payload =
        action === "undo"
          ? { is_cleared: 0, type: item.previous_type, origin_type: null }
          : { is_cleared: 1, type: 2, origin_type: item.previous_type };
      return fetch(`${base}/items/collection_details/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    });
    await Promise.all(promises);
    return NextResponse.json({ message: "Success" });
  } catch (err: any) {
    return NextResponse.json(
      { message: "Failed", details: err.message },
      { status: 500 }
    );
  }
}
