// src/app/api/pending-invoices/route.ts
import { NextResponse } from "next/server";
import { listPendingInvoices } from "./logic";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const q = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "All";
  const salesmanId = url.searchParams.get("salesmanId") ?? "All";
  const customerCode = url.searchParams.get("customerCode") ?? "All";
  const dateFrom = url.searchParams.get("dateFrom") ?? "";
  const dateTo = url.searchParams.get("dateTo") ?? "";
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "25");

  const data = await listPendingInvoices({
    q,
    status: status as any,
    salesmanId,
    customerCode,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize,
  });

  return NextResponse.json(data);
}
