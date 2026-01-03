import { useEffect, useState } from "react";
import { SalesmanPerformance } from "@/components/shared/data-table/salesman-data-table/types";

export interface TopPerformer {
  salesman_id: number;
  salesman_name: string;
  total_amount: number;
}

export interface Summary {
  activeSalesmen: number;
  totalAmount: number;
  avgPerSalesman: number;
  topPerformer: TopPerformer | null;
}

interface ApiResponse {
  rows: SalesmanPerformance[];
  summary: Summary;
  salesmen: Array<{ id: number; salesman_name: string }>;
}

interface UseSalesmanPerformanceDataReturn {
  data: SalesmanPerformance[];
  summary: Summary | null;
  loading: boolean;
  error: string | null;
}

export function useSalesmanPerformanceData(): UseSalesmanPerformanceDataReturn {
  const [data, setData] = useState<SalesmanPerformance[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/collection-salesman-performance");

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const json: ApiResponse = await response.json();

        setData(json.rows || []);
        setSummary(json.summary || null);
      } catch (err: any) {
        setError(err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, summary, loading, error };
}
