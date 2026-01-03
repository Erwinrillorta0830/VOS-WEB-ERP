"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { usePaymentMethodData } from "../../../hooks/use-payment-method-data";
import { PaymentMethodContent } from "@/components/shared/contents/payment-method-content";

export default function PaymentMethodsPage() {
  const { data, loading, error } = usePaymentMethodData();

  if (loading) {
    return (
      <div className="flex flex-1 flex-col px-4">
        <div className="@container/main grid grid-rows-[auto_auto_auto] h-full py-4 gap-4">
          {/* Row 1: Summary Cards Skeleton (4 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                className="rounded-lg h-48 border p-4 flex flex-col gap-3"
              />
            ))}
          </div>

          {/* Row 2: Charts Skeleton (Bar + Pie) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="rounded-lg h-[450px] w-full" />
            <Skeleton className="rounded-lg h-[450px] w-full" />
          </div>

          {/* Row 3: Table Skeleton */}
          <Skeleton className="rounded-lg h-80 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return <PaymentMethodContent data={data} />;
}
