import { useState, useEffect, useMemo } from "react";
import { InvoiceReportRow } from "../types";

export function useSummaryData() {
  const [rawData, setRawData] = useState<InvoiceReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/invoice-summary-report");
      const json = await response.json();
      setRawData(json.data || []);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return useMemo(
    () => ({
      rawData,
      isLoading,
      error,
      refresh: fetchData,
    }),
    [rawData, isLoading, fetchData],
  );
}
