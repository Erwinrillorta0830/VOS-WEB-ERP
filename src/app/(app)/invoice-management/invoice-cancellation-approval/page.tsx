"use client";

import InvoiceCancellationApprovalPage from "@/modules/invoice-management/invoice-cancellation-approval/InvoiceCancellationApprovalPage";
import { useApprovals } from "@/modules/invoice-management/invoice-cancellation-approval/hooks/use-approval";
import { InternalServerError } from "@/components/shared/error-pages/InternalServerError";
import { Skeleton } from "@/components/ui/skeleton";

export default function Page() {
  const { isLoading, error, refresh } = useApprovals();

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col px-4 gap-4 py-4">
        {/* Statistics Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg border" />
          ))}
        </div>
        {/* Table Skeleton */}
        <div className="space-y-2">
          <div className="flex gap-2 justify-between">
            <div className="flex gap-2">
              <Skeleton className="h-10 w-[250px]" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-[250px]" />
              <Skeleton className="h-10 w-[100px]" />
            </div>
          </div>
          <div className="rounded-xl border p-4 space-y-3">
            <Skeleton className="h-[500px] w-full rounded-lg border" />

            {/* Pagination */}
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="h-8 w-[140px]" />
              <Skeleton className="h-8 w-[180px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <InternalServerError message={error} onRefresh={refresh} />
      </div>
    );
  }

  return <InvoiceCancellationApprovalPage />;
}
