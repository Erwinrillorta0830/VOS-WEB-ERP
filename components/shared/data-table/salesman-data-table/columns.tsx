import {
  IconCircleCheckFilled,
  IconDotsVertical,
  IconLoader,
} from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCellViewer } from "./table-cell-viewer";
import { SalesmanPerformance } from "./types";

export const columns: ColumnDef<SalesmanPerformance>[] = [
  {
    accessorKey: "rank",
    header: "Rank",
    cell: ({ row, table }) => {
      const displayedRows = table.getRowModel().rows;
      const index = displayedRows.findIndex((r) => r.id === row.id);
      return (
        <div className="text-center text-sm text-muted-foreground">
          {index + 1}
        </div>
      );
    },
  },
  {
    accessorKey: "salesman_name",
    header: "Salesman",
    cell: ({ row, table }) => {
      const displayedRows = table.getRowModel().rows;
      const index = displayedRows.findIndex((r) => r.id === row.id);
      const rank = index + 1;
      return (
        <TableCellViewer
          item={{
            ...row.original,
            salesman_name: row.original.salesman_name,
          }}
        />
      );
    },
  },

  {
    accessorKey: "collections_count",
    header: "Collections",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.collections_count}</div>
    ),
  },
  {
    accessorKey: "customers_count",
    header: "Customers",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.customers_count}</div>
    ),
  },
  {
    accessorKey: "total_amount",
    header: "Total Amount",
    cell: ({ row }) => (
      <div className="font-medium">
        {new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
          maximumFractionDigits: 2,
        }).format(row.original.total_amount)}
      </div>
    ),
  },
  {
    accessorKey: "average_amount",
    header: "Average",
    cell: ({ row }) => (
      <div className="font-medium">
        {new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
          maximumFractionDigits: 2, // optional, e.g., ₱15,000.00
        }).format(row.original.average_amount)}
      </div>
    ),
  },
  {
    accessorKey: "percent_of_total",
    header: "% of Total",
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.percent_of_total.toFixed(1)}%
      </div>
    ),
  },
  // {
  //   id: "actions",
  //   cell: () => (
  //     <DropdownMenu>
  //       <DropdownMenuTrigger asChild>
  //         <Button
  //           variant="ghost"
  //           className="text-center data-[state=open]:bg-muted text-muted-foreground flex size-8"
  //           size="icon"
  //         >
  //           <IconDotsVertical />
  //           <span className="sr-only">Open menu</span>
  //         </Button>
  //       </DropdownMenuTrigger>
  //       <DropdownMenuContent align="end" className="w-32">
  //         <DropdownMenuItem>Edit</DropdownMenuItem>
  //         <DropdownMenuItem>Make a copy</DropdownMenuItem>
  //         <DropdownMenuItem>Favorite</DropdownMenuItem>
  //         <DropdownMenuSeparator />
  //         <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
  //       </DropdownMenuContent>
  //     </DropdownMenu>
  //   ),
  // },
];
