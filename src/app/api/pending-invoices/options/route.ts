import { NextResponse } from "next/server";

type AnyRecord = Record<string, any>;

const RAW_DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.DIRECTUS_URL || "";
const DIRECTUS_BASE = RAW_DIRECTUS_URL.replace(/\/+$/, "");

async function fetchAllItems(collection: string): Promise<AnyRecord[]> {
  const pageSize = 2000;
  let page = 1;
  const out: AnyRecord[] = [];

  while (true) {
    const url = `${DIRECTUS_BASE}/items/${collection}?limit=${pageSize}&page=${page}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return out;
    const json = await res.json();
    const rows: AnyRecord[] = json?.data || [];
    out.push(...rows);
    if (rows.length < pageSize) break;
    page += 1;
    if (page > 50) break;
  }
  return out;
}

export async function GET() {
  try {
    if (!DIRECTUS_BASE) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_API_BASE_URL / DIRECTUS_URL" }, { status: 500 });
    }

    const [salesmen, customers] = await Promise.all([
      fetchAllItems("salesman"),
      fetchAllItems("customer"),
    ]);

    const cleanSalesmen = (salesmen || [])
      .map((s) => ({ id: Number(s.id), salesman_name: String(s.salesman_name ?? "").trim() }))
      .filter((s) => s.id && s.salesman_name)
      .sort((a, b) => a.salesman_name.localeCompare(b.salesman_name));

    const cleanCustomers = (customers || [])
      .map((c) => ({ customer_code: String(c.customer_code ?? "").trim(), customer_name: String(c.customer_name ?? "").trim() }))
      .filter((c) => c.customer_code && c.customer_name)
      .sort((a, b) => a.customer_name.localeCompare(b.customer_name));

    return NextResponse.json({ salesmen: cleanSalesmen, customers: cleanCustomers });
  } catch (e: any) {
    console.error("pending-invoices options error", e);
    return NextResponse.json({ error: e?.message || "Internal Server Error" }, { status: 500 });
  }
}
