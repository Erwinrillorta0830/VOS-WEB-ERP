import {
  Check,
  checkRegisterResponseSchema,
  StatusDistribution,
  Summary,
} from "@/components/shared/data-table/check-register-table/types";
import { useEffect, useState } from "react";

interface ApiResponse {
  checks: Check[];
  summary: Summary;
  status_distribution: StatusDistribution[];
}

interface UseCheckRegisterDataReturn {
  data: Check[];
  summary: Summary | null;
  statusDistribution: StatusDistribution[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCheckRegisterData(): UseCheckRegisterDataReturn {
  const [data, setData] = useState<Check[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<
    StatusDistribution[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true); // Optional: show skeleton during refresh
    try {
      // Force a fresh fetch by adding a timestamp to bypass any browser cache
      const response = await fetch(
        `/api/check-register?cacheBust=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch");
      const json: ApiResponse = await response.json();
      const validatedData = checkRegisterResponseSchema.parse(json);

      setData(validatedData.checks || []);
      setSummary(validatedData.summary || null);
      setStatusDistribution(validatedData.status_distribution || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    summary,
    statusDistribution,
    loading,
    error,
    refresh: fetchData,
  };
}
