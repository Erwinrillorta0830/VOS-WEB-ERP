// src/app/api/customer-analysis/route.ts

import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";

interface Collection {
  id: number;
  collected_by: number;
  collection_date: string;
  totalAmount: number;
  isCancelled?: {
    type: string;
    data: number[];
  };
  salesman_id: number;
}

interface CollectionDetail {
  id: number;
  collection_id: number;
  customer_code: string | null;
  amount: number;
}

interface Customer {
  id: number;
  customer_name: string;
  customer_code: string;
  isActive: number;
}

interface CollectionResponse {
  data: Collection[];
}

interface CollectionDetailResponse {
  data: CollectionDetail[];
}

interface CustomerResponse {
  data: Customer[];
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

    const collectionFilterParams = new URLSearchParams();
    collectionFilterParams.append("limit", "-1");
    if (dateFrom)
      collectionFilterParams.append("collection_date__gte", dateFrom);
    if (dateTo) collectionFilterParams.append("collection_date__lte", dateTo);
    if (salesmanIdFilter)
      collectionFilterParams.append("salesman_id", salesmanIdFilter.toString());

    const [collectionsRes, detailsRes, customersRes] = await Promise.all([
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
    if (!customersRes.ok) return handleApiError(customersRes, "Customers list");

    const [collectionsData, detailsData, customerData] = await Promise.all([
      collectionsRes.json() as Promise<CollectionResponse>,
      detailsRes.json() as Promise<CollectionDetailResponse>,
      customersRes.json() as Promise<CustomerResponse>,
    ]);

    const collections = collectionsData.data ?? [];
    const details = detailsData.data ?? [];
    const customers = customerData.data ?? [];

    // Filter out cancelled collections
    const validCollections = collections.filter(
      (c) => c.isCancelled?.data?.[0] === 0
    );

    // Create customer map for quick lookup (by customer_code)
    const customerMap = new Map<string, Customer>(
      customers.map((customer) => [customer.customer_code, customer])
    );

    // Create collection ID set for valid collections
    const validCollectionIds = new Set(validCollections.map((c) => c.id));

    // Aggregate collections by customer using collection_details
    type CustomerAgg = {
      customer_id: number;
      customer_name: string;
      customer_code: string;
      is_active: number;
      collections_count: number;
      total_amount: number;
      last_collection_date: string;
      collection_ids: Set<number>;
    };

    const customerAggregation = new Map<string, CustomerAgg>();

    details.forEach((detail) => {
      // Only process details from valid collections
      if (!validCollectionIds.has(detail.collection_id)) return;
      if (!detail.customer_code) return;

      const customer = customerMap.get(detail.customer_code);
      if (!customer) {
        return;
      }

      // Find the collection header
      const collection = collections.find((c) => c.id === detail.collection_id);
      if (!collection) return;

      // if (salesmanIdFilter && collection.salesman_id !== salesmanIdFilter)
      //   return;

      // const collectionDate = new Date(collection.collection_date);
      // if (startDate && collectionDate < startDate) return;
      // if (endDate && collectionDate > endDate) return;

      const existingData = customerAggregation.get(detail.customer_code);
      const amount = parseFloat(String(detail.amount)) || 0;
      const collectionDate = new Date(collection.collection_date);

      if (existingData) {
        // Add to existing aggregation
        existingData.total_amount += amount;

        // Track unique collections
        if (!existingData.collection_ids.has(detail.collection_id)) {
          existingData.collection_ids.add(detail.collection_id);
          existingData.collections_count += 1;
        }

        // Update last collection date
        const existingDate = new Date(existingData.last_collection_date);
        if (collectionDate > existingDate) {
          existingData.last_collection_date = collection.collection_date;
        }
      } else {
        // Create new aggregation
        customerAggregation.set(detail.customer_code, {
          customer_id: customer.id,
          customer_name: customer.customer_name,
          customer_code: customer.customer_code,
          is_active: customer.isActive,
          collections_count: 1,
          total_amount: amount,
          last_collection_date: collection.collection_date,
          collection_ids: new Set([detail.collection_id]),
        });
      }
    });

    console.log("Customers with collections:", customerAggregation.size);

    // Convert to array and calculate percentages
    const customerAnalysisArray = Array.from(customerAggregation.values());

    // Calculate grand total
    const grandTotal = customerAnalysisArray.reduce(
      (sum, customer) => sum + customer.total_amount,
      0
    );

    // Add average and percentage to each customer
    const customerAnalysis = customerAnalysisArray.map((customer) => ({
      ...customer,
      average_amount:
        customer.collections_count > 0
          ? customer.total_amount / customer.collections_count
          : 0,
      percent_of_total:
        grandTotal > 0 ? (customer.total_amount / grandTotal) * 100 : 0,
    }));

    // Sort by total_amount descending
    customerAnalysis.sort((a, b) => b.total_amount - a.total_amount);

    // Add rank
    const customerAnalysisWithRank = customerAnalysis.map(
      (customer, index) => ({
        ...customer,
        rank: index + 1,
      })
    );

    return NextResponse.json({
      data: customerAnalysisWithRank,
      summary: {
        total_customers: customerAnalysisWithRank.filter(
          (c) => c.is_active === 1
        ).length,
        total_customers_all: customerAnalysisWithRank.length,
        total_amount: grandTotal,
        average_per_customer:
          customerAnalysisWithRank.length > 0
            ? grandTotal / customerAnalysisWithRank.length
            : 0,
        top_customer: customerAnalysisWithRank[0] || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch customer analysis data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
