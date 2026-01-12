import { RegionalAnalysisCards } from "../cards/regional-analysis-card";
import { RegionalAnalysisBarChart } from "../charts/regional-analysis-bar";
import { RegionalAnalysisPieChart } from "../charts/regional-analysis-pie";
import { RegionalAnalysisDataTable } from "../data-table/regional-analysis-data-table";
import { RegionalAnalysis } from "../data-table/regional-analysis-data-table/types";

interface RegionalAnalysisContentProps {
  data: RegionalAnalysis[];
}

export function RegionalAnalysisContent({
  data,
}: RegionalAnalysisContentProps) {
  return (
    <div className="flex flex-1 flex-col px-4">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4">
          <RegionalAnalysisCards data={data} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RegionalAnalysisBarChart data={data} />
            <RegionalAnalysisPieChart data={data} />
          </div>
          <RegionalAnalysisDataTable data={data} />     
        </div>
      </div>
    </div>
  );
}
