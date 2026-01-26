"use client";

import InvoiceCancellationPage from "@/modules/invoice-management/invoice-cancellation/InvoiceCancellationPage";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useInvoices } from "@/modules/invoice-management/invoice-cancellation/hooks/use-invoices";
import { InternalServerError } from "@/components/shared/error-pages/InternalServerError";

export default function Page() {
  const { isLoading, error, refresh } = useInvoices();

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col px-4">
        <div className="flex flex-col gap-4 py-4">
          {/* Matches the Summary Cards layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32 rounded-lg border" />
            <Skeleton className="h-32 rounded-lg border" />
            <Skeleton className="h-32 rounded-lg border" />
          </div>
          {/* Matches the Data Table layout */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-10 w-[250px]" />
              <Skeleton className="h-10 w-[100px]" />
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
  return <InvoiceCancellationPage />;
}
