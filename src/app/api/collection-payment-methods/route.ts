// src/app/api/collection-payment-methods/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";

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
    if (data.length < limit) hasMore = false;
    else offset += limit;
  }
  return allItems;
}

const TYPE_TO_METHOD_MAP: Record<number, { key: string; name: string }> = {
  1: { key: "cash", name: "Cash" },
  2: { key: "bank_transfer", name: "Bank Transfer" },
  96: { key: "check", name: "Check" },
  98: { key: "check", name: "Check" },
};

export async function GET(req: NextRequest) {
  if (!API_BASE)
    return NextResponse.json({ message: "API_BASE error" }, { status: 500 });

  try {
    const base = API_BASE.replace(/\/$/, "");

    // 1. Parallel Fetching
    const [collections, details, methods, salesmen] = await Promise.all([
      fetchAll(`${base}/items/collection`),
      fetchAll(`${base}/items/collection_details`),
      fetchAll(`${base}/items/payment_methods`),
      fetchAll(`${base}/items/salesman`),
    ]);

    const methodsMap = new Map(
      methods.map((m: any) => [m.method_id, m.method_name])
    );
    const salesmanMap = new Map(
      salesmen.map((s: any) => [s.id, s.salesman_name])
    );
    const collectionMap = new Map(collections.map((c: any) => [c.id, c]));

    // 2. Build Flattened Rows
    // We group by collection_id first to detect "Mixed" payments
    const collectionGroups = new Map<number, any[]>();
    details.forEach((d: any) => {
      if (!collectionGroups.has(d.collection_id))
        collectionGroups.set(d.collection_id, []);
      collectionGroups.get(d.collection_id)?.push(d);
    });

    const rows: any[] = [];

    collectionGroups.forEach((groupDetails, collectionId) => {
      const header = collectionMap.get(collectionId);
      if (!header || header.isCancelled?.data?.[0] === 1) return;

      const isMixed =
        new Set(groupDetails.map((d) => d.payment_method || d.type)).size > 1;
      const totalCollectionAmount = groupDetails.reduce(
        (sum, d) => sum + (Number(d.amount) || 0),
        0
      );

      if (isMixed) {
        rows.push({
          id: `mixed-${collectionId}`,
          collection_date: header.collection_date,
          salesman_id: header.salesman_id,
          salesman_name: salesmanMap.get(header.salesman_id) || "Unknown",
          amount: totalCollectionAmount,
          method_key: "mixed",
          method_name: "Mixed",
        });
      } else {
        const d = groupDetails[0];
        let methodName = "Unknown";
        let methodKey = "unknown";

        if (d.payment_method) {
          methodName =
            methodsMap.get(d.payment_method) || `Method ${d.payment_method}`;
          methodKey = `method_${d.payment_method}`;
        } else {
          const mapping = TYPE_TO_METHOD_MAP[d.type];
          methodName = mapping?.name || `Type ${d.type}`;
          methodKey = mapping?.key || `type_${d.type}`;
        }

        rows.push({
          id: d.id,
          collection_date: header.collection_date,
          salesman_id: header.salesman_id,
          salesman_name: salesmanMap.get(header.salesman_id) || "Unknown",
          amount: totalCollectionAmount,
          method_key: methodKey,
          method_name: methodName,
        });
      }
    });

    return NextResponse.json({
      rows,
      salesmen: salesmen.map((s: any) => ({
        id: s.id,
        salesman_name: s.salesman_name,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
