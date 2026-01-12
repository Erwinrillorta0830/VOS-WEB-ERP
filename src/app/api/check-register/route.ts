// src/app/api/check-register/route.ts

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_BASE = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";

interface CollectionRow {
  id: number;
  docNo: string;
  collection_receipt_no: string;
  collection_date: string;
  date_encoded: string;
  salesman_id: number;
  collected_by: number;
  encoder_id: number;
  remarks: string;
  isPosted: { type: string; data: number[] };
  isCancelled: { type: string; data: number[] };
  totalAmount: number;
}

interface CollectionDetailRow {
  id: number;
  collection_id: number;
  type: number;
  finding: number | null;
  payment_method: number | null;
  bank: number;
  encoder_id: number;
  customer_code: string | null;
  check_no: string;
  chequeDate: string;
  amount: number;
  remarks: string;
  balance_type_id: number;
  invoice_id: number | null;
  is_cleared?: number;
  origin_type?: number | null;
}

interface ChartOfAccountRow {
  coa_id: number;
  gl_code: string;
  account_title: string;
  bsis_code: number;
  account_type: number;
  balance_type: number;
  description: string | null;
  memo_type: number;
  date_added: string;
  added_by: number;
  isPayment: { type: string; data: number[] };
  is_payment: number | null;
}

interface BankRow {
  id: number;
  bank_name: string;
}

interface CustomerRow {
  customer_code: string;
  customer_name: string;
  [key: string]: any;
}

interface SalesmanRow {
  id: number;
  employee_id: number;
  salesman_code: string;
  salesman_name: string;
  [key: string]: any;
}

