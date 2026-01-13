// modules/fleet-management-module/components/pending-invoices/hooks/usePendingInvoiceOptions.ts
"use client";

import * as React from "react";
import type { PendingInvoiceOptions } from "../types";

export function usePendingInvoiceOptions() {
  const [data, setData] = React.useState<PendingInvoiceOptions | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/pending-invoices/options", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load options");
        const json = (await res.json()) as PendingInvoiceOptions;
        if (mounted) setData(json);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load options");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading, error };
}
