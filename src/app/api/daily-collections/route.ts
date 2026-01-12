import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";

/**
 * PAGINATION HELPER
 * Ensures we fetch all 15,000+ records to reach the 61M total,
 * bypassing default API safety limits.
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

    // 1. Fetch ALL collections and details using pagination loop
    const [collections, details] = await Promise.all([
      fetchAll(`${base}/items/collection`),
      fetchAll(`${base}/items/collection_details`),
    ]);

    // 2. Pre-filter valid (Not Cancelled) collections
    const validCollections = collections.filter(
      (c) => c.isCancelled?.data?.[0] === 0
    );
    const validCollectionIds = new Set(validCollections.map((c) => c.id));
    const collectionMap = new Map(validCollections.map((c) => [c.id, c]));

    // 3. Aggregate by date using Details as the source of truth
    type DailyAgg = {
      date: string;
      transactions: Set<number>;
      salesmen: Set<number>;
      customers: Set<string>;
      totalAmount: number;
    };

    const dailyMap = new Map<string, DailyAgg>();

    details.forEach((d: any) => {
      // Ensure detail belongs to a valid, non-cancelled collection
      if (!validCollectionIds.has(d.collection_id)) return;

      const header = collectionMap.get(d.collection_id);
      if (!header) return;

      const cDate = new Date(header.collection_date);

      // Apply Date Filters
      if (startDate && cDate < startDate) return;
      if (endDate && cDate > endDate) return;

      // Format date key (YYYY-MM-DD)
      const dateStr = cDate.toISOString().split("T")[0];
      const amount = Number(d.amount) || 0;

      let agg = dailyMap.get(dateStr);
      if (!agg) {
        agg = {
          date: dateStr,
          transactions: new Set<number>(),
          salesmen: new Set<number>(),
          customers: new Set<string>(),
          totalAmount: 0,
        };
        dailyMap.set(dateStr, agg);
      }

      // Aggregate data
      agg.totalAmount += amount;
      agg.transactions.add(d.collection_id);
      if (header.salesman_id) agg.salesmen.add(header.salesman_id);
      if (d.customer_code) agg.customers.add(String(d.customer_code));
    });

    // 4. Convert Map to sorted array and calculate metrics
    const dailyCollections = Array.from(dailyMap.values())
      .map((agg) => {
        const transactionsCount = agg.transactions.size;
        return {
          date: agg.date,
          transactions_count: transactionsCount,
          salesmen_count: agg.salesmen.size,
          customers_count: agg.customers.size,
          total_amount: Number(agg.totalAmount.toFixed(2)),
          average_amount:
            transactionsCount > 0 ? agg.totalAmount / transactionsCount : 0,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // 5. Final Summary Statistics
    const grandTotalAmount = dailyCollections.reduce(
      (sum, day) => sum + day.total_amount,
      0
    );
    const totalTransactions = dailyCollections.reduce(
      (sum, day) => sum + day.transactions_count,
      0
    );
    const totalDays = dailyCollections.length;
    const dailyAverage = totalDays > 0 ? grandTotalAmount / totalDays : 0;

    return NextResponse.json(
      {
        rows: dailyCollections,
        summary: {
          total_days: totalDays,
          total_collections: totalTransactions,
          total_amount: Number(grandTotalAmount.toFixed(2)),
          daily_average: Number(dailyAverage.toFixed(2)),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Daily collections route error:", err);
    return NextResponse.json(
      { message: "Unexpected error while building daily collections report." },
      { status: 500 }
    );
  }
}
