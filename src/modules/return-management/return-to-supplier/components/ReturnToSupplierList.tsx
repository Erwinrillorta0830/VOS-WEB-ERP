"use client";

import React, { useState, useMemo } from "react";
import { useReturnLists } from "../hooks/useReturnLists";
import { CreateReturnModal } from "./CreateReturnModal";
import { ReturnDetailsModal } from "./ReturnDetailsModal";
import { ExportReportModal } from "./ExportReportModal";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Printer,
  Check,
  ChevronsUpDown,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ReturnToSupplierList() {
  const { data, loading, refresh } = useReturnLists();

  // ✅ Local State for Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("All");
  const [filterBranch, setFilterBranch] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // ✅ Combobox Open States
  const [openSupplier, setOpenSupplier] = useState(false);
  const [openBranch, setOpenBranch] = useState(false);

  const [modal, setModal] = useState({
    create: false,
    details: false,
    export: false,
  });
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // ✅ EXTRACT UNIQUE OPTIONS (Entire List)
  const uniqueSuppliers = useMemo(() => {
    const suppliers = data.map((item) => item.supplier).filter(Boolean);
    return Array.from(new Set(suppliers)).sort();
  }, [data]);

  const uniqueBranches = useMemo(() => {
    const branches = data.map((item) => item.branch).filter(Boolean);
    return Array.from(new Set(branches)).sort();
  }, [data]);

  // ✅ STRICT FILTERING LOGIC
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Strict Search Filter (Return No OR Supplier OR Branch)
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        item.returnNo.toLowerCase().includes(query) ||
        item.supplier.toLowerCase().includes(query) ||
        item.branch.toLowerCase().includes(query);

      // 2. Dropdown Filters (Strict AND Logic)
      const matchesSupplier =
        filterSupplier === "All" || item.supplier === filterSupplier;
      const matchesBranch =
        filterBranch === "All" || item.branch === filterBranch;
      const matchesStatus =
        filterStatus === "All" || item.status === filterStatus;

      return matchesSearch && matchesSupplier && matchesBranch && matchesStatus;
    });
  }, [data, searchQuery, filterSupplier, filterBranch, filterStatus]);

  // ✅ PAGINATION
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  // Helper to reset pagination when filters change
  const handleFilterChange = (setter: any, value: string) => {
    setter(value);
    setPage(1);
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

      <div className="space-y-4">
        {/* ✅ ROW 1: GLOBAL SEARCH & EXPORT */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search return #, supplier, or branch..."
              className="pl-9 w-full bg-white border-gray-200 h-10 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) =>
                handleFilterChange(setSearchQuery, e.target.value)
              }
            />
          </div>
          <Button
            variant="outline"
            className="bg-white border-gray-200 text-slate-700 hover:bg-slate-50 h-10 px-4 shadow-sm"
            onClick={() => setModal((m) => ({ ...m, export: true }))}
          >
            <Printer className="w-4 h-4 mr-2 text-slate-500" />
            Export to Summary Report
          </Button>
        </div>

        {/* ✅ ROW 2: DETAILED FILTERS (Supplier, Branch, Status) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
          {/* Supplier Filter (Searchable Combobox) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              Supplier
            </label>
            <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between bg-slate-50 border-gray-200 hover:bg-slate-100 hover:text-slate-900 h-10"
                >
                  <span className="truncate">
                    {filterSupplier === "All"
                      ? "All Suppliers"
                      : filterSupplier}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-(--radix-popover-trigger-width) p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search supplier..." />
                  <CommandList>
                    <CommandEmpty>No supplier found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="All"
                        onSelect={() => {
                          handleFilterChange(setFilterSupplier, "All");
                          setOpenSupplier(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filterSupplier === "All"
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        All Suppliers
                      </CommandItem>
                      {uniqueSuppliers.map((s) => (
                        <CommandItem
                          key={s}
                          value={s}
                          onSelect={() => {
                            handleFilterChange(setFilterSupplier, s);
                            setOpenSupplier(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filterSupplier === s
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {s}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Branch Filter (Searchable Combobox) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              Branch
            </label>
            <Popover open={openBranch} onOpenChange={setOpenBranch}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between bg-slate-50 border-gray-200 hover:bg-slate-100 hover:text-slate-900 h-10"
                >
                  <span className="truncate">
                    {filterBranch === "All" ? "All Branches" : filterBranch}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-(--radix-popover-trigger-width) p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search branch..." />
                  <CommandList>
                    <CommandEmpty>No branch found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="All"
                        onSelect={() => {
                          handleFilterChange(setFilterBranch, "All");
                          setOpenBranch(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filterBranch === "All"
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        All Branches
                      </CommandItem>
                      {uniqueBranches.map((b) => (
                        <CommandItem
                          key={b}
                          value={b}
                          onSelect={() => {
                            handleFilterChange(setFilterBranch, b);
                            setOpenBranch(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filterBranch === b ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {b}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              Status
            </label>
            <Select
              value={filterStatus}
              onValueChange={(val) => handleFilterChange(setFilterStatus, val)}
            >
              <SelectTrigger className="w-full bg-slate-50 border-gray-200 hover:bg-slate-100 h-10">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Posted">Posted</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                  className="h-64 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="h-8 w-8 text-slate-300" />
                    <p className="font-medium text-slate-600">
                      No records found
                    </p>
                    <p className="text-xs text-slate-400">
                      Try adjusting your filters or search query.
                    </p>
                    <Button
                      variant="link"
                      onClick={() => {
                        setSearchQuery("");
                        setFilterSupplier("All");
                        setFilterBranch("All");
                        setFilterStatus("All");
                        setPage(1);
                      }}
                      className="text-blue-600 h-auto p-0"
                    >
                      Clear all filters
                    </Button>
                  </div>
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
          {Math.min(page * itemsPerPage, filteredData.length)} of{" "}
          {filteredData.length} results
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

      <ExportReportModal
        isOpen={modal.export}
        onClose={() => setModal((m) => ({ ...m, export: false }))}
        allData={data}
      />
    </div>
  );
}
