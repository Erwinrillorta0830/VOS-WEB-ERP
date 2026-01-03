import { CustomerAnalysisCard } from "../cards/customer-analysis-card";
import { CustomerCollectionChart } from "../charts/customer-analysis";
import { DataTable } from "../data-table/customer-analysis-data-table";
import {
  CustomerAnalysis,
  CustomerAnalysisSummary,
} from "../data-table/customer-analysis-data-table/types";

interface CustomerAnalysisContentProps {
  data: CustomerAnalysis[];
  summary: CustomerAnalysisSummary | null;
}

export function CustomerAnalysisContent({
  data,
  summary,
}: CustomerAnalysisContentProps) {
  return (
    <div className="flex flex-1 flex-col px-4 ">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4">
          <CustomerAnalysisCard summary={summary} />
          <CustomerCollectionChart data={data} />
          <DataTable data={data} />
        </div>
      </div>
    </div>
  );
}
