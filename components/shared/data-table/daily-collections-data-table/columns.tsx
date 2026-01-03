"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DailyCollection } from "./types";

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatNumber = (num: number): string =>
  new Intl.NumberFormat("en-US").format(num);

export const columns: ColumnDef<DailyCollection>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const date = new Date(row.original.date);
      const newDate = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return <div>{newDate}</div>;
    },
  },
  {
    accessorKey: "transactions_count",
    header: "Transactions",
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          {formatNumber(row.original.transactions_count)}
        </div>
      );
    },
  },
  {
    accessorKey: "salesmen_count",
    header: "Salesmen",
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          {formatNumber(row.original.salesmen_count)}
        </div>
      );
    },
  },
  {
    accessorKey: "customers_count",
    header: "Customers",
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          {formatNumber(row.original.customers_count)}
        </div>
      );
    },
  },
  {
    accessorKey: "total_amount",
    header: "Total Amount",
    cell: ({ row }) => {
      return (
        <div className="font-medium">
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
        <div className="font-medium">
          {formatCurrency(row.original.average_amount)}
        </div>
      );
    },
  },
];
