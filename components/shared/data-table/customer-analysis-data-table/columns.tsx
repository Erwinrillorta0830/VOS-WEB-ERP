"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CustomerAnalysis } from "./types";

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

export const columns: ColumnDef<CustomerAnalysis>[] = [
  {
    accessorKey: "rank",
    header: "Rank",
    cell: ({ row }) => {
      return (
        <div className="text-center text-sm text-muted-foreground">
          {row.original.rank}
        </div>
      );
    },
  },
  {
    accessorKey: "customer_name",
    header: "Customer Name",
    cell: ({ row }) => {
      return (
        <div className="text-left font-medium">
          {row.original.customer_name}
        </div>
      );
    },
  },
  {
    accessorKey: "collections_count",
    header: "Collection Count",
    cell: ({ row }) => {
      return (
        <div className="text-left font-medium">
          {row.original.collections_count}
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
    header: "Average Amount",
    cell: ({ row }) => {
      return (
        <div className="text-left font-medium">
          {formatCurrency(row.original.average_amount)}
        </div>
      );
    },
  },
  {
    accessorKey: "last_collection_date",
    header: "Last Collection",
    cell: ({ row }) => {
      const date = new Date(row.original.last_collection_date);
      const newDate = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return <div className="text-left">{newDate}</div>;
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
];
