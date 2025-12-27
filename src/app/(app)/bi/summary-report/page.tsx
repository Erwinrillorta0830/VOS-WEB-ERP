"use client";

import { calculateFilteredSummary } from "@/src/app/lib/summary-report-utils";
import { useFilteredData } from "../../../hooks/use-filtered-data";
import { useSummaryReportData } from "../../../hooks/use-summary-report-data";
import { SummaryReportContent } from "@/components/shared/contents/summary-report-content";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SummaryReportPage() {
  const {
    data,
    dailyTrend,
    summary,
    paymentMethods,
    salesmen,
    loading,
    error,
  } = useSummaryReportData();

  const filteredData = useFilteredData(data);
  const filteredSummary = calculateFilteredSummary(filteredData);

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

  if (error || !summary) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <SummaryReportContent
      filteredData={filteredData}
      filteredSummary={filteredSummary}
      dailyTrend={dailyTrend}
      paymentMethods={paymentMethods}
      salesmen={salesmen}
    />
  );
}
