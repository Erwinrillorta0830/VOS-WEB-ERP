import { useEffect, useMemo, useState } from "react";
import type { PendingInvoicesApiResponse } from "../types";

export type PendingInvoiceFilters = {
  search: string;
  status: "all" | "Unlinked" | "For Dispatch" | "Inbound" | "Cleared";
  salesmanId: string; // "all" or numeric string
  customerCode: string; // "all" or code
  dateFrom: string; // "" or YYYY-MM-DD
  dateTo: string;   // "" or YYYY-MM-DD
};

export function usePendingInvoices(page: number, limit: number, filters: PendingInvoiceFilters) {
  const [data, setData] = useState<PendingInvoicesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search: filters.search ?? "",
      status: filters.status ?? "all",
      salesmanId: filters.salesmanId ?? "all",
      customerCode: filters.customerCode ?? "all",
      dateFrom: filters.dateFrom ?? "",
      dateTo: filters.dateTo ?? "",
      _t: String(Date.now()),
    });
    return params.toString();
  }, [page, limit, filters.search, filters.status, filters.salesmanId, filters.customerCode, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/pending-invoices?${qs}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
        const json = (await res.json()) as PendingInvoicesApiResponse;
        setData(json);
      } catch (e) {
        console.error("pending-invoices:fetch failed", e);
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [qs]);

  return { data, loading, error };
}
