import { CheckRegisterCards } from "../cards/check-register-card";
import { CheckStatusPieChart } from "../charts/check-status-pie";
import { CheckRegisterDataTable } from "../data-table/check-register-table";
import {
  Check,
  StatusDistribution,
  Summary,
} from "../data-table/check-register-table/types";

interface CheckRegisterContentProps {
  data: Check[];
  summary: Summary | null;
  statusDistribution: StatusDistribution[];
  onRefresh: () => void;
}
export function CheckRegisterContent({
  data,
  summary,
  statusDistribution,
  onRefresh,
}: CheckRegisterContentProps) {
  return (
    <div className="flex flex-1 flex-col px-4 ">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4">
          <CheckRegisterCards summary={summary} />
          <CheckStatusPieChart data={statusDistribution} />
          <CheckRegisterDataTable data={data} onDataRefresh={onRefresh} />
        </div>
      </div>
    </div>
  );
}
