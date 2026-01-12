import { AdvancedFilter } from "@/components/advance-filter";
import { DailyCollectionCards } from "../cards/daily-collections-card";
import { DailyCollectionTrendChart } from "../charts/data-collection-trend";
import { DailyCollectionDataTable } from "../data-table/daily-collections-data-table";
import { ExportButton } from "@/components/export-button";
import { exportColumns } from "@/src/app/lib/daily-collections-utils";
import { DailyCollection } from "../data-table/daily-collections-data-table/types";

interface Summary {
  total_days: number;
  total_collections: number;
  total_amount: number;
  daily_average: number;
}
interface DailyCollectionContentProps {
  data: DailyCollection[];
  summary: Summary | null;
}

export function DailyCollectionContent({
  data,
  summary,
}: DailyCollectionContentProps) {
  return (
    <div className="flex flex-1 flex-col px-4 ">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4">
          {/* <div className="grid grid-cols-2">
            <AdvancedFilter
              showDateFilter={true}
              showSalesmanFilter={true}
              showStatusFilter={true}
            />
            <div className="flex flex-row items-end justify-end">
              <ExportButton
                data={data}
                filename={"daily-collections"}
                columns={exportColumns}
              />
            </div>
          </div> */}
          <DailyCollectionCards summary={summary} />
          <DailyCollectionTrendChart data={data} />
          <DailyCollectionDataTable data={data} />
        </div>
      </div>
    </div>
  );
}
