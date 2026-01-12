// src/app/api/salesman-monthly-collections/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";

interface CollectionRow {
  id: number;
  salesman_id: number | null;
  collection_date: string; // ISO
  totalAmount: number | string | null;
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
    const salesmanId = searchParams.get("salesman_id");

    if (!salesmanId) {
      return NextResponse.json(
        { message: "salesman_id is required" },
        { status: 400 }
      );
    }

    const base = API_BASE.replace(/\/$/, "");

    const collectionsRes = await fetch(
      `${base}/items/collection?limit=-1&filter[salesman_id][_eq]=${salesmanId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!collectionsRes.ok) {
      const errorJson = await collectionsRes.json();
      console.error("Collections API error:", errorJson);
      return NextResponse.json(
        {
          message: errorJson?.errors?.[0]?.message || errorJson?.message || "Failed to fetch collections.",
        },
        { status: collectionsRes.status }
      );
    }

    const collectionsJson = await collectionsRes.json();
    const collections = (collectionsJson?.data ?? []) as CollectionRow[];

    // Group by month
    const monthlyData = new Map
        <string, { total_amount: number; collection_count: number }>();

    for (const c of collections) {
      const date = new Date(c.collection_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      const totalAmountNum =
        typeof c.totalAmount === "number"
          ? c.totalAmount
          : c.totalAmount
          ? Number.parseFloat(c.totalAmount as string)
          : 0;

      const existing = monthlyData.get(monthKey);
      if (existing) {
        existing.total_amount += totalAmountNum;
        existing.collection_count += 1;
      } else {
        monthlyData.set(monthKey, {
          total_amount: totalAmountNum,
          collection_count: 1,
        });
      }
    }

    // Convert to array and sort by month
    const chartData = Array.from(monthlyData.entries())
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1);
        const monthName = date.toLocaleString("en-US", { month: "long" });
        
        return {
          month: monthName,
          monthKey, // For sorting
          total_amount: data.total_amount,
          average_amount: data.collection_count > 0 
            ? data.total_amount / data.collection_count 
            : 0,
          collection_count: data.collection_count,
        };
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map(({ monthKey, ...rest }) => rest); // Remove monthKey from final output

    return NextResponse.json(
      { chartData },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Salesman monthly collections route error:", err);
    return NextResponse.json(
      { message: "Unexpected error while fetching monthly collections." },
      { status: 500 }
    );
  }
}