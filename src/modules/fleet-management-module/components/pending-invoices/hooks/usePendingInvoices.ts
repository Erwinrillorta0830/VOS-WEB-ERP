// modules/fleet-management-module/components/pending-invoices/hooks/usePendingInvoices.ts
"use client";

import * as React from "react";
import type { FiltersState, PendingInvoiceListResponse } from "../types";

function qs(filters: FiltersState) {
  const p = new URLSearchParams();
  p.set("q", filters.q || "");
  p.set("status", filters.status);
  p.set("salesmanId", filters.salesmanId);
  p.set("customerCode", filters.customerCode);
  if (filters.dateFrom) p.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) p.set("dateTo", filters.dateTo);
  p.set("page", String(filters.page));
  p.set("pageSize", String(filters.pageSize));
  return p.toString();
}

export function usePendingInvoices(filters: FiltersState) {
  const [data, setData] = React.useState<PendingInvoiceListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/pending-invoices?${qs(filters)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load pending invoices");
        const json = (await res.json()) as PendingInvoiceListResponse;
        if (mounted) setData(json);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load pending invoices");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [filters.q, filters.status, filters.salesmanId, filters.customerCode, filters.dateFrom, filters.dateTo, filters.page, filters.pageSize]);

  return { data, loading, error };
}
