// src/app/hooks/use-customer-analysis-data.ts
import { useState, useEffect, useCallback } from "react";
// Import only the base item schema, not the full response schema
import { CustomerAnalysis } from "@/components/shared/data-table/customer-analysis-data-table/types";

interface UseCustomerAnalysisDataReturn {
  data: any[]; // These are the raw transaction rows
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCustomerAnalysisData(): UseCustomerAnalysisDataReturn {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/customer-analysis?t=${Date.now()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const json = await response.json();

      // We now expect { rows: [...] } from our optimized API
      // We skip the full response Zod parse here because the
      // aggregation happens in the Content component now.
      setData(json.rows || []);
    } catch (err) {
      console.error("Error fetching customer analysis:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while fetching data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
