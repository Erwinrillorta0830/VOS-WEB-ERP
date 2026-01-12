// src/components/shared/contents/customer-analysis-content.tsx
"use client";

import React, { useMemo } from "react";
import { AdvancedFilter } from "@/components/advance-filter";
import { CustomerAnalysisCard } from "../cards/customer-analysis-card";
import { CustomerCollectionChart } from "../charts/customer-analysis";
import { DataTable } from "../data-table/customer-analysis-data-table";
import { useFilteredData } from "@/src/app/hooks/use-filtered-data";

export function CustomerAnalysisContent({ data }: { data: any[] }) {
  // 1. Map 'collection_date' to 'date' so the filter hook recognizes it
  const preparedData = useMemo(
    () => data.map((item) => ({ ...item, date: item.collection_date })),
    [data]
  );

  // 2. This hook listens to the AdvancedFilter state
  const filteredRows = useFilteredData(preparedData);

  // 3. Aggregate based ONLY on the filtered rows
  const { analysisData, summary } = useMemo(() => {
    const customerMap = new Map<string, any>();
    let grandTotal = 0;

    filteredRows.forEach((row) => {
      const code = row.customer_code;
      const amount = Number(row.amount) || 0;

      if (!customerMap.has(code)) {
        customerMap.set(code, {
          customer_id: row.customer_id,
          customer_name: row.customer_name,
          customer_code: code,
          is_active: row.is_active,
          collections_count: 0,
          total_amount: 0,
          last_collection_date: row.collection_date,
          unique_collection_ids: new Set(),
        });
      }

      const agg = customerMap.get(code);
      agg.total_amount += amount;
      grandTotal += amount;

      if (!agg.unique_collection_ids.has(row.collection_id)) {
        agg.unique_collection_ids.add(row.collection_id);
        agg.collections_count += 1;
      }

      if (new Date(row.collection_date) > new Date(agg.last_collection_date)) {
        agg.last_collection_date = row.collection_date;
      }
    });

    const finalData = Array.from(customerMap.values())
      .map((c) => ({
        ...c,
        total_amount: Number(c.total_amount.toFixed(2)),
        average_amount:
          c.collections_count > 0 ? c.total_amount / c.collections_count : 0,
        percent_of_total:
          grandTotal > 0 ? (c.total_amount / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .map((c, i) => ({ ...c, rank: i + 1 }));

    const summary = {
      total_customers: finalData.filter((c) => c.is_active === 1).length,
      total_customers_all: finalData.length,
      total_amount: Number(grandTotal.toFixed(2)),
      average_per_customer:
        finalData.length > 0 ? grandTotal / finalData.length : 0,
      top_customer: finalData[0] || null,
    };

    return { analysisData: finalData, summary };
  }, [filteredRows]);

  return (
    <div className="flex flex-1 flex-col px-4">
      <div className="flex flex-col gap-4 py-4">
        {/* Instant Date Range Filter */}
        <AdvancedFilter
          filteredData={filteredRows}
          showDateFilter={true}
          showSalesmanFilter={false}
          showStatusFilter={false}
        />

        <CustomerAnalysisCard summary={summary} />
        <CustomerCollectionChart data={analysisData} />
        <DataTable data={analysisData} />
      </div>
    </div>
  );
}
