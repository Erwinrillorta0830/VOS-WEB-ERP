// src/app/api/collection-payment-methods/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";

interface CollectionRow {
  id: number;
  salesman_id: number | null;
  collection_date: string; // ISO
}

interface CollectionDetailRow {
  id: number;
  collection_id: number;
  amount: number | string | null;
  payment_method: number | null; // method_id
  type: number; // coa_id type (1, 2, 96, 98, etc.)
}

interface PaymentMethodRow {
  method_id: number;
  method_name: string;
}

interface SalesmanRow {
  id: number;
  salesman_name: string;
}

// Type to payment method mapping
const TYPE_TO_METHOD_MAP: Record<number, { key: string; name: string }> = {
  1: { key: "type_1", name: "Cash" },
  2: { key: "type_2", name: "Bank Transfer" },
  96: { key: "type_check", name: "Check" },
  98: { key: "type_check", name: "Check" }, // Same key as 96
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

    const [collectionsRes, detailsRes, methodsRes, salesmenRes] =
      await Promise.all([
        fetch(`${base}/items/collection?limit=-1`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
        fetch(`${base}/items/collection_details?limit=-1`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
        fetch(`${base}/items/payment_methods?limit=-1`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
        fetch(`${base}/items/salesman?limit=-1`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
      ]);

    const [collectionsJson, detailsJson, methodsJson, salesmenJson] =
      await Promise.all([
        collectionsRes.json(),
        detailsRes.json(),
        methodsRes.json(),
        salesmenRes.json(),
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

    if (!methodsRes.ok) {
      console.error("Payment methods API error:", methodsJson);
      return NextResponse.json(
        {
          message:
            methodsJson?.errors?.[0]?.message ||
            methodsJson?.message ||
            "Failed to fetch payment methods.",
        },
        { status: methodsRes.status }
      );
    }

    if (!salesmenRes.ok) {
      console.error("Salesman API error:", salesmenJson);
      return NextResponse.json(
        {
          message:
            salesmenJson?.errors?.[0]?.message ||
            salesmenJson?.message ||
            "Failed to fetch salesman list.",
        },
        { status: salesmenRes.status }
      );
    }

    const collections = (collectionsJson?.data ?? []) as CollectionRow[];
    const details = (detailsJson?.data ?? []) as CollectionDetailRow[];
    const methods = (methodsJson?.data ?? []) as PaymentMethodRow[];
    const salesmen = (salesmenJson?.data ?? []) as SalesmanRow[];

    const methodsMap = new Map<number, PaymentMethodRow>();
    for (const m of methods) {
      methodsMap.set(m.method_id, m);
    }

    const collectionsMap = new Map<number, CollectionRow>();
    for (const c of collections) {
      collectionsMap.set(c.id, c);
    }

    // Pre-filter collections by date + salesman
    const allowedCollectionIds = new Set<number>();
    for (const c of collections) {
      const cDate = new Date(c.collection_date);
      if (startDate && cDate < startDate) continue;
      if (endDate && cDate > endDate) continue;
      if (salesmanIdFilter && c.salesman_id !== salesmanIdFilter) continue;

      allowedCollectionIds.add(c.id);
    }

    // Collect per collection: unique methods + amount
    type PerCollectionInfo = {
      methodKeys: Set<string>; // distinct method keys (can be method_id or type-based)
      amountByKey: Map<string, number>;
      nameByKey: Map<string, string>;
      totalAmount: number;
    };

    const perCollection = new Map<number, PerCollectionInfo>();

    for (const d of details) {
      if (!allowedCollectionIds.has(d.collection_id)) continue;

      const header = collectionsMap.get(d.collection_id);
      if (!header) continue;

      const amt =
        typeof d.amount === "number"
          ? d.amount
          : d.amount
          ? Number.parseFloat(d.amount as string)
          : 0;

      let info = perCollection.get(d.collection_id);
      if (!info) {
        info = {
          methodKeys: new Set<string>(),
          amountByKey: new Map<string, number>(),
          nameByKey: new Map<string, string>(),
          totalAmount: 0,
        };
        perCollection.set(d.collection_id, info);
      }

      let methodKey: string;
      let methodName: string;

      if (d.payment_method === 1 || (!d.payment_method && d.type === 1)) {
        methodKey = "method_1";
        const method = methodsMap.get(1);
        methodName = method?.method_name || "Cash";
      } else if (d.payment_method !== null && d.payment_method !== undefined) {
        methodKey = `method_${d.payment_method}`;
        const method = methodsMap.get(d.payment_method);
        methodName = method?.method_name || `Method #${d.payment_method}`;
      } else {
        const typeMapping = TYPE_TO_METHOD_MAP[d.type];
        if (typeMapping) {
          methodKey = typeMapping.key;
          methodName = typeMapping.name;
        } else {
          methodKey = `type_${d.type || 0}`;
          methodName = `Type #${d.type || 0}`;
        }
      }

      info.methodKeys.add(methodKey);
      info.totalAmount += amt;
      const prevAmt = info.amountByKey.get(methodKey) ?? 0;
      info.amountByKey.set(methodKey, prevAmt + amt);
      info.nameByKey.set(methodKey, methodName);
    }

    // Aggregate per payment method (+ Mixed)
    type MethodAgg = {
      method_key: string;
      method_id: number | null;
      method_name: string;
      transactions_count: number; // # collections
      total_amount: number;
    };

    const aggMap = new Map<string, MethodAgg>();

    function getOrCreateAgg(
      key: string,
      methodId: number | null,
      methodName: string
    ): MethodAgg {
      let agg = aggMap.get(key);
      if (!agg) {
        agg = {
          method_key: key,
          method_id: methodId,
          method_name: methodName,
          transactions_count: 0,
          total_amount: 0,
        };
        aggMap.set(key, agg);
      }
      return agg;
    }

    for (const [collectionId, info] of perCollection.entries()) {
      const distinctCount = info.methodKeys.size;

      if (distinctCount === 0) continue;

      if (distinctCount > 1) {
        // Mixed - multiple payment methods in one collection
        const agg = getOrCreateAgg("mixed", null, "Mixed");
        agg.transactions_count += 1;
        agg.total_amount += info.totalAmount;
      } else {
        // Single payment method
        const methodKey = Array.from(info.methodKeys)[0];
        const amt = info.amountByKey.get(methodKey) ?? info.totalAmount;

        // Determine method name and ID for display
        let methodName: string;
        let methodId: number | null = null;

        if (methodKey.startsWith("method_")) {
          // From payment_methods table
          methodId = parseInt(methodKey.replace("method_", ""));
          const method = methodsMap.get(methodId);
          methodName = method?.method_name || `Method #${methodId}`;
        } else {
          // From type mapping
          const typeEntry = Object.values(TYPE_TO_METHOD_MAP).find(
            (t) => t.key === methodKey
          );
          methodName = typeEntry?.name || methodKey;
        }

        const agg = getOrCreateAgg(methodKey, methodId, methodName);
        agg.transactions_count += 1;
        agg.total_amount += amt;
      }
    }

    const aggList = Array.from(aggMap.values()).sort(
      (a, b) => b.total_amount - a.total_amount
    );

    const totalAmount = aggList.reduce((sum, a) => sum + a.total_amount, 0);
    const totalTransactions = aggList.reduce(
      (sum, a) => sum + a.transactions_count,
      0
    );

    const rows = aggList.map((a) => {
      const average_amount =
        a.transactions_count > 0 ? a.total_amount / a.transactions_count : 0;
      const percent_of_total =
        totalAmount > 0 ? (a.total_amount / totalAmount) * 100 : 0;
      const percent_of_transactions =
        totalTransactions > 0
          ? (a.transactions_count / totalTransactions) * 100
          : 0;

      return {
        method_key: a.method_key,
        method_id: a.method_id,
        method_name: a.method_name,
        transactions_count: a.transactions_count,
        total_amount: a.total_amount,
        average_amount,
        percent_of_total,
        percent_of_transactions,
      };
    });

    return NextResponse.json(
      {
        rows,
        summary: {
          totalTransactions,
          totalAmount,
        },
        salesmen: salesmen.map((s) => ({
          id: s.id,
          salesman_name: s.salesman_name,
        })),
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Collection payment methods report error:", err);
    return NextResponse.json(
      { message: "Unexpected error while building payment methods report." },
      { status: 500 }
    );
  }
}
