import { useEffect, useState } from "react";
import type { PendingInvoiceOptions } from "../types";

export function usePendingInvoiceOptions() {
  const [data, setData] = useState<PendingInvoiceOptions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/pending-invoices/options", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load options");
        const json = (await res.json()) as PendingInvoiceOptions;
        setData(json);
      } catch (e) {
        console.error("pending-invoices:options failed", e);
        setData({ salesmen: [], customers: [] });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return { data, loading };
}
