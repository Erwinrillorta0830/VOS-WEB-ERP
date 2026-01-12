// src/app/api/regional-analysis/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const API_BASE =
      process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";

    if (!API_BASE) {
      return NextResponse.json(
        { message: "API_BASE is not configured on the server." },
        { status: 500 }
      );
    }

    const base = API_BASE.replace(/\/$/, "");

    // 1. Fetch all required data sources
    const [collectionsRes, detailsRes, customerRes, salesmanRes] =
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
      ]);

    if (
      !collectionsRes.ok ||
      !detailsRes.ok ||
      !customerRes.ok ||
      !salesmanRes.ok
    ) {
      return NextResponse.json(
        { message: "Failed to fetch data from external API" },
        { status: 500 }
      );
    }

    const collectionsData = await collectionsRes.json();
    const detailsData = await detailsRes.json();
    const customerData = await customerRes.json();
    const salesmanData = await salesmanRes.json();

    // Define interfaces for API responses
    interface Collection {
      id: number;
      salesman_id: number;
      isCancelled?: { data: number[] } | null;
      [key: string]: any;
    }

    interface CollectionDetail {
      collection_id: number;
      customer_code: string;
      amount: string | number;
      [key: string]: any;
    }

    interface Customer {
      customer_code: string;
      province?: string | null;
      [key: string]: any;
    }

    const collections: Collection[] = collectionsData.data || [];
    const details: CollectionDetail[] = detailsData.data || [];
    const customers: Customer[] = customerData.data || [];

    // 2. Filter valid collections (not cancelled)
    const validCollections = collections.filter(
      (c) => c.isCancelled?.data?.[0] === 0
    );

    const validCollectionIds = new Set(validCollections.map((c: any) => c.id));

    // 3. Create customer lookup map by customer_code
    const customerMap = new Map(
      customers.map((c: any) => [c.customer_code, c])
    );

    // 4. Create collection lookup map for salesman_id
    const collectionMap = new Map(validCollections.map((c: any) => [c.id, c]));

    // 5. Aggregate data by province
    interface RegionData {
      province: string;
      collections: Set<number>;
      salesmen: Set<number>;
      totalAmount: number;
    }

    const regionMap = new Map<string, RegionData>();

    details.forEach((detail) => {
      if (!validCollectionIds.has(detail.collection_id)) return;

      const customer = customerMap.get(detail.customer_code);
      if (!customer) return;

      const province = customer.province?.trim();
      if (!province) return;

      const collection = collectionMap.get(detail.collection_id);
      if (!collection) return;

      if (!regionMap.has(province)) {
        regionMap.set(province, {
          province,
          collections: new Set(),
          salesmen: new Set(),
          totalAmount: 0,
        });
      }

      const regionData = regionMap.get(province)!;
      regionData.collections.add(detail.collection_id);
      regionData.salesmen.add(collection.salesman_id);
      regionData.totalAmount += parseFloat(String(detail.amount || 0));
    });

    // 6. Calculate grand total
    let grandTotal = 0;
    regionMap.forEach((data) => {
      grandTotal += data.totalAmount;
    });

    // 7. Convert to array and calculate percentages
    const data = Array.from(regionMap.values())
      .map((region, index) => ({
        rank: index + 1,
        province: region.province,
        collections_count: region.collections.size,
        salesmen_count: region.salesmen.size,
        total_amount: region.totalAmount,
        average_amount:
          region.collections.size > 0
            ? region.totalAmount / region.collections.size
            : 0,
        percent_of_total:
          grandTotal > 0 ? (region.totalAmount / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error in regional-analysis API:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
