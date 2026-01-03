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
import React from "react";
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
  filteredSummary,
  dailyTrend,
  paymentMethods,
  salesmen,
}: SummaryReportContentProps) {
  const { filters } = useFilters();

  const filteredCollectionData = React.useMemo(() => {
    return filteredData.filter((item) => {
      // Date filter
      const matchesDate =
        (!filters.dateFrom ||
          new Date(item.collection_date) >= new Date(filters.dateFrom)) &&
        (!filters.dateTo ||
          new Date(item.collection_date) <= new Date(filters.dateTo));

      // Status filter
      const matchesStatus =
        filters.status === "all" ||
        item.status === (filters.status === "posted" ? "Posted" : "Unposted");

      // Salesman filter
      const matchesSalesman =
        filters.salesmanId === null || item.salesman_id === filters.salesmanId;

      return matchesDate && matchesStatus && matchesSalesman;
    });
  }, [filteredData, filters]);
  return (
    <div className="flex flex-1 flex-col px-4">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4">
          {/* Advanced Filters */}
          <AdvancedFilter
            filteredData={filteredCollectionData}
            salesmen={salesmen}
            showDateFilter={true}
            showSalesmanFilter={true}
            showStatusFilter={true}
          />

          {/* Summary Cards */}
          <SummaryReportCard summary={filteredSummary} />

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SummaryDailyTrend data={dailyTrend} />
            <SummaryPaymentMethodPie data={paymentMethods} />
          </div>

          {/* Data Table */}
          <SummaryReportDataTable data={filteredCollectionData} />
        </div>
      </div>
    </div>
  );
}
