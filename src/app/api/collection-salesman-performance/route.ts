// src/app/api/collection-salesman-performance/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";

interface CollectionRow {
  id: number;
  salesman_id: number | null;
  collection_date: string;
  totalAmount: number | string | null;
}

interface CollectionDetailRow {
  id: number;
  collection_id: number;
  customer_code: string | null;
}

interface SalesmanRow {
  id: number;
  salesman_name: string;
}

interface CollectionResponse {
  data: CollectionRow[];
}

interface DetailResponse {
  data: CollectionDetailRow[];
}

interface SalesmanResponse {
  data: SalesmanRow[];
}

const parseTotalAmount = (amount: CollectionRow["totalAmount"]): number => {
  if (typeof amount === "number") return amount;
  if (typeof amount === "string" && amount) return Number.parseFloat(amount);
  return 0;
};

export async function GET(req: NextRequest) {
  if (!API_BASE) {
    return NextResponse.json(
      { message: "API_BASE is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("date_from"); // YYYY-MM-DD
    const dateTo = searchParams.get("date_to"); // YYYY-MM-DD
    const salesmanIdParam = searchParams.get("salesman_id");
    const salesmanIdFilter = salesmanIdParam
      ? Number.parseInt(salesmanIdParam, 10)
      : null;

    // Build day-range
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

    const [collectionsRes, detailsRes, salesmenRes] = await Promise.all([
      fetch(`${base}/items/collection?limit=-1`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }),
      fetch(`${base}/items/collection_details?limit=-1`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }),
      fetch(`${base}/items/salesman?limit=-1`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }),
    ]);

    const handleApiError = async (res: Response, name: string) => {
      const json = await res.json();
      console.error(`${name} API error:`, json);
      return NextResponse.json(
        {
          message:
            json?.errors?.[0]?.message ||
            json?.message ||
            `Failed to fetch ${name}.`,
        },
        { status: res.status }
      );
    };

    if (!collectionsRes.ok)
      return handleApiError(collectionsRes, "Collections");
    if (!detailsRes.ok) return handleApiError(detailsRes, "Collection details");
    if (!salesmenRes.ok) return handleApiError(salesmenRes, "Salesman list");

    const [collectionsData, detailsData, salesmenData] = await Promise.all([
      collectionsRes.json() as Promise<CollectionResponse>,
      detailsRes.json() as Promise<DetailResponse>,
      salesmenRes.json() as Promise<SalesmanResponse>,
    ]);

    const collections = collectionsData?.data ?? [];
    const details = detailsData?.data ?? [];
    const salesmen = salesmenData?.data ?? [];

    // Map salesmen for quick lookup
    const salesmanMap = new Map<number, SalesmanRow>();
    for (const s of salesmen) {
      salesmanMap.set(s.id, s);
    }

    // Aggregate
    type Agg = {
      salesman_id: number;
      salesman_name: string;
      totalAmount: number;
      collectionCount: number;
      customers: Set<string>;
    };

    const aggs = new Map<number, Agg>();
    
    const allowedCollectionIds = new Set<number>();

    for (const c of collections) {
      if (!c.salesman_id) continue;

      // filter by salesman
      if (salesmanIdFilter && c.salesman_id !== salesmanIdFilter) continue;

      const cDate = new Date(c.collection_date);
      if (startDate && cDate < startDate) continue;
      if (endDate && cDate > endDate) continue;

      const salesman_id = c.salesman_id;
      const sm = salesmanMap.get(salesman_id);
      const salesman_name = sm?.salesman_name || `Salesman #${salesman_id}`;

      const totalAmountNum =
        typeof c.totalAmount === "number"
          ? c.totalAmount
          : c.totalAmount
          ? Number.parseFloat(c.totalAmount as string)
          : 0;

      let agg = aggs.get(salesman_id);
      if (!agg) {
        agg = {
          salesman_id,
          salesman_name,
          totalAmount: 0,
          collectionCount: 0,
          customers: new Set<string>(),
        };
        aggs.set(salesman_id, agg);
      }

      agg.totalAmount += totalAmountNum;
      agg.collectionCount += 1;
      allowedCollectionIds.add(c.id);
    }

    // Attach customers from collection_details
    for (const d of details) {
      if (!allowedCollectionIds.has(d.collection_id)) continue;
      if (!d.customer_code) continue;

      // Get salesman via header collection
      const header = collections.find((c) => c.id === d.collection_id);
      if (!header || !header.salesman_id) continue;
      if (salesmanIdFilter && header.salesman_id !== salesmanIdFilter) continue;

      const agg = aggs.get(header.salesman_id);
      if (!agg) continue;
      agg.customers.add(String(d.customer_code));
    }

    const aggList = Array.from(aggs.values());

    const totalOverall = aggList.reduce((sum, a) => sum + a.totalAmount, 0);

    const rows = aggList
      .map((a) => {
        const collectionsCount = a.collectionCount;
        const customersCount = a.customers.size;
        const avgAmount =
          collectionsCount > 0 ? a.totalAmount / collectionsCount : 0;
        const percentOfTotal =
          totalOverall > 0 ? (a.totalAmount / totalOverall) * 100 : 0;

        return {
          salesman_id: a.salesman_id,
          salesman_name: a.salesman_name,
          collections_count: collectionsCount,
          customers_count: customersCount,
          total_amount: a.totalAmount,
          average_amount: avgAmount,
          percent_of_total: percentOfTotal,
        };
      })
      .sort((a, b) => b.total_amount - a.total_amount);

    const activeSalesmen = rows.length;
    const avgPerSalesman =
      activeSalesmen > 0 ? totalOverall / activeSalesmen : 0;
    const topPerformer = rows[0]
      ? {
          salesman_id: rows[0].salesman_id,
          salesman_name: rows[0].salesman_name,
          total_amount: rows[0].total_amount,
        }
      : null;

    return NextResponse.json(
      {
        rows,
        summary: {
          activeSalesmen,
          totalAmount: totalOverall,
          avgPerSalesman,
          topPerformer,
        },
        salesmen: salesmen.map((s) => ({
          id: s.id,
          salesman_name: s.salesman_name,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch salesman collection",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
