"use client";

import React, { useEffect, useState } from "react";
import { Search, Eye, RotateCcw, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";
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
import { SalesReturn } from "../types";
import { SalesReturnProvider } from "../provider/api";

interface SalesReturnListProps {
  onView: (data: SalesReturn) => void;
}

export function SalesReturnList({ onView }: SalesReturnListProps) {
  const [data, setData] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Search State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState(""); // Input value
  const [activeSearch, setActiveSearch] = useState(""); // Value actually used for fetching
  
  const ITEMS_PER_PAGE = 10;

  const loadData = async (page: number, search: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ Pass search term to provider
      const result = await SalesReturnProvider.getInvoices(page, ITEMS_PER_PAGE, search);
      
      setData(result.data);
      setTotalPages(Math.ceil(result.total / ITEMS_PER_PAGE));
      
    } catch (err: any) {
      console.error("Fetch failed:", err);
      setError("Failed to fetch data. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  // Reload when page OR activeSearch changes
  useEffect(() => {
    loadData(currentPage, activeSearch);
  }, [currentPage, activeSearch]);

  // Handle Search Trigger
  const handleSearch = () => {
    setCurrentPage(1); // Reset to page 1 on new search
    setActiveSearch(searchTerm); // Trigger the effect
  };

  // Handle Enter Key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  // Handle Clear Search
  const handleClear = () => {
    setSearchTerm("");
    setActiveSearch("");
    setCurrentPage(1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Sales Invoices</h1>
          <p className="text-sm text-muted-foreground">Select an invoice to return</p>
        </div>
        
        {/* ✅ SEARCH BAR SECTION */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Invoice or Customer..."
              className="pl-9 pr-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {searchTerm && (
              <button 
                onClick={handleClear}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
            Search
          </Button>
          <Button variant="outline" size="icon" onClick={() => loadData(currentPage, activeSearch)}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm bg-red-50 text-red-600 rounded-md border border-red-100">
          {error}
        </div>
      )}

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[150px]">Invoice No.</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex justify-center items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading data...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  {activeSearch ? `No results found for "${activeSearch}"` : "No invoices found."}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.invoiceNo} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-blue-600">{row.invoiceNo}</TableCell>
                  <TableCell>{row.customer}</TableCell>
                  <TableCell>{row.returnDate}</TableCell>
                  <TableCell className="font-medium">
                    ₱{row.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.status === "Received" ? "default" : "secondary"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(row)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* PAGINATION CONTROLS */}
        {!loading && data.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t bg-gray-50/50">
            <div className="text-sm text-muted-foreground">
              Page <strong>{currentPage}</strong> of <strong>{totalPages || 1}</strong>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrev} 
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNext} 
                disabled={currentPage >= totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}