import { useEffect, useState } from "react";
import { DailyCollection } from "@/components/shared/data-table/daily-collections-data-table/types";

interface ApiResponse {
  rows: DailyCollection[];
  summary: Summary;
}

interface Summary {
  total_days: number;
  total_collections: number;
  total_amount: number;
  daily_average: number;
}

interface UseDailyCollectionDataReturn {
  data: DailyCollection[];
  summary: Summary | null;
  loading: boolean;
  error: string | null;
}

export function useDailyCollectionData(): UseDailyCollectionDataReturn {
  const [data, setData] = useState<DailyCollection[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/daily-collections");

        if (!response.ok) {
          const errorText = await response.text();

          throw new Error("Failed to fetch data");
        }

        const json: ApiResponse = await response.json();

        setData(json.rows || []);
        setSummary(json.summary || null);
      } catch (err: any) {
        console.error("Error fetching daily collections:", err);
        setError(err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, summary, loading, error };
}
