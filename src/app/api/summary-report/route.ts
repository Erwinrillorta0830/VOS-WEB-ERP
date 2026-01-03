// src/app/api/summary-report/route.ts
import { NextResponse } from "next/server";

interface Collection {
  id: number;
  collection_date: string;
  salesman_id: number;
  isPosted: { data: number[] };
  isCancelled: { data: number[] };
}

interface CollectionDetail {
  collection_id: number;
  customer_code: string | null;
  payment_method: number | null;
  amount: string | number;
}

interface Customer {
  customer_code: string;
  customer_name: string;
}

interface Salesman {
  id: number;
  salesman_name: string;
}

interface PaymentMethod {
  method_id: number;
  method_name: string;
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
    // Fetch all required data sources
    const [collectionsRes, detailsRes, customerRes, salesmanRes, methodsRes] =
      await Promise.all([
        fetch(`${base}/items/collection?limit=-1`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
        fetch(`${base}/items/collection_details?limit=-1`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
        fetch(`${base}/items/customer?limit=-1`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
        fetch(`${base}/items/salesman?limit=-1`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
        fetch(`${base}/items/payment_methods?limit=-1`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
      ]);

    if (
      !collectionsRes.ok ||
      !detailsRes.ok ||
      !customerRes.ok ||
      !salesmanRes.ok ||
      !methodsRes.ok
    ) {
      return NextResponse.json(
        { message: "Failed to fetch data from external API" },
        { status: collectionsRes.status }
      );
    }

    const collectionsData = await collectionsRes.json();
    const detailsData = await detailsRes.json();
    const customerData = await customerRes.json();
    const salesmanData = await salesmanRes.json();
    const methodsData = await methodsRes.json();

    const collections: Collection[] = collectionsData.data || [];
    const details: CollectionDetail[] = detailsData.data || [];
    const customers: Customer[] = customerData.data || [];
    const salesmen: Salesman[] = salesmanData.data || [];
    const methods: PaymentMethod[] = methodsData.data || [];

    // Filter valid collections (not cancelled)
    const validCollections = collections.filter(
      (c) => c.isCancelled?.data?.[0] === 0
    );

    // Create lookup maps
    const validCollectionIds = new Set(validCollections.map((c) => c.id));
    const customerMap = new Map(customers.map((c) => [c.customer_code, c]));
    const salesmanMap = new Map(salesmen.map((s) => [s.id, s]));
    const methodsMap = new Map(methods.map((m) => [m.method_id, m]));
    const collectionMap = new Map(validCollections.map((c) => [c.id, c]));

    // Track payment methods per collection for "Mixed" detection
    const collectionPaymentMethods = new Map<number, Set<number>>();

    // Initialize aggregation objects
    const dailyTrendMap = new Map<string, number>();
    const paymentMethodMap = new Map<
      string,
      { amount: number; count: number }
    >();
    const collectionDetailsArray: {
      collection_id: number;
      collection_date: string;
      customer_name: string;
      customer_code: string | null;
      salesman_id: number;
      salesman_name: string;
      payment_method: string;
      amount: number;
      status: string;
    }[] = [];

    let totalAmount = 0;
    let postedAmount = 0;
    let unpostedAmount = 0;
    let postedCount = 0;
    let unpostedCount = 0;

    // First pass: collect payment methods per collection
    details.forEach((detail) => {
      if (!validCollectionIds.has(detail.collection_id)) return;

      const methodId = detail.payment_method ?? 0;

      if (!collectionPaymentMethods.has(detail.collection_id)) {
        collectionPaymentMethods.set(detail.collection_id, new Set());
      }
      collectionPaymentMethods.get(detail.collection_id)!.add(methodId);
    });

    // Second pass: process collection details
    details.forEach((detail) => {
      if (!validCollectionIds.has(detail.collection_id)) return;

      const collection = collectionMap.get(detail.collection_id);
      if (!collection) return;

      const amount = parseFloat(String(detail.amount)) || 0;
      const customer = detail.customer_code
        ? customerMap.get(detail.customer_code)
        : undefined;
      const salesman = salesmanMap.get(collection.salesman_id);
      const isPosted = collection.isPosted?.data?.[0] === 1;

      // Determine payment method name (handle Mixed)
      const methodsForCollection = collectionPaymentMethods.get(
        detail.collection_id
      );
      let methodName = "Unknown";

      if (methodsForCollection && methodsForCollection.size > 1) {
        methodName = "Mixed";
      } else {
        const methodId = detail.payment_method ?? 0;
        const method = methodsMap.get(methodId);
        methodName = method?.method_name || `Method #${methodId}`;
      }

      // Aggregate totals
      totalAmount += amount;
      if (isPosted) {
        postedAmount += amount;
      } else {
        unpostedAmount += amount;
      }

      // Aggregate daily trend
      const dateStr = collection.collection_date?.split("T")[0] || "";
      if (dateStr) {
        dailyTrendMap.set(dateStr, (dailyTrendMap.get(dateStr) || 0) + amount);
      }

      // Aggregate payment methods
      const existing = paymentMethodMap.get(methodName) || {
        amount: 0,
        count: 0,
      };
      paymentMethodMap.set(methodName, {
        amount: existing.amount + amount,
        count: existing.count + 1,
      });

      // Build collection details for table
      collectionDetailsArray.push({
        collection_id: detail.collection_id,
        collection_date: collection.collection_date,
        customer_name: customer?.customer_name || "Unknown",
        customer_code: detail.customer_code || null,
        salesman_name: salesman?.salesman_name || "Unknown",
        payment_method: methodName,
        salesman_id: collection.salesman_id,  
        amount: amount,
        status: isPosted ? "Posted" : "Unposted",
      });
    });

    // Count posted/unposted collections
    validCollections.forEach((c) => {
      if (c.isPosted?.data?.[0] === 1) {
        postedCount++;
      } else {
        unpostedCount++;
      }
    });

    // Format daily trend data
    const dailyTrend = Array.from(dailyTrendMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Format payment methods data
    const paymentMethods = Array.from(paymentMethodMap.entries())
      .map(([method, data]) => ({
        method_name: method,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Sort collection details by date (most recent first)
    collectionDetailsArray.sort(
      (a, b) =>
        new Date(b.collection_date).getTime() -
        new Date(a.collection_date).getTime()
    );

    // Calculate average
    const totalCollections = validCollections.length;
    const averageCollection =
      totalCollections > 0 ? totalAmount / totalCollections : 0;

    return NextResponse.json(
      {
        summary: {
          total_collections: totalCollections,
          total_amount: totalAmount,
          posted_collections: postedCount,
          posted_amount: postedAmount,
          unposted_collections: unpostedCount,
          unposted_amount: unpostedAmount,
          average_collection: averageCollection,
        },
        daily_trend: dailyTrend,
        payment_methods: paymentMethods,
        collection_details: collectionDetailsArray,
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
