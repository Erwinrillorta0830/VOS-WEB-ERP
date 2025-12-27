import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";

interface CollectionRow {
  id: number;
  salesman_id: number | null;
  collected_by: number | null;
  collection_date: string;
  totalAmount: number | string | null;
  isCancelled: { type: string; data: number[] } | null;
  isPosted: { type: string; data: number[] } | null;
}

interface CollectionDetailRow {
  id: number;
  collection_id: number;
  customer_code: string | null;
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
    const dateFrom = searchParams.get("date_from"); // YYYY-MM-DD
    const dateTo = searchParams.get("date_to"); // YYYY-MM-DD

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

    // Fetch data from both endpoints
    const [collectionsRes, detailsRes] = await Promise.all([
      fetch(`${base}/items/collection?limit=-1`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }),
      fetch(`${base}/items/collection_details?limit=-1`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }),
    ]);

    const [collectionsJson, detailsJson] = await Promise.all([
      collectionsRes.json(),
      detailsRes.json(),
    ]);

    if (!collectionsRes.ok) {
      console.error("Collections API error:", collectionsJson);
      return NextResponse.json(
        {
          message:
            collectionsJson?.errors?.[0]?.message ||
            collectionsJson?.message ||
            "Failed to fetch collections.",
        },
        { status: collectionsRes.status }
      );
    }

    if (!detailsRes.ok) {
      console.error("Collection details API error:", detailsJson);
      return NextResponse.json(
        {
          message:
            detailsJson?.errors?.[0]?.message ||
            detailsJson?.message ||
            "Failed to fetch collection details.",
        },
        { status: detailsRes.status }
      );
    }

    const collections = (collectionsJson?.data ?? []) as CollectionRow[];
    const details = (detailsJson?.data ?? []) as CollectionDetailRow[];

    // Aggregate by date
    type DailyAgg = {
      date: string;
      transactions: Set<number>;
      salesmen: Set<number>;
      customers: Set<string | number>;
      totalAmount: number;
    };

    const dailyMap = new Map<string, DailyAgg>();
    const allowedCollectionIds = new Set<number>();

    // Process collections
    for (const c of collections) {
      const cDate = new Date(c.collection_date);

      // Apply date filters
      if (startDate && cDate < startDate) continue;
      if (endDate && cDate > endDate) continue;

      // Extract date in YYYY-MM-DD format
      const dateStr = cDate.toISOString().split("T")[0];

      const totalAmountNum =
        typeof c.totalAmount === "number"
          ? c.totalAmount
          : c.totalAmount
          ? Number.parseFloat(c.totalAmount as string)
          : 0;

      let agg = dailyMap.get(dateStr);
      if (!agg) {
        agg = {
          date: dateStr,
          transactions: new Set<number>(),
          salesmen: new Set<number>(),
          customers: new Set<number>(),
          totalAmount: 0,
        };
        dailyMap.set(dateStr, agg);
      }

      agg.transactions.add(c.id);
      if (c.salesman_id) {
        agg.salesmen.add(c.salesman_id);
      }
      if (c.collected_by) {
        agg.customers.add(c.collected_by);
      }
      agg.totalAmount += totalAmountNum;
      allowedCollectionIds.add(c.id);
    }

    // Process collection details for additional customer tracking
    for (const d of details) {
      if (!allowedCollectionIds.has(d.collection_id)) continue;
      if (!d.customer_code) continue;

      const header = collections.find((c) => c.id === d.collection_id);
      if (!header) continue;

      const cDate = new Date(header.collection_date);
      const dateStr = cDate.toISOString().split("T")[0];

      const agg = dailyMap.get(dateStr);
      if (agg) {
        agg.customers.add(String(d.customer_code));
      }
    }

    // Convert to array and calculate metrics
    const dailyCollections = Array.from(dailyMap.values())
      .map((agg) => {
        const transactionsCount = agg.transactions.size;
        const salesmenCount = agg.salesmen.size;
        const customersCount = agg.customers.size;
        const totalAmount = agg.totalAmount;
        const averageAmount =
          transactionsCount > 0 ? totalAmount / transactionsCount : 0;

        return {
          date: agg.date,
          transactions_count: transactionsCount,
          salesmen_count: salesmenCount,
          customers_count: customersCount,
          total_amount: totalAmount,
          average_amount: averageAmount,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate summary statistics
    const totalTransactions = dailyCollections.reduce(
      (sum, day) => sum + day.transactions_count,
      0
    );
    const totalAmount = dailyCollections.reduce(
      (sum, day) => sum + day.total_amount,
      0
    );

    // Calculate total days as date range
    const totalDays =
      dailyCollections.length > 0
        ? Math.ceil(
            (new Date(
              dailyCollections[dailyCollections.length - 1].date
            ).getTime() -
              new Date(dailyCollections[0].date).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        : 0;

    const dailyAverage = totalDays > 0 ? totalAmount / totalDays : 0;

    return NextResponse.json(
      {
        rows: dailyCollections,
        summary: {
          total_days: totalDays,
          total_collections: totalTransactions,
          total_amount: totalAmount,
          daily_average: dailyAverage,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Daily collections route error:", err);
    return NextResponse.json(
      {
        message: "Unexpected error while building daily collections report.",
      },
      { status: 500 }
    );
  }
}
