"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegionalAnalysis } from "./types";

export const columns: ColumnDef<RegionalAnalysis>[] = [
  {
    accessorKey: "rank",
    header: "Rank",
    cell: ({ row }) => {
      const rank = row.getValue("rank") as number;
      return <div className="text-center font-medium">{rank}</div>;
    },
  },
  {
    accessorKey: "province",
    header: "Region",
    cell: ({ row }) => {
      const province = row.getValue("province") as string;
      return <div className="font-medium">{province}</div>;
    },
  },
  {
    accessorKey: "collections_count",
    header: "Collections",
    cell: ({ row }) => {
      const count = row.getValue("collections_count") as number;
      return <div>{count.toLocaleString()}</div>;
    },
  },
  {
    accessorKey: "salesmen_count",
    header: "Salesman",
    cell: ({ row }) => {
      const count = row.getValue("salesmen_count") as number;
      return <div>{count.toLocaleString()}</div>;
    },
  },
  {
    accessorKey: "total_amount",
    header: " Total Amount",
    cell: ({ row }) => {
      const amount = row.getValue("total_amount") as number;
      const formatted = new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "average_amount",
    header: "Average",
    cell: ({ row }) => {
      const amount = row.getValue("average_amount") as number;
      const formatted = new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
      return <div>{formatted}</div>;
    },
  },
  {
    accessorKey: "percent_of_total",
    header: "% of total",
    cell: ({ row }) => {
      const percent = row.getValue("percent_of_total") as number;
      return <div>{percent.toFixed(1)}%</div>;
    },
  },
];
