import { useState, useEffect } from "react";
import { ReturnToSupplierProvider } from "../providers/api";
import { ReturnToSupplier } from "../type";

export function useReturnLists() {
  const [data, setData] = useState<ReturnToSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    status: "All" as "All" | "Pending" | "Posted",
  });

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await ReturnToSupplierProvider.getTransactions(
        filters.search,
        filters.status,
      );
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(refresh, 500);
    return () => clearTimeout(t);
  }, [filters]);

  return { data, loading, filters, setFilters, refresh };
}
