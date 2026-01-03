import { useEffect, useState } from "react";
import {
  RegionalAnalysis,
  RegionalAnalysisResponseSchema,
} from "@/components/shared/data-table/regional-analysis-data-table/types";

interface UseRegionalAnalysisDataReturn {
  data: RegionalAnalysis[];
  loading: boolean;
  error: string | null;
}

export function useRegionalAnalysisData(): UseRegionalAnalysisDataReturn {
  const [data, setData] = useState<RegionalAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/regional-analysis");

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const json = await response.json();

        const validated = RegionalAnalysisResponseSchema.parse(json);
        setData(validated.data);
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
    }

    fetchData();
  }, []);

  return { data, loading, error };
}
