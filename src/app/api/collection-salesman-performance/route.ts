// src/app/api/collection-salesman-performance/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";

/**
 * Helper to fetch all records across all pages.
 * Essential for reaching the full 61M total.
 */
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
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    if (!response.ok) break;

    const result = await response.json();
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

export async function GET(req: NextRequest) {
  if (!API_BASE) {
    return NextResponse.json(
      { message: "API_BASE is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const salesmanIdParam = searchParams.get("salesman_id");
    const salesmanIdFilter = salesmanIdParam
      ? Number.parseInt(salesmanIdParam, 10)
      : null;

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (dateFrom) {
      startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
    }
    if (dateTo) {
      endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
    }

    const base = API_BASE.replace(/\/$/, "");

    // 1. Fetch ALL data via pagination helper
    const [collections, details, salesmen] = await Promise.all([
      fetchAll(`${base}/items/collection`),
      fetchAll(`${base}/items/collection_details`),
      fetchAll(`${base}/items/salesman`),
    ]);

    const salesmanMap = new Map(salesmen.map((s: any) => [s.id, s]));

    // 2. Filter for VALID (Not Cancelled) Collections
    // This matches the logic in summary-report
    const validCollections = collections.filter(
      (c) => c.isCancelled?.data?.[0] === 0
    );
    const collectionMap = new Map(validCollections.map((c) => [c.id, c]));
    const validCollectionIds = new Set(validCollections.map((c) => c.id));

    // 3. Aggregate from DETAILS
    // Using details ensures we match the Summary Report total exactly
    type Agg = {
      salesman_id: number;
      salesman_name: string;
      totalAmount: number;
      collectionIds: Set<number>;
      customers: Set<string>;
    };

    const aggs = new Map<number, Agg>();
    let grandTotal = 0;

    details.forEach((d: any) => {
      // Must belong to a non-cancelled collection
      if (!validCollectionIds.has(d.collection_id)) return;

      const header = collectionMap.get(d.collection_id);
      if (!header || !header.salesman_id) return;

      // Apply Salesman Filter
      if (salesmanIdFilter && header.salesman_id !== salesmanIdFilter) return;

      // Apply Date Filter
      const cDate = new Date(header.collection_date);
      if (startDate && cDate < startDate) return;
      if (endDate && cDate > endDate) return;

      const salesman_id = header.salesman_id;
      const amount = Number(d.amount) || 0;

      grandTotal += amount;

      let agg = aggs.get(salesman_id);
      if (!agg) {
        agg = {
          salesman_id,
          salesman_name:
            salesmanMap.get(salesman_id)?.salesman_name ||
            `Salesman #${salesman_id}`,
          totalAmount: 0,
          collectionIds: new Set(),
          customers: new Set(),
        };
        aggs.set(salesman_id, agg);
      }

      agg.totalAmount += amount;
      agg.collectionIds.add(d.collection_id);
      if (d.customer_code) agg.customers.add(String(d.customer_code));
    });

    const aggList = Array.from(aggs.values());

    // 4. Build Final Rows
    const rows = aggList
      .map((a) => ({
        salesman_id: a.salesman_id,
        salesman_name: a.salesman_name,
        collections_count: a.collectionIds.size,
        customers_count: a.customers.size,
        total_amount: Number(a.totalAmount.toFixed(2)),
        average_amount:
          a.collectionIds.size > 0 ? a.totalAmount / a.collectionIds.size : 0,
        percent_of_total:
          grandTotal > 0 ? (a.totalAmount / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount);

    return NextResponse.json(
      {
        rows,
        summary: {
          activeSalesmen: rows.length,
          totalAmount: Number(grandTotal.toFixed(2)),
          avgPerSalesman: rows.length > 0 ? grandTotal / rows.length : 0,
          topPerformer: rows[0]
            ? {
                salesman_id: rows[0].salesman_id,
                salesman_name: rows[0].salesman_name,
                total_amount: rows[0].total_amount,
              }
            : null,
        },
        salesmen: salesmen.map((s: any) => ({
          id: s.id,
          salesman_name: s.salesman_name,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch salesman performance",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
