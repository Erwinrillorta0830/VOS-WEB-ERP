import { useState, useEffect } from "react";
import {
  SummaryMetrics,
  summaryReportResponseSchema,
  DailyTrend,
  CollectionDetail,
  PaymentMethod,
} from "@/components/shared/data-table/summary-report-data-table/type";

interface Salesman {
  id: number;
  salesman_name: string;
}

interface UseSummaryReportDataReturn {
  data: CollectionDetail[];
  dailyTrend: DailyTrend[];
  summary: SummaryMetrics | null;
  paymentMethods: PaymentMethod[];
  salesmen: Salesman[];
  loading: boolean;
  error: string | null;
}

export function useSummaryReportData(): UseSummaryReportDataReturn {
  const [data, setData] = useState<CollectionDetail[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);
  const [summary, setSummary] = useState<SummaryMetrics | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [reportResponse, salesmenResponse] = await Promise.all([
          fetch("/api/summary-report"),
          fetch("/api/collection-salesman-performance"),
        ]);

        if (!reportResponse.ok) {
          throw new Error(`Failed to fetch data: ${reportResponse.statusText}`);
        }

        const json = await reportResponse.json();
        const validatedData = summaryReportResponseSchema.parse(json);

        setData(validatedData.collection_details || []);
        setDailyTrend(validatedData.daily_trend || []);
        setSummary(validatedData.summary || null);
        setPaymentMethods(validatedData.payment_methods || []);

        if (salesmenResponse.ok) {
          const salesmenData = await salesmenResponse.json();

          // API returns 'rows' not 'data'
          const salesmenArray = salesmenData.rows || salesmenData.data || [];

          const mappedSalesmen = salesmenArray.map((s: any) => ({
            id: s.salesman_id,
            salesman_name: s.salesman_name,
          }));

          setSalesmen(mappedSalesmen);
        } else {
          console.error("Failed to fetch salesmen:", salesmenResponse.status);
        }
      } catch (err) {
        console.error("Error fetching summary report:", err);
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    data,
    dailyTrend,
    summary,
    paymentMethods,
    salesmen,
    loading,
    error,
  };
}
