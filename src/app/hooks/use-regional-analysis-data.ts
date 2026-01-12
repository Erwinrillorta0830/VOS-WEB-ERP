// src/app/hooks/use-regional-analysis-data.ts
import { useEffect, useState, useCallback } from "react";

interface UseRegionalAnalysisDataReturn {
  data: any[]; // These are raw transaction rows for client-side aggregation
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRegionalAnalysisData(): UseRegionalAnalysisDataReturn {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/regional-analysis?t=${Date.now()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const json = await response.json();

      // We expect { rows: [...] } from our optimized API
      setData(json.rows || []);
    } catch (err) {
      console.error("Error fetching regional analysis data:", err);
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
