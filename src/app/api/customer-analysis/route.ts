// src/app/api/customer-analysis/route.ts
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

export async function GET() {
  if (!API_BASE)
    return NextResponse.json({ message: "API_BASE error" }, { status: 500 });

  try {
    const base = API_BASE.replace(/\/$/, "");
    const [collections, details, customers] = await Promise.all([
      fetchAll(`${base}/items/collection`),
      fetchAll(`${base}/items/collection_details`),
      fetchAll(`${base}/items/customer`),
    ]);

    const collectionMap = new Map(collections.map((c: any) => [c.id, c]));
    const customerMap = new Map(
      customers.map((c: any) => [c.customer_code, c])
    );

    // Flatten data: Return one row per collection detail
    const rows = details
      .filter((d: any) => {
        const header = collectionMap.get(d.collection_id);
        return header && header.isCancelled?.data?.[0] === 0;
      })
      .map((d: any) => {
        const header = collectionMap.get(d.collection_id);
        const cust = customerMap.get(d.customer_code || "");
        return {
          id: d.id,
          collection_id: d.collection_id,
          collection_date: header.collection_date,
          salesman_id: header.salesman_id,
          customer_code: d.customer_code || "UNCATEGORIZED",
          customer_name: cust?.customer_name || "Unspecified Customer",
          customer_id: cust?.id || 0,
          is_active: cust?.isActive ?? 0,
          amount: Number(d.amount) || 0,
        };
      });

    return NextResponse.json({ rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
