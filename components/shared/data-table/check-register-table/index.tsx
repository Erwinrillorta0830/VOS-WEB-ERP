// src/components/check-register-data-table/index.tsx
"use client";

import * as React from "react";
import {
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  RowSelectionState,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TablePagination } from "./table-pagination";
import { createColumns } from "./column";
import { Check } from "./types";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

interface DataTableProps {
  data: Check[];
  onDataRefresh?: () => void;
}

export function CheckRegisterDataTable({
  data,
  onDataRefresh,
}: DataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);

  // Filter data based on active tab
  const filteredData = React.useMemo(() => {
    if (statusFilter === "all") return data;

    if (statusFilter === "Pending") {
      return data.filter(
        (row) =>
          row.status === "Pending" ||
          row.status === "Post Dated Check" ||
          row.status === "Dated Check"
      );
    }

    if (statusFilter === "Post Dated Check") {
      return data.filter((row) => row.payment_type === 96);
    }

    if (statusFilter === "Dated Check") {
      return data.filter((row) => row.payment_type === 98);
    }

    return data.filter((row) => row.status === statusFilter);
  }, [data, statusFilter]);

  const handleUndoCheck = async (check: Check) => {
    if (!check.origin_type) {
      toast.error("Original status unknown. Cannot undo.");
      return;
    }

    try {
      const response = await fetch("/api/check-register", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "undo",
          updates: [{ id: check.id, previous_type: check.origin_type }],
        }),
      });

      if (!response.ok) throw new Error("Undo failed");

      toast.success("Check restored to pending");
      if (onDataRefresh) onDataRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Create columns
  const columns = React.useMemo(
    () =>
      createColumns({
        statusFilter,
        onUndoClick: handleUndoCheck,
      }),
    [statusFilter]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    enableRowSelection: (row) => row.original.status !== "Cleared",
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Calculate info for the selected checks
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedTotalAmount = selectedRows.reduce(
    (sum, row) => sum + row.original.amount,
    0
  );

  const handleBulkClear = async () => {
    if (selectedCount === 0) return;
    setIsClearing(true);

    try {
      const updates = selectedRows.map((row) => ({
        id: row.original.id,
        previous_type: row.original.payment_type,
      }));

      const response = await fetch("/api/check-register", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clear",
          updates: updates,
        }),
      });

      if (!response.ok) throw new Error("Failed to clear selected checks");

      toast.success(`Successfully cleared ${selectedCount} check(s)`);
      setRowSelection({}); // Clear checkboxes
      if (onDataRefresh) onDataRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to clear checks");
    } finally {
      setIsClearing(false);
      setShowConfirmDialog(false);
    }
  };

  const totalAmount = filteredData.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-4">
      <Tabs
        value={statusFilter}
        onValueChange={setStatusFilter}
        className="w-full"
      >
        <div className="text-lg font-semibold">Check Register Details</div>

        <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[1fr_500px] items-start sm:items-center justify-between gap-2">
          <div className="w-30 sm:hidden">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Checks</SelectItem>
                <SelectItem value="Cleared">Cleared</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Post Dated Check">
                  Post Dated Check
                </SelectItem>
                <SelectItem value="Dated Check">Dated Check</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsList className="hidden sm:flex">
            <TabsTrigger value="all">All Checks</TabsTrigger>
            <TabsTrigger value="Cleared">Cleared</TabsTrigger>
            <TabsTrigger value="Pending">Pending</TabsTrigger>
            <TabsTrigger value="Post Dated Check">Post Dated Check</TabsTrigger>
            <TabsTrigger value="Dated Check">Dated Check</TabsTrigger>
          </TabsList>

          <Input
            placeholder="Search by customer name..."
            value={
              (table.getColumn("customer_name")?.getFilterValue() as string) ??
              ""
            }
            onChange={(event) =>
              table
                .getColumn("customer_name")
                ?.setFilterValue(event.target.value)
            }
            className="max-w-full"
          />
        </div>

        {/* BULK ACTION TOOLBAR - SHADCN STYLE */}
        {selectedCount > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border rounded-lg bg-muted/50 animate-in fade-in slide-in-from-bottom-1">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {selectedCount}
                </span>
                <span className="text-muted-foreground">Checks selected</span>
              </div>
              <div className="h-4 w-[1px] bg-border" /> {/* Separator */}
              <div className="text-sm font-semibold">
                Total:{" "}
                {new Intl.NumberFormat("en-PH", {
                  style: "currency",
                  currency: "PHP",
                }).format(selectedTotalAmount)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRowSelection({})}
                className="h-8 text-xs"
              >
                Clear Selection
              </Button>
              <Button
                size="sm"
                onClick={() => setShowConfirmDialog(true)}
                className="h-8 text-xs bg-primary hover:bg-primary/90"
              >
                Clear Selected
              </Button>
            </div>
          </div>
        )}

        <TabsContent
          value={statusFilter}
          className="relative flex flex-col gap-4 overflow-auto"
        >
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-4">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No checks found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell
                    colSpan={columns.length - 4}
                    className="font-semibold"
                  >
                    Total Amount
                  </TableCell>
                  <TableCell className="font-semibold text-right">
                    {new Intl.NumberFormat("en-PH", {
                      style: "currency",
                      currency: "PHP",
                    }).format(totalAmount)}
                  </TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
          <TablePagination table={table} />
        </TabsContent>
      </Tabs>

      {/* MULTI-CHECK CONFIRMATION DIALOG */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Clear {selectedCount} Selected Checks?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>You are about to move these checks to "Cleared" status.</p>

              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-[150px] overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-muted-foreground text-[10px] uppercase">
                      <th className="text-left py-1">Check #</th>
                      <th className="text-right py-1">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRows.map((row) => (
                      <tr
                        key={row.original.id}
                        className="border-b last:border-0"
                      >
                        <td className="py-1">{row.original.check_number}</td>
                        <td className="text-right py-1 font-mono">
                          {row.original.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2 font-semibold text-foreground">
                <span>Total Clearing:</span>
                <span className="text-blue-600">
                  {new Intl.NumberFormat("en-PH", {
                    style: "currency",
                    currency: "PHP",
                  }).format(selectedTotalAmount)}
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkClear();
              }}
              disabled={isClearing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Clearing"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