export async function GET() {
  if (!API_BASE) {
    return NextResponse.json(
      { message: "API_BASE is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const base = API_BASE.replace(/\/$/, "");
    const timestamp = Date.now();

    // 3. Define fetch options that strictly forbid caching
    const fetchOptions: RequestInit = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
      cache: "no-store", // This is critical for Next.js internal fetch cache
    };
    // 1. Fetch all required data sources
    const [
      collectionsRes,
      detailsRes,
      coaRes,
      banksRes,
      customersRes,
      salesmenRes,
    ] = await Promise.all([
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

    if (
      !collectionsRes.ok ||
      !detailsRes.ok ||
      !coaRes.ok ||
      !banksRes.ok ||
      !customersRes.ok ||
      !salesmenRes.ok
    ) {
      throw new Error("Failed to fetch data from one or more endpoints");
    }

    const [
      collectionsJson,
      detailsJson,
      coaJson,
      banksJson,
      customersJson,
      salesmenJson,
    ] = await Promise.all([
      collectionsRes.json(),
      detailsRes.json(),
      coaRes.json(),
      banksRes.json(),
      customersRes.json(),
      salesmenRes.json(),
    ]);

    const collections = (collectionsJson?.data ?? []) as CollectionRow[];
    const details = (detailsJson?.data ?? []) as CollectionDetailRow[];
    const chartOfAccounts = (coaJson?.data ?? []) as ChartOfAccountRow[];
    const banks = (banksJson?.data ?? []) as BankRow[];
    const customers = (customersJson?.data ?? []) as CustomerRow[];
    const salesmen = (salesmenJson?.data ?? []) as SalesmanRow[];

    // 2. Filter valid collections (not cancelled)
    const validCollections = collections.filter(
      (c) => c.isCancelled?.data?.[0] === 0
    );

    const validCollectionIds = new Set(validCollections.map((c) => c.id));

    // 3. Create lookup maps
    const collectionsMap = new Map(validCollections.map((c) => [c.id, c]));
    const coaMap = new Map(chartOfAccounts.map((coa) => [coa.coa_id, coa]));
    const banksMap = new Map(banks.map((b) => [b.id, b.bank_name]));
    const customersMap = new Map(customers.map((c) => [c.customer_code, c]));
    const salesmenMap = new Map(salesmen.map((s) => [s.id, s]));

    // 4. Filter check payments only (COA IDs: 2 = Cash on Bank, 96 = Post Dated Check, 98 = Dated Check)
    const checkCOAIds = [2, 96, 98];
    const checkDetails = details.filter(
      (d) =>
        validCollectionIds.has(d.collection_id) && checkCOAIds.includes(d.type)
    );

    // 5. Aggregate check data
    const checksData: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalAmount = 0;
    let clearedAmount = 0;
    let pendingAmount = 0;
    let postDatedAmount = 0;
    let datedCheckAmount = 0;

    let totalCount = 0;
    let clearedCount = 0;
    let pendingCount = 0;
    let postDatedCount = 0;
    let datedCheckCount = 0;

    checkDetails.forEach((detail) => {
      const collection = collectionsMap.get(detail.collection_id);
      if (!collection) return;

      const coa = coaMap.get(detail.type);
      const bank = banksMap.get(detail.bank);
      const customer = customersMap.get(detail.customer_code || "");
      const salesman = salesmenMap.get(collection.salesman_id);

      // Determine status based on type

      let status: "Cleared" | "Pending" | "Post Dated Check" | "Dated Check";

      if (detail.type === 2) {
        status = "Cleared";
        clearedAmount += detail.amount;
        clearedCount++;
      } else if (detail.type === 96) {
        status = "Post Dated Check";
        pendingAmount += detail.amount;
        pendingCount++;
        postDatedCount++;
        postDatedAmount += detail.amount;
      } else if (detail.type === 98) {
        status = "Dated Check";
        pendingAmount += detail.amount;
        pendingCount++;
        datedCheckCount++;
        datedCheckAmount += detail.amount;
      } else {
        status = "Pending";
      }

      let originTypeLabel = "Original";
      if (detail.origin_type === 96) originTypeLabel = "PDC";
      if (detail.origin_type === 98) originTypeLabel = "Dated";

      totalAmount += detail.amount;
      totalCount++;

      checksData.push({
        id: detail.id,
        collection_id: detail.collection_id,
        date_received: collection.collection_date,
        check_number: detail.check_no || "N/A",
        bank_name: bank || "Unknown",
        customer_name: customer?.customer_name || "Unknown",
        customer_code: detail.customer_code || "N/A",
        salesman_name: salesman?.salesman_name || "Unknown",
        salesman_id: collection.salesman_id,
        amount: detail.amount,
        check_date: detail.chequeDate,
        status: status,
        coa_title: coa?.account_title || "Unknown",
        is_cleared: detail.type === 2 ? 1 : 0,
        origin_type: detail.origin_type,
        original_type_raw: detail.origin_type,
        origin_type_label: originTypeLabel,
        payment_type: detail.type,
      });
    });

    // 6. Sort by date received (most recent first)
    checksData.sort(
      (a, b) =>
        new Date(b.date_received).getTime() -
        new Date(a.date_received).getTime()
    );

    // 7. Calculate status distribution for pie chart
    // Note: For the chart, we want to show separate slices for each check type
    // So we don't include a "Pending" category since Post Dated and Dated are the pending types
    const statusDistribution = [
      {
        status: "Cleared",
        count: clearedCount,
        amount: clearedAmount,
        percentage: totalCount > 0 ? (clearedCount / totalCount) * 100 : 0,
      },
      {
        status: "Post Dated Check",
        count: postDatedCount,
        amount: postDatedAmount,
        percentage: totalCount > 0 ? (postDatedCount / totalCount) * 100 : 0,
      },
      {
        status: "Dated Check",
        count: datedCheckCount,
        amount: datedCheckAmount,
        percentage: totalCount > 0 ? (datedCheckCount / totalCount) * 100 : 0,
      },
    ];

    const finalResult = {
      checks: checksData,
      summary: {
        total_checks: totalCount,
        total_amount: totalAmount,
        cleared_count: clearedCount,
        cleared_amount: clearedAmount,
        pending_count: pendingCount,
        pending_amount: pendingAmount,
        post_dated_count: postDatedCount,
        post_dated_amount: postDatedAmount,
        dated_check_count: datedCheckCount,
        dated_check_amount: datedCheckAmount,
      },
      status_distribution: statusDistribution,
    };
    const response = NextResponse.json(finalResult, { status: 200 });
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");

    return response;
    // return NextResponse.json(
    //   {
    //     checks: checksData,
    //     summary: {
    //       total_checks: totalCount,
    //       total_amount: totalAmount,
    //       cleared_count: clearedCount,
    //       cleared_amount: clearedAmount,
    //       pending_count: pendingCount,
    //       pending_amount: pendingAmount,
    //       post_dated_count: postDatedCount,
    //       post_dated_amount: postDatedAmount,
    //       dated_check_count: datedCheckCount,
    //       dated_check_amount: datedCheckAmount,
    //     },
    //     status_distribution: statusDistribution,
    //   },
    //   { status: 200 }
    // );
  } catch (err: any) {
    console.error("Check register route error:", err);
    return NextResponse.json(
      {
        message: "Unexpected error while fetching check register data.",
        details: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
export async function PATCH(request: Request) {
  if (!API_BASE)
    return NextResponse.json({ message: "API_BASE missing" }, { status: 500 });

  try {
    const body = await request.json();
    const { action, updates } = body;
    // const { check_ids, action, origin_type_map } = body;

    const base = API_BASE.replace(/\/$/, "");

    const updatePromises = updates.map(
      async (item: { id: number; previous_type: number }) => {
        let payload = {};

        if (action === "undo") {
          // We take the backup (96 or 98) and put it back as the main type
          payload = {
            is_cleared: 0,
            type: item.previous_type,
            origin_type: null,
          };
        } else {
          // We move the current type (96 or 98) into origin_type and set main type to 2
          payload = {
            is_cleared: 1,
            type: 2,
            origin_type: item.previous_type,
          };
        }

        const response = await fetch(
          `${base}/items/collection_details/${item.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            cache: "no-store",
          }
        );

        if (!response.ok) throw new Error(`Failed to update ID ${item.id}`);
        return response.json();
      }
    );

    await Promise.all(updatePromises);
    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { message: "Failed", details: err?.message },
      { status: 500 }
    );
  }
}
