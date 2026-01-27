"use client";

import { InternalServerError } from "@/components/shared/error-pages/InternalServerError";
import InvoiceSummaryReportPage from "@/modules/invoice-management/invoice-summary-report/InvoiceSummaryReportPage";
import { Skeleton } from "@/components/ui/skeleton";
import { useSummaryData } from "@/modules/invoice-management/invoice-summary-report/hooks/use-summary-data";

export default function Page() {
  const { isLoading, error, refresh } = useSummaryData();

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col px-4 py-4 gap-6">
        <div className="flex flex-wrap justify-end items-center gap-2">
          <Skeleton className="h-10 w-[120px]" />
        </div>
        {/* ===== Summary Cards ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl border" />
          <Skeleton className="h-28 rounded-xl border" />
          <Skeleton className="h-28 rounded-xl border" />
          <Skeleton className="h-28 rounded-xl border" />
        </div>

        {/* ===== Charts Section ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Reason Distribution */}
          <Skeleton className="h-[380px] rounded-xl border" />

          {/* Approval Ratio */}
          <Skeleton className="h-[380px] rounded-xl border" />
        </div>

        {/* ===== Filters ===== */}
        <div className="flex flex-wrap w-full items-center gap-2">
          <Skeleton className="h-10 w-[260px]" /> {/* Search */}
          <Skeleton className="h-10 w-[90px]" />
          <Skeleton className="h-10 w-[90px]" />
          <Skeleton className="h-10 w-[130px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>

        {/* ===== Table ===== */}
        <div className="rounded-xl border p-4 space-y-3">
          <Skeleton className="h-[500px] w-full rounded-lg border" />

          {/* Pagination */}
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-8 w-[140px]" />
            <Skeleton className="h-8 w-[180px]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <InternalServerError message={error} onRefresh={refresh} />
      </div>
    );
  }
  return <InvoiceSummaryReportPage />;
}
