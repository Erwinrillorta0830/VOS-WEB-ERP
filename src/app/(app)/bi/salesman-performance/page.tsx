"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { SalesmanPerformanceContent } from "@/components/shared/contents/salesman-performance.-content";
import { useSalesmanPerformanceData } from "../../../hooks/use-salesman-performance-data";

export default function SalesmanPerformancePage() {
  const { data, summary, loading, error } = useSalesmanPerformanceData();
  if (loading) {
    return (
      <div className="flex flex-1 flex-col px-4 ">
        <div className="@container/main grid grid-rows-[auto_1fr] h-full py-4 gap-4">
          {/* Row 1: SectionCards Skeleton (4 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                className="rounded-lg h-48 border p-4 flex flex-col gap-3"
              ></Skeleton>
            ))}
          </div>
          {/* Row 2: Chart/Table Skeleton */}
          <Skeleton className="rounded-lg h-160 w-full"></Skeleton>
        </div>
      </div>
    );
  }

  if (error) {
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
  return <SalesmanPerformanceContent data={data} summary={summary} />;
}
