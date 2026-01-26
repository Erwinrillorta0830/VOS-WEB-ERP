import { useState, useEffect, useMemo } from "react";
import { InvoiceReportRow } from "../types";

export function useSummaryData() {
  const [rawData, setRawData] = useState<InvoiceReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/invoice-summary-report");
      const json = await response.json();
      setRawData(json.data || []);
    } catch (error) {
      console.error("Summary Fetch Error:", error);
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
      refresh: fetchData,
    }),
    [rawData, isLoading, fetchData],
  );
}
