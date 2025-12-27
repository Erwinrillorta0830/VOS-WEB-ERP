"use client";

import { ColumnDef } from "@tanstack/react-table";
import { PaymentMethodPerformance } from "./types";

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatNumber = (num: number): string =>
  new Intl.NumberFormat("en-US").format(num);

const formatPercent = (percent: number): string => `${percent.toFixed(2)}%`;

export const columns: ColumnDef<PaymentMethodPerformance>[] = [
  {
    accessorKey: "method_name",
    header: "Payment Method",
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          <div>{row.original.method_name}</div>
          {row.original.method_id !== null}
        </div>
      );
    },
  },
  {
    accessorKey: "transactions_count",
    header: "Transactions",
    cell: ({ row }) => {
      return (
        <div className="text-left font-medium">
          {formatNumber(row.original.transactions_count)}
        </div>
      );
    },
  },
  {
    accessorKey: "total_amount",
    header: "Total Amount",
    cell: ({ row }) => {
      return (
        <div className="text-left font-medium">
          {formatCurrency(row.original.total_amount)}
        </div>
      );
    },
  },
  {
    accessorKey: "average_amount",
    header: "Average",
    cell: ({ row }) => {
      return (
        <div className="text-left font-medium">
          {formatCurrency(row.original.average_amount)}
        </div>
      );
    },
  },
  {
    accessorKey: "percent_of_total",
    header: "% of Total",
    cell: ({ row }) => {
      return (
        <div className="text-left font-medium">
          {formatPercent(row.original.percent_of_total)}
        </div>
      );
    },
  },
  {
    accessorKey: "percent_of_transactions",
    header: "% of Transactions",
    cell: ({ row }) => {
      return (
        <div className="text-left font-medium">
          {formatPercent(row.original.percent_of_transactions)}
        </div>
      );
    },
  },
];
