"use client";

import React, { useMemo } from "react";
import { AdvancedFilter } from "@/components/advance-filter";
import { DailyCollectionCards } from "../cards/daily-collections-card";
import { DailyCollectionTrendChart } from "../charts/data-collection-trend";
import { DailyCollectionDataTable } from "../data-table/daily-collections-data-table";
import { DailyCollection } from "../data-table/daily-collections-data-table/types";
import { useFilteredData } from "@/src/app/hooks/use-filtered-data";
import { format } from "date-fns";

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
  const displayData = useFilteredData(data);

  const dynamicSummary = useMemo(() => {
    if (!displayData.length) {
      return {
        total_days: 0,
        total_collections: 0,
        total_amount: 0,
        daily_average: 0,
      };
    }
    const total_amount = displayData.reduce(
      (sum, item) => sum + item.total_amount,
      0
    );
    const total_collections = displayData.reduce(
      (sum, item) => sum + item.transactions_count,
      0
    );
    const total_days = displayData.length;

    return {
      total_days,
      total_collections,
      total_amount,
      daily_average: total_days > 0 ? total_amount / total_days : 0,
    };
  }, [displayData]);

  const dynamicTrend = useMemo(() => {
    const groups: { [key: string]: any } = {};

    displayData.forEach((item) => {
      const dateKey = format(new Date(item.date), "yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          total_amount: 0,
          transactions_count: 0,
          salesmen_count: 0,
          customers_count: 0,
          average_amount: 0,
        };
      }
      groups[dateKey].total_amount += Number(item.total_amount);
      groups[dateKey].transactions_count += item.transactions_count;
      // Add other fields as needed...
    });

    return Object.values(groups).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [displayData]);

  return (
    <div className="flex flex-1 flex-col px-4 ">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4">
          <AdvancedFilter
            filteredData={displayData}
            showDateFilter={true}
            showSalesmanFilter={false}
            showStatusFilter={false}
          />
          <DailyCollectionCards summary={dynamicSummary} />
          <DailyCollectionTrendChart data={dynamicTrend} />
          <DailyCollectionDataTable data={displayData} />
        </div>
      </div>
    </div>
  );
}
