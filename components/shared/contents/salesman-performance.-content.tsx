import SectionCards from "@/components/shared/cards/salesman-performance-card";
import { SalesmanCollectionChart } from "@/components/shared/charts/salesman-collection";
import { DataTable } from "@/components/shared/data-table/salesman-data-table";
import { SalesmanPerformance } from "@/components/shared/data-table/salesman-data-table/types";
import { Summary } from "@/src/app/hooks/use-salesman-performance-data";

interface SalesmanPerformanceContentProps {
  data: SalesmanPerformance[];
  summary: Summary | null;
}

export function SalesmanPerformanceContent({
  data,
  summary,
}: SalesmanPerformanceContentProps) {
  return (
    <div className="flex flex-1 flex-col px-4">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4">
          <SectionCards summary={summary} />
          <SalesmanCollectionChart data={data} />
          <DataTable data={data} />
        </div>
      </div>
    </div>
  );
}
