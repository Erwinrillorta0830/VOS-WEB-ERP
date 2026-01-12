import { NextResponse } from "next/server";

// Fallback mapping for records where payment_method is 0 or null
const TYPE_TO_METHOD_MAP: Record<number, { key: string; name: string }> = {
  1: { key: "cash", name: "Cash" },
  2: { key: "bank_transfer", name: "Bank Transfer" },
  96: { key: "check", name: "Check" },
  98: { key: "check", name: "Check" },
};

/**
 * Helper to fetch all records across all pages using pagination.
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

export async function GET() {
  const API_BASE =
    process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";

  if (!API_BASE) {
    return NextResponse.json(
      { message: "API_BASE is not configured on the server." },
      { status: 500 }
    );
  }

  const base = API_BASE.replace(/\/$/, "");

  try {
    // 1. Parallel Data Fetching
    const [collections, details, customers, salesmen, methods] =
      await Promise.all([
        fetchAll(`${base}/items/collection`),
        fetchAll(`${base}/items/collection_details`),
        fetchAll(`${base}/items/customer`),
        fetchAll(`${base}/items/salesman`),
        fetchAll(`${base}/items/payment_methods`),
      ]);

    // 2. Setup Lookup Maps
    const validCollections = collections.filter(
      (c) => c.isCancelled?.data?.[0] === 0
    );
    const validCollectionIds = new Set(validCollections.map((c) => c.id));
    const customerMap = new Map(customers.map((c) => [c.customer_code, c]));
    const salesmanMap = new Map(salesmen.map((s) => [s.id, s]));
    const methodsMap = new Map(
      methods.map((m) => [m.method_id, m.method_name])
    );
    const collectionHeaderMap = new Map(validCollections.map((c) => [c.id, c]));

    // 3. Group Details by Collection ID for "Mixed" Detection
    const collectionGroups = new Map<number, any[]>();
    details.forEach((d: any) => {
      if (!validCollectionIds.has(d.collection_id)) return;
      if (!collectionGroups.has(d.collection_id)) {
        collectionGroups.set(d.collection_id, []);
      }
      collectionGroups.get(d.collection_id)?.push(d);
    });

    // 4. Aggregation Containers
    const dailyTrendMap = new Map<string, number>();
    const paymentMethodMap = new Map<
      string,
      { amount: number; count: number }
    >();
    const collectionDetailsArray: any[] = [];

    let totalAmount = 0;
    let postedAmount = 0;
    let unpostedAmount = 0;
    let postedCount = 0;
    let unpostedCount = 0;

    // 5. Process grouped collections
    collectionGroups.forEach((groupDetails, collectionId) => {
      const header = collectionHeaderMap.get(collectionId);
      if (!header) return;

      const isPosted = header.isPosted?.data?.[0] === 1;
      const dateStr = header.collection_date?.split("T")[0] || "";
      const collectionTotal = groupDetails.reduce(
        (sum, d) => sum + (Number(d.amount) || 0),
        0
      );

      // Summary Totals
      totalAmount += collectionTotal;
      if (isPosted) {
        postedAmount += collectionTotal;
        postedCount++;
      } else {
        unpostedAmount += collectionTotal;
        unpostedCount++;
      }

      // Method Name Logic (Handle "Mixed" and "Type Fallback")
      let finalMethodName = "Unknown";
      const uniqueMethods = new Set(
        groupDetails.map((d) => d.payment_method || `type_${d.type}`)
      );

      if (uniqueMethods.size > 1) {
        finalMethodName = "Mixed";
      } else {
        const firstDetail = groupDetails[0];
        if (firstDetail.payment_method) {
          finalMethodName =
            methodsMap.get(firstDetail.payment_method) ||
            `Method #${firstDetail.payment_method}`;
        } else {
          const mapping = TYPE_TO_METHOD_MAP[firstDetail.type];
          finalMethodName = mapping?.name || `Type ${firstDetail.type}`;
        }
      }

      // Daily Trend
      if (dateStr) {
        dailyTrendMap.set(
          dateStr,
          (dailyTrendMap.get(dateStr) || 0) + collectionTotal
        );
      }

      // Method Analytics
      const existingMethod = paymentMethodMap.get(finalMethodName) || {
        amount: 0,
        count: 0,
      };
      paymentMethodMap.set(finalMethodName, {
        amount: existingMethod.amount + collectionTotal,
        count: existingMethod.count + 1,
      });

      // Prepare Row for Data Table
      const salesman = salesmanMap.get(header.salesman_id);
      collectionDetailsArray.push({
        collection_id: collectionId,
        collection_date: header.collection_date,
        customer_name:
          customerMap.get(groupDetails[0].customer_code)?.customer_name ||
          "Unknown",
        customer_code: groupDetails[0].customer_code || null,
        salesman_name: salesman?.salesman_name || "Unknown",
        payment_method: finalMethodName,
        salesman_id: header.salesman_id,
        amount: collectionTotal,
        status: isPosted ? "Posted" : "Unposted",
      });
    });

    // 6. Final Formatting
    const dailyTrend = Array.from(dailyTrendMap.entries())
      .map(([date, amount]) => ({ date, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const paymentMethods = Array.from(paymentMethodMap.entries())
      .map(([method, data]) => ({
        method_name: method,
        amount: Number(data.amount.toFixed(2)),
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json(
      {
        summary: {
          total_collections: collectionGroups.size,
          total_amount: Number(totalAmount.toFixed(2)),
          posted_collections: postedCount,
          posted_amount: Number(postedAmount.toFixed(2)),
          unposted_collections: unpostedCount,
          unposted_amount: Number(unpostedAmount.toFixed(2)),
          average_collection:
            collectionGroups.size > 0 ? totalAmount / collectionGroups.size : 0,
        },
        daily_trend: dailyTrend,
        payment_methods: paymentMethods,
        collection_details: collectionDetailsArray.sort(
          (a, b) =>
            new Date(b.collection_date).getTime() -
            new Date(a.collection_date).getTime()
        ),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in summary-report API:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
