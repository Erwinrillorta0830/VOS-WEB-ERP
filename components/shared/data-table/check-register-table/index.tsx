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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TablePagination } from "./table-pagination";
import { createColumns } from "./column";
import { Check } from "./types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);
  const [selectedCheck, setSelectedCheck] = React.useState<Check | null>(null);

  // Filter data based on active tab
  // src/components/check-register-data-table/index.tsx

  const filteredData = React.useMemo(() => {
    if (statusFilter === "all") return data;

    if (statusFilter === "Pending") {
      // UPDATED: Now looks for both specific strings sent by the route
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

  // Handle checkbox click - immediately show dialog
  const handleCheckboxClick = React.useCallback((check: Check) => {
    setSelectedCheck(check);
    setShowConfirmDialog(true);
  }, []);

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
  const handleClearCheck = async () => {
    if (!selectedCheck) return;

    setIsClearing(true);

    try {
      const response = await fetch("/api/check-register", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "clear",
          updates: [
            {
              id: selectedCheck.id,
              previous_type: selectedCheck.payment_type,
            },
          ],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to clear check");
      }

      // Success
      toast.success("Successfully cleared the check");

      // Refresh data
      if (onDataRefresh) {
        onDataRefresh();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to clear check");
    } finally {
      setIsClearing(false);
      setShowConfirmDialog(false);
      setSelectedCheck(null);
    }
  };

  // Create columns with current statusFilter context and checkbox handler
  const columns = React.useMemo(
    () =>
      createColumns({
        statusFilter,
        onCheckboxClick: handleCheckboxClick,
        onUndoClick: handleUndoCheck,
      }),
    [statusFilter, handleCheckboxClick, handleUndoCheck]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
  });

  const totalAmount = filteredData.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-4">
      <Tabs
        value={statusFilter}
        onValueChange={setStatusFilter}
        className="w-full"
      >
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
            className="max-w-full "
          />
        </div>

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
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
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
                  <TableCell colSpan={7} className="font-semibold">
                    Total
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

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear This Check?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this check as cleared?
              <br />
              <br />
              <strong>Check Number:</strong> {selectedCheck?.check_number}
              <br />
              <strong>Customer:</strong> {selectedCheck?.customer_name}
              <br />
              <strong>Amount:</strong>{" "}
              {selectedCheck &&
                new Intl.NumberFormat("en-PH", {
                  style: "currency",
                  currency: "PHP",
                }).format(selectedCheck.amount)}
              <br />
              <br />
              This will change the status to "Cleared" and update the type to
              Cash on Bank.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearCheck}
              disabled={isClearing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
