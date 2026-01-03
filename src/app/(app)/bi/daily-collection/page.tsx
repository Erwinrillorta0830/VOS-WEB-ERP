"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useDailyCollectionData } from "../../../hooks/use-daily-collection-data";
import { DailyCollectionContent } from "@/components/shared/contents/daily-collections-content";

export default function DailyCollectionPage() {
  const { data, summary, loading, error } = useDailyCollectionData();

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
      <div className="flex flex-1 flex-col px-4">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="font-semibold mb-2">Error Loading Data</div>
              <div>{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <DailyCollectionContent data={data} summary={summary} />;
}
