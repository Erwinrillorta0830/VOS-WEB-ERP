// src/components/shared/contents/payment-method-content.tsx
"use client";

import React, { useMemo } from "react";
import { AdvancedFilter } from "@/components/advance-filter";
import PaymentMethodCards from "../cards/payment-method-card";
import { PaymentMethodChart } from "../charts/payment-method-bar";
import { PaymentMethodPieChart } from "../charts/payment-method-pie";
import { DataTable } from "../data-table/payment-methods-data-table";
import { useFilteredData } from "@/src/app/hooks/use-filtered-data";

export function PaymentMethodContent({ data }: { data: any[] }) {
  // 1. Client-side Filter
  const filteredTransactions = useFilteredData(data);

  // 2. Dynamic Aggregation
  const aggregatedData = useMemo(() => {
    const methodMap = new Map<string, any>();

    filteredTransactions.forEach((tx: any) => {
      const key = tx.method_key;
      if (!methodMap.has(key)) {
        methodMap.set(key, {
          method_key: key,
          method_name: tx.method_name,
          total_amount: 0,
          transactions_count: 0,
        });
      }

      const agg = methodMap.get(key);
      agg.total_amount += Number(tx.amount) || 0;
      agg.transactions_count += 1;
    });

    const grandTotalAmount = Array.from(methodMap.values()).reduce(
      (sum, m) => sum + m.total_amount,
      0
    );
    const grandTotalCount = Array.from(methodMap.values()).reduce(
      (sum, m) => sum + m.transactions_count,
      0
    );

    return Array.from(methodMap.values())
      .map((m) => ({
        ...m,
        average_amount:
          m.transactions_count > 0 ? m.total_amount / m.transactions_count : 0,
        percent_of_total:
          grandTotalAmount > 0 ? (m.total_amount / grandTotalAmount) * 100 : 0,
        percent_of_transactions:
          grandTotalCount > 0
            ? (m.transactions_count / grandTotalCount) * 100
            : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount);
  }, [filteredTransactions]);

  return (
    <div className="flex flex-1 flex-col px-4">
      <div className="flex flex-col gap-4 py-4">
        <AdvancedFilter
          filteredData={filteredTransactions}
          showDateFilter={true}
          showSalesmanFilter={false}
          showStatusFilter={false}
        />
        {/* Pass the dynamic data to all sub-components */}
        <PaymentMethodCards data={aggregatedData} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PaymentMethodChart data={aggregatedData} />
          <PaymentMethodPieChart data={aggregatedData} />
        </div>
        <DataTable data={aggregatedData} />
      </div>
    </div>
  );
}
