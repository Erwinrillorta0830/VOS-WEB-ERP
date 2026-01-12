import {
  CustomerAnalysis,
  customerAnalysisResponseSchema,
  CustomerAnalysisSummary,
} from "@/components/shared/data-table/customer-analysis-data-table/types";
import { useState, useEffect } from "react";

interface ApiResponse {
  data: CustomerAnalysis[];
  summary: CustomerAnalysisSummary;
}

interface UseCustomerAnalysisDataReturn {
  data: CustomerAnalysis[];
  summary: CustomerAnalysisSummary | null;
  loading: boolean;
  error: string | null;
}

export function useCustomerAnalysisData(): UseCustomerAnalysisDataReturn {
  const [data, setData] = useState<CustomerAnalysis[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<CustomerAnalysisSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/customer-analysis");

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const json: ApiResponse = await response.json();

        const validatedData = customerAnalysisResponseSchema.parse(json);
        setData(validatedData.data || []);
        setSummary(validatedData.summary || null);
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
    }

    fetchData();
  }, []);

  return { data, summary, loading, error };
}
