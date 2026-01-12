"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Check } from "./types";
import { ArrowUpDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateColumnsParams {
  statusFilter: string;
  onUndoClick: (check: Check) => void;
}

export const createColumns = ({
  statusFilter,
  onUndoClick,
}: CreateColumnsParams): ColumnDef<Check>[] => {
  // Function to get display status based on current tab and payment type
  const getDisplayStatus = (row: Check) => {
    if (statusFilter === "Pending") {
      return "Pending";
    }
    if (statusFilter === "Post Dated Check" && row.payment_type === 96) {
      return "Post Dated Check";
    }
    if (statusFilter === "Dated Check" && row.payment_type === 98) {
      return "Dated Check";
    }

    return row.status;
  };

  return [
    {
      accessorKey: "date_received",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Date Received
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("date_received"));
        return (
          <div className="font-medium">
            {date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        );
      },
    },
    {
      accessorKey: "check_number",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Check Number
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <div className="font-medium">{row.getValue("check_number")}</div>
        );
      },
    },
    {
      accessorKey: "bank_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Bank
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <div className="max-w-[200px] truncate">
            {row.getValue("bank_name")}
          </div>
        );
      },
    },
    {
      accessorKey: "customer_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Customer
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const customerName = row.getValue("customer_name") as string;
        const customerCode = row.original.customer_code;
        return (
          <div>
            <div className="font-medium">{customerName}</div>
            <div className="text-xs text-muted-foreground">{customerCode}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "salesman_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Salesman
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return <div>{row.getValue("salesman_name")}</div>;
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount"));
        const formatted = new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
        }).format(amount);
        return <div className="font-medium text-right">{formatted}</div>;
      },
    },
    {
      accessorKey: "check_date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Check Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("check_date"));
        return (
          <div>
            {date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const displayStatus = getDisplayStatus(row.original);

        const statusConfig = {
          Cleared: {
            variant: "secondary" as const,
            className: "bg-blue-700 hover:bg-blue-600 text-white",
          },
          Pending: {
            variant: "secondary" as const,
            className: "bg-green-500 hover:bg-green-600 text-white",
          },
          "Post Dated Check": {
            variant: "secondary" as const,
            className: "bg-orange-500 hover:bg-orange-600 text-white",
          },
          "Dated Check": {
            variant: "secondary" as const,
            className: "bg-yellow-500 hover:bg-yellow-600 text-white",
          },
        };

        const config =
          statusConfig[displayStatus as keyof typeof statusConfig] ||
          statusConfig.Pending;

        return (
          <Badge variant={config.variant} className={config.className}>
            {displayStatus}
          </Badge>
        );
      },
    },
    {
      accessorKey: "origin_type_label",
      header: "Origin Type",
      cell: ({ row }) => {
        const typeId = row.original.origin_type;
        const apiLabel = row.original.origin_type_label;

        // Map IDs to strings if the backend didn't provide a label
        let displayLabel = apiLabel;
        if (!displayLabel) {
          if (typeId === 96) displayLabel = "Post Dated Check";
          else if (typeId === 98) displayLabel = "Dated Check";
          else displayLabel = "Original";
        }

        const isLegacy = displayLabel === "Original";

        return (
          <div
            className={`font-medium ${
              isLegacy ? "text-muted-foreground italic" : "text-foreground"
            }`}
          >
            {displayLabel}
          </div>
        );
      },
    },
    {
      accessorKey: "coa_title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Type
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <div className="text-xs text-muted-foreground max-w-[150px] truncate">
            {row.getValue("coa_title")}
          </div>
        );
      },
    },
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="mx-2"
        />
      ),
      cell: ({ row }) => {
        if (row.original.status === "Cleared") {
          return <div className="mx-2 w-4" />;
        }
        return (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="mx-2"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "actions",
      header: ({ column }) => {
        return <div className="text-center">Actions</div>;
      },
      cell: ({ row }) => {
        const data = row.original;
        const isCleared = data.is_cleared === 1;
        const hasOrigin =
          data.origin_type !== null && data.origin_type !== undefined;

        if (isCleared && hasOrigin) {
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUndoClick(data)}
              className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Undo
            </Button>
          );
        }
        return null;
      },
    },
  ];
};
