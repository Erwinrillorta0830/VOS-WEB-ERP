"use client";

import React, { useState, useEffect } from "react";
import {
  Eye,
  Search,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// API & Types
import { ReturnToSupplierProvider } from "../providers/api";
import { ReturnToSupplier } from "../type";

// Components
import { CreateReturnModal } from "./CreateReturnModal";
import { ReturnDetailsModal } from "./ReturnDetailsModal";

export function ReturnToSupplierList() {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnToSupplier | null>(
    null,
  );

  // 1. DATA STATES
  const [data, setData] = useState<ReturnToSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. FILTER STATES
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Pending" | "Posted"
  >("All");

  // 3. PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 4. FETCH DATA FUNCTION
  const fetchReturns = async () => {
    setLoading(true);
    try {
      const result = await ReturnToSupplierProvider.getReturnTransactions(
        searchQuery,
        statusFilter,
      );
      setData(result);
      setCurrentPage(1); // Reset to page 1 on new filter
    } catch (error) {
      console.error("Failed to fetch returns", error);
    } finally {
      setLoading(false);
    }
  };

  // 5. USE EFFECT
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReturns();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  const handleViewDetails = (item: ReturnToSupplier) => {
    setSelectedReturn(item);
    setIsViewModalOpen(true);
  };

  // --- PAGINATION LOGIC ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="space-y-6">
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
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Return to Supplier
        </Button>
      </div>

      {/* FILTER SECTION */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by Return No..."
            className="pl-9 w-full bg-white border-gray-200 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-[180px]">
          <Select
            value={statusFilter}
            onValueChange={(val: any) => setStatusFilter(val)}
          >
            <SelectTrigger className="bg-white h-10 border-gray-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Posted">Posted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TABLE SECTION */}
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
              <TableHead className="font-bold text-xs uppercase text-gray-500 h-11 pl-8">
                Status
              </TableHead>
              <TableHead className="font-bold text-xs uppercase text-gray-500 h-11">
                Remarks
              </TableHead>
              <TableHead className="font-bold text-xs uppercase text-gray-500 h-11 text-center">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading data...
                  </div>
                </TableCell>
              </TableRow>
            ) : currentItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-gray-500"
                >
                  No return transactions found.
                </TableCell>
              </TableRow>
            ) : (
              currentItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <TableCell
                    className="font-medium text-blue-600 cursor-pointer hover:underline text-sm pl-6"
                    onClick={() => handleViewDetails(item)}
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
                  <TableCell className="pl-8">
                    <Badge
                      variant="secondary"
                      className={`px-2.5 py-0.5 text-xs font-medium border-0 rounded-md ${
                        item.status === "Posted"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 truncate max-w-[200px]">
                    {item.remarks || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-blue-600"
                        onClick={() => handleViewDetails(item)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
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
          Showing {indexOfFirstItem + 1} to{" "}
          {Math.min(indexOfLastItem, data.length)} of {data.length} results
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Simple logic to show first 5 pages or adjust window (simplified for brevity)
              let pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  className={`h-8 w-8 p-0 ${currentPage === pageNum ? "bg-blue-600 hover:bg-blue-700" : "text-gray-600"}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            {totalPages > 5 && (
              <span className="text-xs text-gray-400">...</span>
            )}
          </div>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ReturnDetailsModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        data={selectedReturn}
      />
      <CreateReturnModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onReturnCreated={fetchReturns}
      />
    </div>
  );
}
