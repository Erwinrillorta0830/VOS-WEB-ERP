"use client";

import React, { useState } from "react";
import { useReturnLists } from "../hooks/useReturnLists";
import { CreateReturnModal } from "./CreateReturnModal";
import { ReturnDetailsModal } from "./ReturnDetailsModal";
import { ExportReportModal } from "./ExportReportModal"; // ✅ Import new modal
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Printer, // ✅ Import Printer icon
} from "lucide-react";

export function ReturnToSupplierList() {
  const { data, loading, filters, setFilters, refresh } = useReturnLists();
  const [modal, setModal] = useState({
    create: false,
    details: false,
    export: false,
  }); // ✅ Add export state
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Return to Supplier
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage returns of goods and bad stocks to suppliers
          </p>
        </div>
        <Button
          className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-10 px-4"
          onClick={() => setModal((m) => ({ ...m, create: true }))}
        >
          <Plus className="h-4 w-4 mr-2" /> Create Return to Supplier
        </Button>
      </div>

      {/* FILTERS & EXPORT */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by Return No..."
            className="pl-9 w-full bg-white border-gray-200 h-10"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />
        </div>
        <div className="flex w-full sm:w-auto">
          {/* Status Filter */}
          <div className="w-full sm:w-[150px]">
            <Select
              value={filters.status}
              onValueChange={(val: any) =>
                setFilters((prev) => ({ ...prev, status: val }))
              }
            >
              <SelectTrigger className="bg-white h-10 border-gray-200">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Posted">Posted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ✅ EXPORT BUTTON */}
          <Button
            variant="outline"
            className="bg-white border-gray-200 text-slate-700 hover:bg-slate-50 h-10 px-4"
            onClick={() => setModal((m) => ({ ...m, export: true }))}
          >
            <Printer className="w-4 h-4 mr-2 text-slate-500" />
            Export
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden min-h-[400px]">
        <Table>
          <TableHeader className="bg-gray-50 border-b border-gray-200">
            <TableRow>
              <TableHead className="font-bold text-xs uppercase text-gray-500 h-11 pl-6">
                Return No.
              </TableHead>
              <TableHead className="font-bold text-xs uppercase text-gray-500 h-11">
                Supplier
              </TableHead>
              <TableHead className="font-bold text-xs uppercase text-gray-500 h-11">
                Branch
              </TableHead>
              <TableHead className="font-bold text-xs uppercase text-gray-500 h-11">
                Return Date
              </TableHead>
              <TableHead className="font-bold text-xs uppercase text-gray-500 h-11 text-right">
                Total Amount
              </TableHead>
              <TableHead className="font-bold text-xs uppercase text-gray-500 h-11 text-center w-[100px]">
                Status
              </TableHead>
              <TableHead className="font-bold text-xs uppercase text-gray-500 h-11 text-left">
                Remarks
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading data...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-gray-500"
                >
                  No return transactions found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <TableCell
                    className="font-medium text-blue-600 cursor-pointer hover:underline text-sm pl-6"
                    onClick={() => {
                      setSelectedItem(item);
                      setModal((m) => ({ ...m, details: true }));
                    }}
                  >
                    {item.returnNo}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-900 uppercase">
                    {item.supplier}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-900 uppercase">
                    {item.branch}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(item.returnDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm font-bold text-right text-gray-900">
                    {item.totalAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-center align-middle">
                    <span
                      className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold ${
                        item.status === "Posted"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 truncate max-w-[200px] text-left">
                    {item.remarks || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <p className="text-sm text-gray-500">
          Showing {(page - 1) * itemsPerPage + 1} to{" "}
          {Math.min(page * itemsPerPage, data.length)} of {data.length} results
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
              <Button
                key={i + 1}
                variant={page === i + 1 ? "default" : "outline"}
                className={`h-8 w-8 p-0 ${
                  page === i + 1
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "text-gray-600"
                }`}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CreateReturnModal
        isOpen={modal.create}
        onClose={() => setModal((m) => ({ ...m, create: false }))}
        onReturnCreated={refresh}
      />

      <ReturnDetailsModal
        isOpen={modal.details}
        onClose={() => setModal((m) => ({ ...m, details: false }))}
        data={selectedItem}
        onUpdateSuccess={refresh}
      />

      {/* ✅ EXPORT MODAL */}
      <ExportReportModal
        isOpen={modal.export}
        onClose={() => setModal((m) => ({ ...m, export: false }))}
        allData={data} // Passing all data for filtering inside modal
      />
    </div>
  );
}
