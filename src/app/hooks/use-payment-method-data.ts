import {
  PaymentMethodApiResponseSchema,
  PaymentMethodPerformance,
} from "@/components/shared/data-table/payment-methods-data-table/types";
import { useEffect, useState } from "react";

interface UsePaymentMethodDataReturn {
  data: PaymentMethodPerformance[];
  loading: boolean;
  error: string | null;
}

export function usePaymentMethodData(): UsePaymentMethodDataReturn {
  const [data, setData] = useState<PaymentMethodPerformance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/collection-payment-methods");

        if (!response.ok) {
          throw new Error("Failed to fetch payment methods data");
        }

        const json = await response.json();

        const validatedData = PaymentMethodApiResponseSchema.parse(json);

        setData(validatedData.rows);
      } catch (err) {
        console.error("Error fetching check register data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load check register data"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, error };
}
