// src/app/api/check-register/route.ts

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_BASE = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";

// --- Interfaces ---
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

interface ChartOfAccountRow {
  coa_id: number;
  account_title: string;
}

interface BankRow {
  id: number;
  bank_name: string;
}

interface CustomerRow {
  customer_code: string;
  customer_name: string;
}

interface SalesmanRow {
  id: number;
  salesman_name: string;
}

// --- GET Route ---
export async function GET() {
  if (!API_BASE) {
    return NextResponse.json({ message: "API_BASE missing" }, { status: 500 });
  }

  try {
    const base = API_BASE.replace(/\/$/, "");
    const timestamp = Date.now();

    const fetchOptions: RequestInit = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      cache: "no-store",
    };

    // Fetch all data in parallel
    const [resColl, resDet, resCoa, resBank, resCust, resSales] =
      await Promise.all([
        fetch(`${base}/items/collection?limit=-1&t=${timestamp}`, fetchOptions),
        fetch(
          `${base}/items/collection_details?limit=-1&t=${timestamp}`,
          fetchOptions
        ),
        fetch(
          `${base}/items/chart_of_accounts?limit=-1&t=${timestamp}`,
          fetchOptions
        ),
        fetch(`${base}/items/bank_names?limit=-1&t=${timestamp}`, fetchOptions),
        fetch(`${base}/items/customer?limit=-1&t=${timestamp}`, fetchOptions),
        fetch(`${base}/items/salesman?limit=-1&t=${timestamp}`, fetchOptions),
      ]);

    const collectionsRaw = await resColl.json();
    const detailsRaw = await resDet.json();
    const coaRaw = await resCoa.json();
    const banksRaw = await resBank.json();
    const customersRaw = await resCust.json();
    const salesmenRaw = await resSales.json();

    // Create lookup maps
    const collectionsMap = new Map(
      (collectionsRaw.data as CollectionRow[])
        .filter((c) => c.isCancelled?.data?.[0] === 0)
        .map((c) => [c.id, c])
    );
    const coaMap = new Map(
      (coaRaw.data as ChartOfAccountRow[]).map((coa) => [coa.coa_id, coa])
    );
    const banksMap = new Map(
      (banksRaw.data as BankRow[]).map((b) => [b.id, b.bank_name])
    );
    const customersMap = new Map(
      (customersRaw.data as CustomerRow[]).map((c) => [c.customer_code, c])
    );
    const salesmenMap = new Map(
      (salesmenRaw.data as SalesmanRow[]).map((s) => [s.id, s])
    );

    const checkCOAIds = [2, 96, 98];
    const checksData: any[] = [];

    // Summary counters
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

    (detailsRaw.data as CollectionDetailRow[]).forEach((detail) => {
      const header = collectionsMap.get(detail.collection_id);
      if (!header || !checkCOAIds.includes(detail.type)) return;

      const amount = Number(detail.amount) || 0;

      // Determine logical status
      let status: string;
      if (detail.type === 2) {
        status = "Cleared";
        totals.clrAmt += amount;
        totals.clrCnt++;
      } else if (detail.type === 96) {
        status = "Post Dated Check";
        totals.pdcAmt += amount;
        totals.pdcCnt++;
      } else {
        status = "Dated Check";
        totals.dtAmt += amount;
        totals.dtCnt++;
      }

      totals.amt += amount;
      totals.count++;

      // Define labels for Origin
      let originLabel = "Original";
      if (detail.origin_type === 96) originLabel = "PDC";
      if (detail.origin_type === 98) originLabel = "Dated";

      checksData.push({
        id: detail.id,
        collection_id: detail.collection_id,
        date_received: header.collection_date,
        check_number: detail.check_no || "N/A",
        bank_name: banksMap.get(detail.bank) || "Unknown",
        customer_name:
          customersMap.get(detail.customer_code || "")?.customer_name ||
          "Unknown",
        customer_code: detail.customer_code || "N/A",
        salesman_name:
          salesmenMap.get(header.salesman_id)?.salesman_name || "Unknown",
        salesman_id: header.salesman_id,
        amount: amount,
        check_date: detail.chequeDate,
        status: status,
        coa_title: coaMap.get(detail.type)?.account_title || "Unknown",
        is_cleared: detail.type === 2 ? 1 : 0,

        // CRITICAL: Logic for UI Undo button visibility and PATCH functionality
        origin_type: detail.origin_type, // Used by frontend for 'hasOrigin' check
        previous_type: detail.type === 2 ? detail.origin_type : detail.type, // Sent back in PATCH

        origin_type_label: originLabel,
        payment_type: detail.type,
      });
    });

    checksData.sort(
      (a, b) =>
        new Date(b.date_received).getTime() -
        new Date(a.date_received).getTime()
    );

    return NextResponse.json({
      checks: checksData,
      summary: {
        total_checks: totals.count,
        total_amount: totals.amt,
        cleared_count: totals.clrCnt,
        cleared_amount: totals.clrAmt,
        pending_count: totals.pdcCnt + totals.dtCnt,
        pending_amount: totals.pdcAmt + totals.dtAmt,
        post_dated_count: totals.pdcCnt,
        post_dated_amount: totals.pdcAmt,
        dated_check_count: totals.dtCnt,
        dated_check_amount: totals.dtAmt,
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

// --- PATCH Route ---
export async function PATCH(request: Request) {
  if (!API_BASE)
    return NextResponse.json({ message: "API_BASE missing" }, { status: 500 });

  try {
    const { action, updates } = await request.json();
    const base = API_BASE.replace(/\/$/, "");

    const promises = updates.map(
      async (item: { id: number; previous_type: number }) => {
        let payload = {};

        if (action === "undo") {
          // Move origin_type back to main type, set is_cleared to 0
          payload = {
            is_cleared: 0,
            type: item.previous_type,
            origin_type: null,
          };
        } else {
          // Clear: Move current type to origin_type, set main type to 2 (Cleared)
          payload = {
            is_cleared: 1,
            type: 2,
            origin_type: item.previous_type,
          };
        }

        return fetch(`${base}/items/collection_details/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
        });
      }
    );

    await Promise.all(promises);
    return NextResponse.json({ message: "Success" });
  } catch (err: any) {
    return NextResponse.json(
      { message: "Failed", details: err.message },
      { status: 500 }
    );
  }
}
