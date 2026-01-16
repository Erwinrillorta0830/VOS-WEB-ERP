// src/components/shared/contents/regional-analysis-content.tsx
"use client";

import React, { useMemo } from "react";
import { AdvancedFilter } from "@/components/advance-filter";
import { RegionalAnalysisCards } from "../cards/regional-analysis-card";
import { RegionalAnalysisBarChart } from "../charts/regional-analysis-bar";
import { RegionalAnalysisPieChart } from "../charts/regional-analysis-pie";
import { RegionalAnalysisDataTable } from "../data-table/regional-analysis-data-table";
import { useFilteredData } from "@/src/app/hooks/use-filtered-data";

export function RegionalAnalysisContent({ data }: { data: any[] }) {
  // 1. Prepare data for the filter hook
  const preparedData = useMemo(
    () => data.map((item) => ({ ...item, date: item.collection_date })),
    [data]
  );

  const filteredRows = useFilteredData(preparedData);

  // 2. Aggregate by Province
  const aggregatedData = useMemo(() => {
    const regionMap = new Map<string, any>();
    let grandTotal = 0;

    filteredRows.forEach((row) => {
      const province = row.province;
      const amount = row.amount;

      if (!regionMap.has(province)) {
        regionMap.set(province, {
          province,
          total_amount: 0,
          unique_collections: new Set(),
          unique_salesmen: new Set(),
        });
      }

      const agg = regionMap.get(province);
      agg.total_amount += amount;
      agg.unique_collections.add(row.collection_id);
      agg.unique_salesmen.add(row.salesman_id);
      grandTotal += amount;
    });

    return Array.from(regionMap.values())
      .map((region) => ({
        province: region.province,
        collections_count: region.unique_collections.size,
        salesmen_count: region.unique_salesmen.size,
        total_amount: Number(region.total_amount.toFixed(2)),
        average_amount:
          region.unique_collections.size > 0
            ? region.total_amount / region.unique_collections.size
            : 0,
        percent_of_total:
          grandTotal > 0 ? (region.total_amount / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [filteredRows]);

  return (
    <div className="flex flex-1 flex-col px-4">
      <div className="flex flex-col gap-4 py-4">
        <AdvancedFilter
          filteredData={filteredRows}
          showDateFilter={true}
          showSalesmanFilter={false}
          showStatusFilter={false}
        />

        {/* Pass the aggregated results to child components */}
        <RegionalAnalysisCards data={aggregatedData as any} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RegionalAnalysisBarChart data={aggregatedData as any} />
          <RegionalAnalysisPieChart data={aggregatedData as any} />
        </div>

        <RegionalAnalysisDataTable data={aggregatedData as any} />
      </div>
    </div>
  );
}
