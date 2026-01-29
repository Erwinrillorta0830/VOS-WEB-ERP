"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  ChevronDown,
  Printer,
  Trash2,
  Plus,
  Search,
  AlertTriangle,
  Link as LinkIcon,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import { SalesReturnProvider } from "../provider/api";
import {
  SalesReturn,
  SalesReturnItem,
  API_LineDiscount,
  API_SalesReturnType,
  SalesReturnStatusCard,
  InvoiceOption,
} from "../type";
import { cn } from "@/lib/utils";

import { CreateSalesReturnModal } from "./CreateSalesReturnModal";
import { ProductLookupModal } from "./ProductLookupModal";
import { useReactToPrint } from "react-to-print";
import { SalesReturnPrintSlip } from "./SalesReturnPrintSlip";

const ReadOnlyField = ({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | number | undefined;
  className?: string;
}) => (
  <div className={cn("space-y-1.5", className)}>
    <Label className="text-xs uppercase tracking-wide font-bold text-slate-500">
      {label}
    </Label>
    <div className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-800 shadow-sm">
      {value || "-"}
    </div>
  </div>
);

export function SalesReturnHistory() {
  const [data, setData] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);

  // Options
  const [salesmenOptions, setSalesmenOptions] = useState<
    { value: string; label: string; branch?: string; code?: string }[]
  >([]);
  const [customerOptions, setCustomerOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [discountOptions, setDiscountOptions] = useState<API_LineDiscount[]>(
    [],
  );
  const [returnTypeOptions, setReturnTypeOptions] = useState<
    API_SalesReturnType[]
  >([]);

  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSalesman, setSelectedSalesman] = useState("All");
  const [selectedCustomer, setSelectedCustomer] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Search State
  const [globalSearch, setGlobalSearch] = useState("");
  const [salesmanSearch, setSalesmanSearch] = useState("All Salesmen");
  const [isSalesmanOpen, setSalesmanOpen] = useState(false);
  const salesmanWrapperRef = useRef<HTMLDivElement>(null);
  const [customerSearch, setCustomerSearch] = useState("All Customers");
  const [isCustomerOpen, setCustomerOpen] = useState(false);
  const customerWrapperRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 10;

  // Detail Modal State
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(
    null,
  );
  const [details, setDetails] = useState<SalesReturnItem[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [statusCardData, setStatusCardData] =
    useState<SalesReturnStatusCard | null>(null);

  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([]);
  const [isInvoiceLookupOpen, setIsInvoiceLookupOpen] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);

  // Product Lookup State
  const [isProductLookupOpen, setIsProductLookupOpen] = useState(false);

  const isEditable = selectedReturn?.status === "Pending";
  const printComponentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: `Return-Slip-${selectedReturn?.returnNo || "Draft"}`,
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [salesmen, customers, discounts, retTypes] = await Promise.all([
          SalesReturnProvider.getSalesmenList(),
          SalesReturnProvider.getCustomersList(),
          SalesReturnProvider.getLineDiscounts(),
          SalesReturnProvider.getSalesReturnTypes(),
        ]);
        setSalesmenOptions(salesmen);
        setCustomerOptions(customers);
        setDiscountOptions(discounts);
        setReturnTypeOptions(retTypes);
      } catch (error) {
        console.error("Error loading filter options", error);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        salesmanWrapperRef.current &&
        !salesmanWrapperRef.current.contains(target)
      ) {
        setSalesmanOpen(false);
        if (selectedSalesman === "All") setSalesmanSearch("All Salesmen");
        else {
          const found = salesmenOptions.find(
            (s) => s.value === selectedSalesman,
          );
          setSalesmanSearch(found ? found.label : "All Salesmen");
        }
      }
      if (
        customerWrapperRef.current &&
        !customerWrapperRef.current.contains(target)
      ) {
        setCustomerOpen(false);
        if (selectedCustomer === "All") setCustomerSearch("All Customers");
        else {
          const found = customerOptions.find(
            (c) => c.value === selectedCustomer,
          );
          setCustomerSearch(found ? found.label : "All Customers");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedSalesman, salesmenOptions, selectedCustomer, customerOptions]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const filters = {
        salesman: selectedSalesman,
        customer: selectedCustomer,
        status: selectedStatus,
      };
      const result = await SalesReturnProvider.getReturns(
        currentPage,
        ITEMS_PER_PAGE,
        globalSearch,
        filters,
      );
      setData(result.data);
      setTotalPages(Math.max(1, Math.ceil(result.total / ITEMS_PER_PAGE)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [
    currentPage,
    selectedSalesman,
    selectedCustomer,
    selectedStatus,
    globalSearch,
  ]);

  const handleSelectSalesman = (value: string, label: string) => {
    setSelectedSalesman(value);
    setSalesmanSearch(label);
    setSalesmanOpen(false);
    setCurrentPage(1);
  };

  const handleSelectCustomer = (value: string, label: string) => {
    setSelectedCustomer(value);
    setCustomerSearch(label);
    setCustomerOpen(false);
    setCurrentPage(1);
  };

  const handleStatusChange = (val: string) => {
    setSelectedStatus(val);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSelectedSalesman("All");
    setSalesmanSearch("All Salesmen");
    setSelectedCustomer("All");
    setCustomerSearch("All Customers");
    setSelectedStatus("All");
    setGlobalSearch("");
    setCurrentPage(1);
  };

  const handleViewDetails = async (record: SalesReturn) => {
    try {
      setSelectedReturn(record);
      setDetailsLoading(true);
      setStatusCardData(null);

      // 🟢 DEBUG: Check what we are sending
      // console.log("Fetching invoices for:", record.customerCode);

      const [items, statusData, invoices] = await Promise.all([
        SalesReturnProvider.getProductsSummary(record.id, record.returnNo),
        SalesReturnProvider.getStatusCardData(record.id),
        // 🟢 Pass the customer code to the API
        SalesReturnProvider.getInvoiceReturnList(record.customerCode),
      ]);

      setDetails(items);
      setStatusCardData(statusData);
      setInvoiceOptions(invoices);
    } catch (e) {
      console.error("Error loading details:", e);
      setDetails([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDetailChange = (index: number, field: string, value: any) => {
    setDetails((prev) => {
      const newDetails = [...prev];
      const item = { ...newDetails[index], [field]: value };

      if (field === "discountType") {
        if (value === "No Discount" || !value) {
          item.discountAmount = 0;
        } else {
          const selectedDisc = discountOptions.find(
            (d) => d.id.toString() === value,
          );
          if (selectedDisc) {
            const percentage = parseFloat(selectedDisc.percentage);
            const gross =
              Number(item.quantity || 0) * Number(item.unitPrice || 0);
            item.discountAmount = gross * (percentage / 100);
          }
        }
      }

      const qty = Number(item.quantity || 0);
      const price = Number(item.unitPrice || 0);
      const disc = Number(item.discountAmount || 0);

      item.grossAmount = qty * price;
      item.totalAmount = qty * price - disc;

      newDetails[index] = item;
      return newDetails;
    });
  };

  const handleDeleteRow = (index: number) => {
    setDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddProductsToEdit = (newItems: any[]) => {
    if (!newItems || newItems.length === 0) return;

    const formattedItems = newItems.map((item, index) => {
      const price = Number(item.unitPrice) || Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      const gross = price * qty;
      const discAmt = Number(item.discountAmount) || 0;

      return {
        id: `added-${Date.now()}-${index}-${Math.floor(Math.random() * 10000)}`,
        productId: item.productId || item.product_id || item.id,
        code: item.code || "N/A",
        description: item.description || item.product_name || "Unknown Item",
        unit: item.unit || "Pcs",
        quantity: qty,
        unitPrice: price,
        grossAmount: gross,
        discountType: item.discountType || null,
        discountAmount: discAmt,
        totalAmount: gross - discAmt,
        reason: item.reason || "",
        returnType: item.returnType || "",
      };
    });

    setDetails((prev) => [...prev, ...formattedItems]);
    setIsProductLookupOpen(false);
  };

  const handleUpdateReturn = async () => {
    if (!selectedReturn) return;

    const hasIncompleteItems = details.some(
      (item) => !item.reason || !item.returnType,
    );
    if (hasIncompleteItems) {
      alert(
        "Please enter a 'Reason' and select a 'Return Type' for all added items before saving.",
      );
      return;
    }

    try {
      const payload = {
        returnId: selectedReturn.id,
        returnNo: selectedReturn.returnNo,
        items: details,
        remarks: selectedReturn.remarks || "",
        invoiceNo: selectedReturn.invoiceNo,
        orderNo: selectedReturn.orderNo,
        isThirdParty: selectedReturn.isThirdParty,
      };

      const serverResult = await SalesReturnProvider.updateReturn(payload);

      const newTotal =
        parseFloat(serverResult.total_amount) ||
        details.reduce((acc, item) => acc + (item.totalAmount || 0), 0);
      const is3rdParty =
        serverResult.is_third_party === 1 ||
        serverResult.is_third_party === true;

      setData((prevData) =>
        prevData.map((row) =>
          row.id === selectedReturn.id
            ? {
                ...row,
                totalAmount: newTotal,
                remarks: serverResult.remarks || selectedReturn.remarks,
                invoiceNo: serverResult.invoice_no || selectedReturn.invoiceNo,
                orderNo:
                  serverResult.order_id ||
                  selectedReturn.orderNo ||
                  row.orderNo,
                isThirdParty: is3rdParty,
              }
            : row,
        ),
      );

      alert("Sales Return Updated Successfully!");
      setSelectedReturn(null);
      loadHistory();
    } catch (error) {
      console.error("Update failed", error);
      alert("Failed to update sales return.");
    }
  };

  const handleReceiveClick = () => setConfirmOpen(true);

  // REVISION 2: Ensure Received checkbox updates immediately
  const handleConfirmReceive = async () => {
    if (!selectedReturn) return;
    try {
      setIsReceiving(true);
      await SalesReturnProvider.updateStatus(selectedReturn.id, "Received");

      // Update local list
      setData((prev) =>
        prev.map((r) =>
          r.id === selectedReturn.id ? { ...r, status: "Received" } : r,
        ),
      );

      // Update selected return to reflect received status
      setSelectedReturn({ ...selectedReturn, status: "Received" });

      // Update status card data immediately so checkbox checks off
      setStatusCardData((prev) =>
        prev
          ? {
              ...prev,
              isReceived: true,
              transactionStatus: "Received",
            }
          : null,
      );

      setConfirmOpen(false);
    } catch (error: any) {
      console.error("Receive Error:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setIsReceiving(false);
    }
  };

  const handleSelectInvoice = (invoiceNo: string) => {
    if (selectedReturn) {
      setSelectedReturn({ ...selectedReturn, invoiceNo });
    }
    setIsInvoiceLookupOpen(false);
  };

  // Helpers
  const getSalesmanName = (id: any) =>
    salesmenOptions.find((opt) => String(opt.value) === String(id))?.label ||
    id ||
    "-";
  const getSalesmanCode = (id: any) => {
    const found = salesmenOptions.find(
      (opt) => String(opt.value) === String(id),
    );
    return found ? found.code || found.value : id || "-";
  };
  const getSalesmanBranch = (id: any) =>
    salesmenOptions.find((opt) => String(opt.value) === String(id))?.branch ||
    "N/A";
  const getCustomerName = (code: any) =>
    customerOptions.find((opt) => String(opt.value) === String(code))?.label ||
    code ||
    "-";

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "received":
        return "bg-green-50 text-green-700 border-green-200 hover:bg-green-100";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      if (currentPage <= 3) pageNumbers.push(1, 2, 3, "...", totalPages);
      else if (currentPage >= totalPages - 2)
        pageNumbers.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      else
        pageNumbers.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages,
        );
    }
    return pageNumbers;
  };

  const filteredSalesmen = salesmenOptions.filter(
    (s) =>
      s.label.toLowerCase().includes(salesmanSearch.toLowerCase()) &&
      salesmanSearch !== "All Salesmen",
  );
  const filteredCustomers = customerOptions.filter(
    (c) =>
      c.label.toLowerCase().includes(customerSearch.toLowerCase()) &&
      customerSearch !== "All Customers",
  );
  // 🟢 UPDATE: Simplified Filter
  // The API has already filtered by Customer. We only filter by the search box here.
  const filteredInvoices = invoiceOptions.filter((inv) =>
    inv.invoice_no.toLowerCase().includes(invoiceSearch.toLowerCase()),
  );

  return (
    <div className="space-y-6 p-4 md:p-8 w-full max-w-[100vw] overflow-x-hidden bg-slate-50 min-h-screen">
      {/* ... Header and Filters sections ... */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
            Sales Returns
          </h2>
          <p className="text-slate-500">Manage customer product returns</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition-all active:scale-95"
        >
          <Plus className="h-5 w-5 mr-2" /> Add New Sales Return
        </Button>
      </div>

      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by return number, salesman, or customer..."
          className="h-11 w-full pl-10 pr-4 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm"
          value={globalSearch}
          onChange={(e) => {
            setGlobalSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* FILTERS UI Hidden for Brevity (Same as before) */}
      <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
          {/* Salesman */}
          <div className="space-y-1.5 relative" ref={salesmanWrapperRef}>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Salesman
            </label>
            <div className="relative">
              <input
                type="text"
                className="h-10 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm pl-3 pr-8 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium"
                value={salesmanSearch}
                onChange={(e) => {
                  setSalesmanSearch(e.target.value);
                  setSalesmanOpen(true);
                }}
                onFocus={() => {
                  setSalesmanOpen(true);
                  if (salesmanSearch === "All Salesmen") setSalesmanSearch("");
                }}
              />
              <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {isSalesmanOpen && (
              <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto ring-1 ring-slate-200">
                <div
                  className={cn(
                    "px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50",
                    selectedSalesman === "All" &&
                      "bg-blue-50 text-blue-700 font-medium",
                  )}
                  onClick={() => handleSelectSalesman("All", "All Salesmen")}
                >
                  All Salesmen
                </div>
                {filteredSalesmen.map((s) => (
                  <div
                    key={s.value}
                    className={cn(
                      "px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50",
                      selectedSalesman === s.value &&
                        "bg-blue-50 text-blue-700 font-medium",
                    )}
                    onClick={() => handleSelectSalesman(s.value, s.label)}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer */}
          <div className="space-y-1.5 relative" ref={customerWrapperRef}>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Customer
            </label>
            <div className="relative">
              <input
                type="text"
                className="h-10 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm pl-3 pr-8 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setCustomerOpen(true);
                }}
                onFocus={() => {
                  setCustomerOpen(true);
                  if (customerSearch === "All Customers") setCustomerSearch("");
                }}
              />
              <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {isCustomerOpen && (
              <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto ring-1 ring-slate-200">
                <div
                  className={cn(
                    "px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50",
                    selectedCustomer === "All" &&
                      "bg-blue-50 text-blue-700 font-medium",
                  )}
                  onClick={() => handleSelectCustomer("All", "All Customers")}
                >
                  All Customers
                </div>
                {filteredCustomers.map((c) => (
                  <div
                    key={c.value}
                    className={cn(
                      "px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50",
                      selectedCustomer === c.value &&
                        "bg-blue-50 text-blue-700 font-medium",
                    )}
                    onClick={() => handleSelectCustomer(c.value, c.label)}
                  >
                    {c.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Status
            </label>
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-10 w-full bg-slate-50 border-slate-200 text-slate-700 focus:ring-blue-500/20">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2 sm:pt-0">
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full h-10 border-slate-200 text-slate-600 hover:text-blue-600 transition-colors"
            >
              <X className="h-4 w-4 mr-2" /> Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-xl border border-blue-100 bg-white shadow-sm min-h-[400px] flex flex-col overflow-hidden">
        <div className="overflow-x-auto w-full flex-1">
          <Table className="min-w-[1000px]">
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-b-slate-200 hover:bg-slate-50/80">
                <TableHead className="font-bold text-blue-900 pl-6">
                  Return No.
                </TableHead>
                <TableHead className="font-bold text-blue-900">
                  Salesman
                </TableHead>
                <TableHead className="font-bold text-blue-900">
                  Customer
                </TableHead>
                <TableHead className="font-bold text-blue-900">
                  Return Date
                </TableHead>
                <TableHead className="font-bold text-blue-900 text-right">
                  Total Amount
                </TableHead>
                <TableHead className="font-bold text-blue-900 text-center">
                  Status
                </TableHead>
                <TableHead className="font-bold text-blue-900">
                  Remarks
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600 h-8 w-8" />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-40 text-center text-slate-500"
                  >
                    No returns found.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-blue-50/30 transition-colors border-b-slate-100"
                  >
                    <TableCell
                      className="font-semibold text-blue-600 cursor-pointer hover:text-blue-800 pl-6"
                      onClick={() => handleViewDetails(row)}
                    >
                      {row.returnNo}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-700">
                      {getSalesmanName(row.salesmanId)}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-700">
                      {getCustomerName(row.customerCode)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                      {row.returnDate}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-bold text-right text-slate-700">
                      {row.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-3 py-0.5 font-semibold",
                          getStatusColor(row.status),
                        )}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="text-xs text-slate-500 max-w-[200px] truncate"
                      title={row.remarks}
                    >
                      {row.remarks || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* PAGINATION UI (Same as before) */}
      <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-3 border border-blue-100 bg-white shadow-sm rounded-xl">
        <div className="text-sm text-slate-500 order-2 sm:order-1 text-center sm:text-left">
          Showing page{" "}
          <span className="font-bold text-slate-900">{currentPage}</span> of{" "}
          <span className="font-bold text-slate-900">{totalPages}</span>
        </div>
        <div className="flex items-center gap-2 order-1 sm:order-2 mb-2 sm:mb-0">
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || loading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1">
            {getPageNumbers().map((page, idx) => (
              <React.Fragment key={idx}>
                {page === "..." ? (
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 cursor-default"
                    disabled
                  >
                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                  </Button>
                ) : (
                  <Button
                    variant={currentPage === page ? "default" : "ghost"}
                    size="icon"
                    className={cn(
                      "h-8 w-8 text-sm",
                      currentPage === page
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-600 hover:bg-blue-50",
                    )}
                    onClick={() => setCurrentPage(Number(page))}
                    disabled={loading}
                  >
                    {page}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || loading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={!!selectedReturn}
        onOpenChange={(open) => !open && setSelectedReturn(null)}
      >
        <DialogContent className="w-full max-w-[95vw] lg:max-w-7xl h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-xl [&>button]:hidden">
          <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-800">
                {isEditable ? "Edit Sales Return" : "Return Details"}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold uppercase tracking-wider">
                  {selectedReturn?.returnNo}
                </span>
                <span className="text-slate-400 text-sm">|</span>
                <span className="text-sm text-slate-500">
                  {selectedReturn?.returnDate}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedReturn(null)}
              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow-sm transition-all active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-xl border border-blue-100 shadow-sm">
              <div className="space-y-4">
                <ReadOnlyField
                  label="Salesman"
                  value={getSalesmanName(selectedReturn?.salesmanId)}
                />
                <ReadOnlyField
                  label="Salesman Code"
                  value={getSalesmanCode(selectedReturn?.salesmanId)}
                />
                <ReadOnlyField
                  label="Branch"
                  value={getSalesmanBranch(selectedReturn?.salesmanId)}
                />
              </div>
              <div className="space-y-4">
                <ReadOnlyField
                  label="Customer"
                  value={getCustomerName(selectedReturn?.customerCode)}
                />
                <ReadOnlyField
                  label="Customer Code"
                  value={selectedReturn?.customerCode}
                />
              </div>
              <div className="space-y-4">
                <ReadOnlyField
                  label="Return Date"
                  value={selectedReturn?.returnDate}
                />
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="isThirdParty"
                    checked={selectedReturn?.isThirdParty || false}
                    disabled={!isEditable}
                    onCheckedChange={(checked) =>
                      selectedReturn &&
                      setSelectedReturn({
                        ...selectedReturn,
                        isThirdParty: checked as boolean,
                      })
                    }
                  />
                  <Label
                    htmlFor="isThirdParty"
                    className="text-sm font-medium text-slate-700 cursor-pointer"
                  >
                    Third Party Transaction
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="h-5 w-1 bg-blue-600 rounded-full"></span>
                  Products Summary
                </h3>
                {isEditable && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md shadow-blue-200"
                    onClick={() => setIsProductLookupOpen(true)}
                  >
                    <Plus className="h-4 w-4" /> Add Product
                  </Button>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <Table>
                    {/* ... TableHeader and TableBody with Items ... */}
                    <TableHeader>
                      <TableRow className="bg-blue-600 hover:bg-blue-600! border-none">
                        <TableHead className="text-white font-semibold h-11 w-[120px] uppercase text-xs">
                          Code
                        </TableHead>
                        <TableHead className="text-white font-semibold h-11 min-w-[200px] uppercase text-xs">
                          Description
                        </TableHead>
                        <TableHead className="text-white font-semibold h-11 w-[80px] uppercase text-xs">
                          Unit
                        </TableHead>
                        <TableHead className="text-white font-semibold h-11 text-center min-w-[100px] uppercase text-xs">
                          Qty
                        </TableHead>
                        <TableHead className="text-white font-semibold h-11 text-right min-w-[120px] uppercase text-xs">
                          Price
                        </TableHead>
                        <TableHead className="text-white font-semibold h-11 text-right w-[100px] uppercase text-xs">
                          Gross
                        </TableHead>
                        <TableHead className="text-white font-semibold h-11 w-[130px] uppercase text-xs">
                          Disc. Type
                        </TableHead>
                        <TableHead className="text-white font-semibold h-11 text-right w-[100px] uppercase text-xs">
                          Disc. Amt
                        </TableHead>
                        <TableHead className="text-white font-semibold h-11 text-right w-[100px] uppercase text-xs">
                          Total
                        </TableHead>
                        <TableHead className="text-white font-semibold h-11 min-w-[150px] uppercase text-xs">
                          Reason
                        </TableHead>
                        <TableHead className="text-white font-semibold h-11 w-[160px] uppercase text-xs">
                          Return Type
                        </TableHead>
                        {isEditable && (
                          <TableHead className="text-white font-semibold h-11 w-[50px]"></TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailsLoading ? (
                        <TableRow>
                          <TableCell
                            colSpan={isEditable ? 12 : 11}
                            className="h-32 text-center"
                          >
                            <Loader2 className="animate-spin text-blue-500 mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : details.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={isEditable ? 12 : 11}
                            className="h-24 text-center text-slate-500 text-sm"
                          >
                            No products found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        details.map((item, i) => (
                          <TableRow
                            key={item.id || i}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <TableCell className="text-xs text-slate-700 font-bold align-middle">
                              {item.code}
                            </TableCell>
                            <TableCell className="align-middle">
                              <div
                                className="text-xs text-slate-700 font-medium truncate max-w-[220px] transition-all duration-200 ease-in-out hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 -ml-1.5 rounded-md cursor-help"
                                title={item.description}
                              >
                                {item.description}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 align-middle">
                              <Badge
                                variant="outline"
                                className="text-slate-600 border-slate-300 font-normal"
                              >
                                {item.unit}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-center align-middle p-2">
                              {isEditable ? (
                                <Input
                                  type="number"
                                  className="h-9 w-full text-center text-sm border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 px-2"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleDetailChange(
                                      i,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                />
                              ) : (
                                <span className="text-xs font-semibold text-slate-700">
                                  {item.quantity}
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="text-right align-middle p-2">
                              {isEditable ? (
                                <Input
                                  type="number"
                                  className="h-9 w-full text-right text-sm border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 px-2"
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    handleDetailChange(
                                      i,
                                      "unitPrice",
                                      e.target.value,
                                    )
                                  }
                                />
                              ) : (
                                <span className="text-xs text-slate-700">
                                  {Number(item.unitPrice).toLocaleString()}
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="text-right text-xs text-slate-600 align-middle font-mono">
                              {(
                                Number(item.quantity) * Number(item.unitPrice)
                              ).toLocaleString()}
                            </TableCell>

                            <TableCell className="align-middle p-2">
                              {isEditable ? (
                                <Select
                                  value={
                                    item.discountType?.toString() ||
                                    "No Discount"
                                  }
                                  onValueChange={(val) =>
                                    handleDetailChange(i, "discountType", val)
                                  }
                                >
                                  <SelectTrigger className="h-9 w-full text-xs border-slate-300 rounded-md bg-white">
                                    <SelectValue placeholder="None" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="No Discount">
                                      None
                                    </SelectItem>
                                    {discountOptions.map((opt) => (
                                      <SelectItem
                                        key={opt.id}
                                        value={opt.id.toString()}
                                      >
                                        {opt.line_discount}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-xs text-slate-500">
                                  {discountOptions.find(
                                    (d) => d.id.toString() == item.discountType,
                                  )?.line_discount || "None"}
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="text-right align-middle p-2">
                              <Input
                                type="number"
                                readOnly
                                className="h-9 w-full text-right text-sm border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed focus-visible:ring-0"
                                value={item.discountAmount}
                              />
                            </TableCell>

                            <TableCell className="text-right font-bold text-sm text-blue-700 align-middle">
                              {(Number(item.totalAmount) || 0).toLocaleString()}
                            </TableCell>

                            <TableCell className="align-middle p-2">
                              {isEditable ? (
                                <Input
                                  className="h-9 w-full text-sm border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                  placeholder="Enter reason..."
                                  value={item.reason}
                                  onChange={(e) =>
                                    handleDetailChange(
                                      i,
                                      "reason",
                                      e.target.value,
                                    )
                                  }
                                />
                              ) : (
                                <span className="text-xs text-slate-600 italic">
                                  {item.reason || "-"}
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="align-middle p-2">
                              {isEditable ? (
                                <Select
                                  value={item.returnType as string}
                                  onValueChange={(val) =>
                                    handleDetailChange(i, "returnType", val)
                                  }
                                >
                                  <SelectTrigger className="h-9 w-full text-xs border-slate-300 rounded-md bg-white">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {returnTypeOptions.length > 0 ? (
                                      returnTypeOptions.map((type) => (
                                        <SelectItem
                                          key={type.type_id}
                                          value={type.type_name}
                                        >
                                          {type.type_name}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <>
                                        <SelectItem value="Good Order">
                                          Good Order
                                        </SelectItem>
                                        <SelectItem value="Bad Order">
                                          Bad Order
                                        </SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-normal"
                                >
                                  {item.returnType as React.ReactNode}
                                </Badge>
                              )}
                            </TableCell>

                            {isEditable && (
                              <TableCell className="text-center align-middle">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-white hover:bg-red-500 transition-colors rounded-md"
                                  onClick={() => handleDeleteRow(i)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase font-bold text-slate-500">
                      Order No.
                    </Label>
                    {isEditable ? (
                      // REVISION 1: Removed Button Here, just the Input
                      <Input
                        value={selectedReturn?.orderNo || ""}
                        onChange={(e) =>
                          selectedReturn &&
                          setSelectedReturn({
                            ...selectedReturn,
                            orderNo: e.target.value,
                          })
                        }
                        className="h-9 bg-white border-slate-300"
                      />
                    ) : (
                      <div className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-800 shadow-sm flex justify-between items-center">
                        {selectedReturn?.orderNo || "-"}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase font-bold text-slate-500">
                      Invoice No.
                    </Label>
                    {isEditable ? (
                      <Input
                        value={selectedReturn?.invoiceNo || ""}
                        onChange={(e) =>
                          selectedReturn &&
                          setSelectedReturn({
                            ...selectedReturn,
                            invoiceNo: e.target.value,
                          })
                        }
                        className="h-9 bg-white border-slate-300"
                      />
                    ) : (
                      <div className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-800 shadow-sm">
                        {selectedReturn?.invoiceNo || "-"}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-slate-500">
                    Remarks
                  </Label>
                  <Textarea
                    readOnly={!isEditable}
                    className={cn(
                      "min-h-[100px] border-slate-300 rounded-md focus:border-blue-500",
                      !isEditable ? "bg-slate-50 border-slate-200" : "bg-white",
                    )}
                    value={selectedReturn?.remarks || ""}
                    onChange={(e) =>
                      selectedReturn &&
                      setSelectedReturn({
                        ...selectedReturn,
                        remarks: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">
                      Gross Amount
                    </span>
                    <span className="font-semibold text-slate-800">
                      ₱{" "}
                      {details
                        .reduce(
                          (acc, i) =>
                            acc + Number(i.quantity) * Number(i.unitPrice),
                          0,
                        )
                        .toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">
                      Discount Amount
                    </span>
                    <span className="font-semibold text-slate-800">
                      ₱{" "}
                      {details
                        .reduce(
                          (acc, i) => acc + (Number(i.discountAmount) || 0),
                          0,
                        )
                        .toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                    </span>
                  </div>
                  <div className="h-px bg-slate-100 my-3"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-900 font-bold text-base">
                      Net Amount
                    </span>
                    <span className="font-bold text-blue-700 text-xl">
                      ₱{" "}
                      {details
                        .reduce(
                          (acc, i) => acc + (Number(i.totalAmount) || 0),
                          0,
                        )
                        .toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                    </span>
                  </div>

                  <div className="h-px bg-slate-100 my-3"></div>

                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div className="flex items-center justify-between col-span-2">
                      <span className="text-slate-500 font-medium">
                        Applied
                      </span>
                      <Checkbox
                        checked={statusCardData?.isApplied || false}
                        disabled
                      />
                    </div>

                    <div className="flex justify-between col-span-2">
                      <span className="text-slate-500 font-medium">
                        Date Applied
                      </span>
                      <span className="text-slate-800 font-medium">
                        {statusCardData?.dateApplied || "-"}
                      </span>
                    </div>

                    <div className="flex justify-between col-span-2">
                      <span className="text-slate-500 font-medium">
                        Transaction Status
                      </span>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {statusCardData?.transactionStatus || "-"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between col-span-2">
                      <span className="text-slate-500 font-medium">Posted</span>
                      <Checkbox
                        checked={statusCardData?.isPosted || false}
                        disabled
                      />
                    </div>

                    <div className="flex items-center justify-between col-span-2">
                      <span className="text-slate-500 font-medium">
                        Received
                      </span>
                      <Checkbox
                        checked={statusCardData?.isReceived || false}
                        disabled
                      />
                    </div>

                    <div className="flex justify-between items-center col-span-2">
                      <span className="text-slate-500 font-medium">
                        Applied to
                      </span>

                      {/* REVISION 1: Applied To Button Logic Moved Here */}
                      {isEditable && selectedReturn?.orderNo ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 px-2"
                          onClick={() => setIsInvoiceLookupOpen(true)}
                        >
                          {selectedReturn.invoiceNo || "Select Invoice"}{" "}
                          <LinkIcon className="ml-1 h-3 w-3" />
                        </Button>
                      ) : (
                        <span className="text-slate-800 font-medium">
                          {statusCardData?.appliedTo || "-"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 p-5 bg-white flex justify-end gap-3 shrink-0">
            <Button variant="outline" onClick={() => handlePrint()}>
              <Printer className="h-4 w-4 mr-2" /> Print Slip
            </Button>
            <Button variant="outline" onClick={() => setSelectedReturn(null)}>
              Close
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]"
              onClick={handleReceiveClick}
              disabled={!isEditable || selectedReturn?.status === "Received"}
            >
              Receive
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-40"
              onClick={handleUpdateReturn}
              disabled={!isEditable}
            >
              Update Sales Return
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isInvoiceLookupOpen} onOpenChange={setIsInvoiceLookupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Select Invoice{" "}
              <Badge variant="secondary" className="text-xs font-normal">
                {invoiceOptions.length} Found
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search Invoice No..."
                className="pl-10"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
              {filteredInvoices.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  No invoices found.
                </div>
              ) : (
                filteredInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition-colors"
                    onClick={() => handleSelectInvoice(inv.invoice_no)}
                  >
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        {inv.invoice_no}
                      </div>
                      <div className="text-xs text-slate-500">ID: {inv.id}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isProductLookupOpen && (
        <ProductLookupModal
          isOpen={isProductLookupOpen}
          onClose={() => setIsProductLookupOpen(false)}
          onConfirm={handleAddProductsToEdit}
        />
      )}
      <CreateSalesReturnModal
        isOpen={isCreateOpen}
        onClose={() => {
          setCreateOpen(false);
          loadHistory();
        }}
        onSuccess={() => loadHistory()}
      />
      <Dialog open={isConfirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-[400px] p-6 bg-white rounded-xl shadow-2xl border-0">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-lg font-bold">
                Confirm Receipt
              </DialogTitle>
              <div className="text-sm text-slate-500">
                Are you sure you want to mark Return{" "}
                <span className="font-bold">{selectedReturn?.returnNo}</span> as
                RECEIVED?
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isReceiving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReceive}
              disabled={isReceiving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isReceiving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
