import SummaryReportCard from "@/components/shared/cards/summary-report-card";
import SummaryDailyTrend from "@/components/shared/charts/summary-daily-trend";
import { SummaryReportDataTable } from "@/components/shared/data-table/summary-report-data-table";
import { SummaryPaymentMethodPie } from "@/components/shared/charts/summary-payment-method-pie";
import { AdvancedFilter } from "@/components/advance-filter";
import { ExportButton } from "@/components/export-button";
import {
  SummaryMetrics,
  DailyTrend,
  CollectionDetail,
  PaymentMethod,
} from "@/components/shared/data-table/summary-report-data-table/type";
import { exportColumns } from "@/src/app/lib/summary-report-utils";
import { useFilters } from "@/src/app/contexts/filter-context";
import React, { useMemo } from "react";
import { useFilteredData } from "@/src/app/hooks/use-filtered-data";
import { format } from "date-fns/format";
interface Salesman {
  id: number;
  salesman_name: string;
}

interface SummaryReportContentProps {
  filteredData: CollectionDetail[];
  filteredSummary: SummaryMetrics;
  dailyTrend: DailyTrend[];
  paymentMethods: PaymentMethod[];
  salesmen: Salesman[];
}

export function SummaryReportContent({
  filteredData,
  filteredSummary: initialSummary,
  dailyTrend,
  paymentMethods,
  salesmen,
}: SummaryReportContentProps) {
  const displayData = useFilteredData(filteredData);

  const dynamicSummary = useMemo(() => {
    const total_amount = displayData.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );
    const total_collections = displayData.length;

    return {
      ...initialSummary,
      total_amount,
      total_collections,
    };
  }, [displayData, initialSummary]);

  const dynamicDailyTrend = useMemo(() => {
    const groups: { [key: string]: number } = {};

    displayData.forEach((item) => {
      // Group by date (yyyy-MM-dd)
      const date = format(new Date(item.collection_date), "yyyy-MM-dd");
      groups[date] = (groups[date] || 0) + Number(item.amount);
    });

    return Object.entries(groups)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [displayData]);

  const dynamicPaymentMethods = useMemo(() => {
    const groups: { [key: string]: { count: number; amount: number } } = {};

    displayData.forEach((item) => {
      const method = item.payment_method || "Unknown";
      if (!groups[method]) {
        groups[method] = { count: 0, amount: 0 };
      }
      groups[method].amount += Number(item.amount);
      groups[method].count += 1;
    });

    return Object.entries(groups).map(([method, stats]) => ({
      method_name: method,
      amount: stats.amount,
      count: stats.count,
    })) as PaymentMethod[];
  }, [displayData]);
  return (
    <div className="flex flex-1 flex-col px-4">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4">
          {/* Advanced Filters */}
          <AdvancedFilter
            filteredData={displayData}
            salesmen={salesmen}
            showDateFilter={true}
            showSalesmanFilter={true}
            showStatusFilter={true}
          />
          {/* Summary Cards */}
          <SummaryReportCard summary={dynamicSummary} />
          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SummaryDailyTrend data={dynamicDailyTrend} />
            <SummaryPaymentMethodPie data={dynamicPaymentMethods} />
          </div>
          {/* Data Table */}
          <SummaryReportDataTable data={displayData} />
        </div>
      </div>
    </div>
  );
}
