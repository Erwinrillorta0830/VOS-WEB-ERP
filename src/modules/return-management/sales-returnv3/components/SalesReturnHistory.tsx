"use client";

import React, { useEffect, useState, useRef } from "react";
import { 
  Loader2, ChevronLeft, ChevronRight, Eye, X, ChevronsLeft, ChevronsRight, 
  MoreHorizontal, ChevronDown, Printer, Trash2, Plus, Search, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// --- IMPORTS FOR API & TYPES ---
import { SalesReturnProvider } from "../provider/api"; 
import { SalesReturn, SalesReturnItem, API_LineDiscount } from "../type"; 

import { cn } from "@/lib/utils"; 

// --- IMPORT MODALS ---
import { CreateSalesReturnModal } from "./CreateSalesReturnModal";
import { ProductLookupModal } from "./ProductLookupModal"; 

// --- IMPORT PRINT DEPENDENCIES ---
import { useReactToPrint } from "react-to-print";
import { SalesReturnPrintSlip } from "./SalesReturnPrintSlip";


// --- Helper Component for Read-Only Form Fields ---
const ReadOnlyField = ({ label, value, className = "" }: { label: string, value: string | number | undefined, className?: string }) => (
  <div className={cn("space-y-1.5", className)}>
    <Label className="text-xs uppercase tracking-wide font-bold text-slate-500">{label}</Label>
    <div className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-800 shadow-sm">
      {value || "-"}
    </div>
  </div>
);

export function SalesReturnHistory() {
  const [data, setData] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);
    
  // Options
  const [salesmenOptions, setSalesmenOptions] = useState<{value: string, label: string, branch?: string, code?: string}[]>([]);
  const [customerOptions, setCustomerOptions] = useState<{value: string, label: string}[]>([]);
  const [discountOptions, setDiscountOptions] = useState<API_LineDiscount[]>([]);
    
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

  // Detail Modal State (View/Edit)
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(null);
  const [details, setDetails] = useState<SalesReturnItem[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // --- MODAL STATES ---
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  
  // 🟢 NEW: State for Product Lookup in Edit Mode
  const [isProductLookupOpen, setIsProductLookupOpen] = useState(false);

  // Computed property to check if the current modal is in editable mode
  const isEditable = selectedReturn?.status === 'Pending';

  // --- PRINT LOGIC ---
  const printComponentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: `Return-Slip-${selectedReturn?.returnNo || 'Draft'}`,
  });

  // 1. Initial Load
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [salesmen, customers, discounts] = await Promise.all([
          SalesReturnProvider.getSalesmenList(),
          SalesReturnProvider.getCustomersList(),
          SalesReturnProvider.getLineDiscounts() 
        ]);
        setSalesmenOptions(salesmen);
        setCustomerOptions(customers);
        setDiscountOptions(discounts);
      } catch (error) {
        console.error("Error loading filter options", error);
      }
    };
    fetchOptions();
  }, []);

  // Click Outside Handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (salesmanWrapperRef.current && !salesmanWrapperRef.current.contains(target)) {
        setSalesmanOpen(false);
        if (selectedSalesman === "All") setSalesmanSearch("All Salesmen");
        else {
           const found = salesmenOptions.find(s => s.value === selectedSalesman);
           setSalesmanSearch(found ? found.label : "All Salesmen");
        }
      }
      if (customerWrapperRef.current && !customerWrapperRef.current.contains(target)) {
        setCustomerOpen(false);
        if (selectedCustomer === "All") setCustomerSearch("All Customers");
        else {
           const found = customerOptions.find(c => c.value === selectedCustomer);
           setCustomerSearch(found ? found.label : "All Customers");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedSalesman, salesmenOptions, selectedCustomer, customerOptions]);


  // 2. Load History Data
  const loadHistory = async () => {
    try {
      setLoading(true);
      const filters = {
        salesman: selectedSalesman,
        customer: selectedCustomer,
        status: selectedStatus
      };
      
      const result = await SalesReturnProvider.getReturns(
        currentPage, 
        ITEMS_PER_PAGE, 
        globalSearch, 
        filters
      );
      
      setData(result.data);
      setTotalPages(Math.max(1, Math.ceil(result.total / ITEMS_PER_PAGE)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, [currentPage, selectedSalesman, selectedCustomer, selectedStatus, globalSearch]);

  // --- HANDLERS ---
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

  // --- VIEW DETAILS LOGIC ---
  const handleViewDetails = async (record: SalesReturn) => {
    try {
      setSelectedReturn(record);
      setDetailsLoading(true);
      
      const items = await SalesReturnProvider.getProductsSummary(record.id, record.returnNo);
      setDetails(items);
    } catch (e) {
      console.error("Error loading details:", e);
      setDetails([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  // --- EDITING HANDLERS ---
  const handleDetailChange = (index: number, field: string, value: any) => {
    const newDetails = [...details];
    // @ts-ignore
    const item = { ...newDetails[index], [field]: value };
    
    // Logic: Handle Discount Type Selection
    if (field === 'discountType') {
        if (value === "No Discount" || !value) {
            
            item.discountAmount = 0;
        } else {
            const selectedDisc = discountOptions.find(d => d.id.toString() === value);
            if (selectedDisc) {
                const percentage = parseFloat(selectedDisc.percentage);
                const gross = Number(item.quantity || 0) * Number(item.unitPrice || 0);
                item.discountAmount = gross * (percentage / 100);
            }
        }
    }

    // Logic: Recalculate Totals
    const qty = Number(item.quantity || 0);
    const price = Number(item.unitPrice || 0);
    const disc = Number(item.discountAmount || 0);
    
    item.grossAmount = qty * price;
    item.totalAmount = (qty * price) - disc;
    
    newDetails[index] = item;
    setDetails(newDetails);
  };

  const handleDeleteRow = (index: number) => {
    const newDetails = details.filter((_, i) => i !== index);
    setDetails(newDetails);
  };

  // 🟢 CORRECTED HANDLER: Connects ProductLookupModal to the Table
  const handleAddProductsToEdit = (newItems: any[]) => {
    console.log("📥 Received items from Lookup:", newItems);

    if (!newItems || newItems.length === 0) return;

    const formattedItems = newItems.map((item, index) => {
        // 1. ROBUST PRICE DETECTION (Supports 'unitPrice' from your modal)
        const price = Number(item.unitPrice) || Number(item.price) || 0;
        
        // 2. QUANTITY
        const qty = Number(item.quantity) || 1;

        // 3. GROSS AMOUNT
        const gross = price * qty;

        // 4. UNIQUE ID GENERATION (Critical for React Rendering)
        // Uses tempId from modal, or generates a new unique string
        const uniqueId = item.tempId || `added-${Date.now()}-${index}-${Math.random().toString(36).substr(2,9)}`;

        return {
           id: uniqueId, // UI Key
           productId: item.productId || item.product_id, // Database ID
           
           code: item.code || "N/A",
           description: item.description || "Unknown Item",
           unit: item.unit || "Pcs",
           
           quantity: qty,
           unitPrice: price,
           grossAmount: gross,
           
           discountType: item.discountType || null,
           discountAmount: Number(item.discountAmount) || 0,
           totalAmount: (gross - (Number(item.discountAmount) || 0)),
           
           reason: item.reason || "Good Order", 
           returnType: item.returnType || "Good Order"
        };
    });

    // Append new items to existing details
    setDetails(prev => [...prev, ...formattedItems]);
    
    // Close the lookup modal
    setIsProductLookupOpen(false);
  };

  const handleUpdateReturn = async () => {
     console.log("Updating return with:", details);
     // API Call Placeholder
     alert("Sales Return Updated Successfully!");
     setSelectedReturn(null);
     loadHistory(); 
  };

  // --- RECEIVE HANDLERS ---
  const handleReceiveClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirmReceive = async () => {
     if (!selectedReturn) return;
     
     try {
        setIsReceiving(true); 
        await SalesReturnProvider.updateStatus(selectedReturn.id, "Received"); 
        
        setConfirmOpen(false); 
        setSelectedReturn(null); 
        loadHistory(); 
        
     } catch (error: any) {
        console.error("Receive Error:", error);
        alert("Failed to update status. Please try again.");
     } finally {
        setIsReceiving(false);
     }
  };

  // --- HELPERS ---
  const getSalesmanName = (id: any) => {
    if (!id) return "-";
    const found = salesmenOptions.find(opt => String(opt.value) === String(id));
    return found ? found.label : id;
  };

  const getSalesmanCode = (id: any) => {
    if (!id) return "-";
    const found = salesmenOptions.find(opt => String(opt.value) === String(id));
    return found ? (found.code || found.value) : id;
  };

  const getSalesmanBranch = (id: any) => {
    if (!id) return "-";
    const salesman = salesmenOptions.find(opt => String(opt.value) === String(id));
    return salesman?.branch || "N/A";
  };

  const getCustomerName = (code: any) => {
    if (!code) return "-";
    const found = customerOptions.find(opt => String(opt.value) === String(code));
    return found ? found.label : code;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'received': return "bg-green-50 text-green-700 border-green-200 hover:bg-green-100";
      case 'pending': return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      if (currentPage <= 3) {
        pageNumbers.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pageNumbers.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pageNumbers;
  };

  const filteredSalesmen = salesmenOptions.filter((s) => 
    s.label.toLowerCase().includes(salesmanSearch.toLowerCase()) && salesmanSearch !== "All Salesmen"
  );
  const filteredCustomers = customerOptions.filter((c) => 
    c.label.toLowerCase().includes(customerSearch.toLowerCase()) && customerSearch !== "All Customers"
  );

  const printData = selectedReturn ? {
    ...selectedReturn,
    items: details, 
    salesmanName: getSalesmanName(selectedReturn.salesmanId), 
    salesmanCode: getSalesmanCode(selectedReturn.salesmanId),
    customerName: getCustomerName(selectedReturn.customerCode), 
    branchName: getSalesmanBranch(selectedReturn.salesmanId),    
    totalAmount: Number(selectedReturn.totalAmount)
  } : null;

  return (
    <div className="space-y-6 p-4 md:p-8 w-full max-w-[100vw] overflow-x-hidden bg-slate-50 min-h-screen">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Sales Returns</h2>
            <p className="text-slate-500">Manage customer product returns</p>
        </div>

        <Button 
            onClick={() => setCreateOpen(true)}
            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-blue-200 shadow-md transition-all active:scale-95"
        >
            <Plus className="h-5 w-5 mr-2" />
            Add New Sales Return
        </Button>
      </div>

      {/* --- SEARCH --- */}
      <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
              type="text" 
              placeholder="Search by return number, salesman, or customer..."
              className="h-11 w-full pl-10 pr-4 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm placeholder:text-slate-400"
              value={globalSearch}
              onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setCurrentPage(1); 
              }}
          />
      </div>

      {/* --- FILTERS --- */}
      <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
          {/* SALESMAN FILTER */}
          <div className="space-y-1.5 relative" ref={salesmanWrapperRef}>
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Salesman</label>
             <div className="relative">
                <input
                    type="text"
                    className="h-10 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm pl-3 pr-8 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-700 font-medium"
                    value={salesmanSearch}
                    onChange={(e) => { setSalesmanSearch(e.target.value); setSalesmanOpen(true); }}
                    onFocus={() => { setSalesmanOpen(true); if (salesmanSearch === "All Salesmen") setSalesmanSearch(""); }}
                    placeholder="Select Salesman"
                />
                <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
             </div>
             {isSalesmanOpen && (
                <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto ring-1 ring-slate-200">
                    <div className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 transition-colors ${selectedSalesman === "All" ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600"}`} 
                        onClick={() => handleSelectSalesman("All", "All Salesmen")}>
                        All Salesmen
                    </div>
                    {filteredSalesmen.map((s) => (
                        <div key={s.value} 
                            className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 transition-colors ${selectedSalesman === s.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600"}`} 
                            onClick={() => handleSelectSalesman(s.value, s.label)}>
                            {s.label}
                        </div>
                    ))}
                    {filteredSalesmen.length === 0 && <div className="px-4 py-3 text-sm text-slate-400">No salesman found</div>}
                </div>
             )}
          </div>

          {/* CUSTOMER FILTER */}
          <div className="space-y-1.5 relative" ref={customerWrapperRef}>
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Customer</label>
             <div className="relative">
                <input
                    type="text"
                    className="h-10 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm pl-3 pr-8 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-700 font-medium"
                    value={customerSearch}
                    onChange={(e) => { setCustomerSearch(e.target.value); setCustomerOpen(true); }}
                    onFocus={() => { setCustomerOpen(true); if (customerSearch === "All Customers") setCustomerSearch(""); }}
                    placeholder="Select Customer"
                />
                <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
             </div>
             {isCustomerOpen && (
                <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto ring-1 ring-slate-200">
                    <div className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 transition-colors ${selectedCustomer === "All" ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600"}`} 
                        onClick={() => handleSelectCustomer("All", "All Customers")}>
                        All Customers
                    </div>
                    {filteredCustomers.map((c) => (
                        <div key={c.value} 
                            className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 transition-colors ${selectedCustomer === c.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600"}`} 
                            onClick={() => handleSelectCustomer(c.value, c.label)}>
                            {c.label}
                        </div>
                    ))}
                    {filteredCustomers.length === 0 && <div className="px-4 py-3 text-sm text-slate-400">No customer found</div>}
                </div>
             )}
          </div>

          {/* STATUS FILTER */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</label>
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-10 w-full bg-slate-50 border-slate-200 text-slate-700 focus:ring-blue-500/20"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2 sm:pt-0">
            <Button variant="outline" onClick={handleReset} className="w-full h-10 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors">
               <X className="h-4 w-4 mr-2" /> Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="rounded-xl border border-blue-100 bg-white shadow-sm min-h-[400px] flex flex-col overflow-hidden">
        <div className="overflow-x-auto w-full flex-1">
          <Table className="min-w-[1000px]">
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-b-slate-200 hover:bg-slate-50/80">
                <TableHead className="font-bold text-blue-900 whitespace-nowrap pl-6">Return No.</TableHead>
                <TableHead className="font-bold text-blue-900 whitespace-nowrap">Salesman</TableHead>
                <TableHead className="font-bold text-blue-900 whitespace-nowrap">Customer</TableHead>
                <TableHead className="font-bold text-blue-900 whitespace-nowrap">Return Date</TableHead>
                <TableHead className="font-bold text-blue-900 text-right whitespace-nowrap">Total Amount</TableHead>
                <TableHead className="font-bold text-blue-900 text-center whitespace-nowrap">Status</TableHead>
                <TableHead className="font-bold text-blue-900 whitespace-nowrap">Remarks</TableHead>
                <TableHead className="font-bold text-blue-900 text-center whitespace-nowrap pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="h-40 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 h-8 w-8" /></TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-40 text-center text-slate-500">No returns found matching your filters.</TableCell></TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id} className="hover:bg-blue-50/30 transition-colors border-b-slate-100">
                    <TableCell className="font-semibold text-blue-600 cursor-pointer hover:text-blue-800 pl-6" onClick={() => handleViewDetails(row)}>
                      {row.returnNo}
                    </TableCell>
                    
                    <TableCell className="text-sm font-medium text-slate-700">{getSalesmanName(row.salesmanId)}</TableCell>
                    
                    <TableCell className="text-sm font-medium text-slate-700">{getCustomerName(row.customerCode)}</TableCell>
                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">{row.returnDate}</TableCell>
                    <TableCell className="font-mono text-sm font-bold text-right text-slate-700">{row.totalAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("px-3 py-0.5 font-semibold", getStatusColor(row.status))}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[200px] truncate" title={row.remarks}>{row.remarks || "-"}</TableCell>
                    <TableCell className="text-center pr-6">
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(row)} className="hover:bg-blue-100 hover:text-blue-700 rounded-full h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* --- PAGINATION --- */}
      <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-3 border border-blue-100 bg-white shadow-sm rounded-xl">
        <div className="text-sm text-slate-500 order-2 sm:order-1 text-center sm:text-left">
          Showing page <span className="font-bold text-slate-900">{currentPage}</span> of <span className="font-bold text-slate-900">{totalPages}</span>
        </div>

        <div className="flex items-center gap-2 order-1 sm:order-2 mb-2 sm:mb-0">
          <div className="flex gap-1">
            <Button 
                variant="outline" size="icon" className="h-8 w-8 hidden sm:flex border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200" 
                onClick={() => setCurrentPage(1)} disabled={currentPage === 1 || loading}
            >
                <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button 
                variant="outline" size="icon" className="h-8 w-8 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || loading}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-1">
            {getPageNumbers().map((page, idx) => (
              <React.Fragment key={idx}>
                {page === '...' ? (
                  <Button variant="ghost" className="h-8 w-8 p-0 cursor-default" disabled>
                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                  </Button>
                ) : (
                  <Button
                    variant={currentPage === page ? "default" : "ghost"}
                    size="icon"
                    className={cn(
                        "h-8 w-8 text-sm transition-all", 
                        currentPage === page ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
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
                variant="outline" size="icon" className="h-8 w-8 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || loading}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
                variant="outline" size="icon" className="h-8 w-8 hidden sm:flex border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200" 
                onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || loading}
            >
                <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* --- EDIT / VIEW DIALOG --- */}
      <Dialog open={!!selectedReturn} onOpenChange={(open) => !open && setSelectedReturn(null)}>
        <DialogContent className="w-full max-w-[95vw] lg:max-w-7xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-xl">
          
          {/* Modal Header */}
          <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-800">
                    {isEditable ? "Edit Sales Return" : "Return Details"}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold uppercase tracking-wider">
                        {selectedReturn?.returnNo}
                    </span>
                    <span className="text-slate-400 text-sm">|</span>
                    <span className="text-sm text-slate-500">{selectedReturn?.returnDate}</span>
                </div>
              </div>

              <button 
                onClick={() => setSelectedReturn(null)} 
                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
            
            {/* Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-xl border border-blue-100 shadow-sm">
                <div className="space-y-4">
                    <ReadOnlyField label="Salesman" value={getSalesmanName(selectedReturn?.salesmanId)} />
                    <ReadOnlyField label="Salesman Code" value={getSalesmanCode(selectedReturn?.salesmanId)} />
                    <ReadOnlyField label="Branch" value={getSalesmanBranch(selectedReturn?.salesmanId)} /> 
                </div>
                <div className="space-y-4">
                    <ReadOnlyField label="Customer" value={getCustomerName(selectedReturn?.customerCode)} />
                    <ReadOnlyField label="Customer Code" value={selectedReturn?.customerCode} />
                </div>
                <div className="space-y-4">
                    <ReadOnlyField label="Return Date" value={selectedReturn?.returnDate} />
                    <div className="pt-6 flex items-center space-x-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                          <div className="h-5 w-5 border border-slate-300 rounded bg-white flex items-center justify-center shadow-sm">
                             <div className="h-2.5 w-2.5 bg-slate-300 rounded-[2px]"></div> 
                          </div>
                          <label className="text-sm font-semibold text-slate-700">Third Party Transaction</label>
                    </div>
                </div>
            </div>

            {/* Products Table */}
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
                            onClick={() => setIsProductLookupOpen(true)} // 🟢 UPDATED: Opens Lookup Modal
                        >
                            <Plus className="h-4 w-4" /> Add Product
                        </Button>
                    )}
                </div>
                
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-blue-600 hover:bg-blue-700 border-none">
                                    <TableHead className="text-white font-semibold h-11 w-[100px]">Code</TableHead>
                                    <TableHead className="text-white font-semibold h-11 min-w-[150px]">Description</TableHead>
                                    <TableHead className="text-white font-semibold h-11">Unit</TableHead>
                                    <TableHead className="text-white font-semibold h-11 text-center w-[80px]">Qty</TableHead>
                                    <TableHead className="text-white font-semibold h-11 text-right w-[100px]">Price</TableHead>
                                    <TableHead className="text-white font-semibold h-11 text-right">Gross</TableHead>
                                    <TableHead className="text-white font-semibold h-11 w-[140px]">Disc. Type</TableHead>
                                    <TableHead className="text-white font-semibold h-11 text-right w-[100px]">Disc. Amt</TableHead>
                                    <TableHead className="text-white font-semibold h-11 text-right">Total</TableHead>
                                    <TableHead className="text-white font-semibold h-11 min-w-[150px]">Reason</TableHead>
                                    <TableHead className="text-white font-semibold h-11 w-[140px]">Type</TableHead>
                                    {isEditable && <TableHead className="text-white font-semibold h-11 w-[50px]"></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detailsLoading ? (
                                <TableRow><TableCell colSpan={isEditable ? 12 : 11} className="h-32 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto" /></TableCell></TableRow>
                              ) : details.length === 0 ? (
                                <TableRow><TableCell colSpan={isEditable ? 12 : 11} className="h-24 text-center text-slate-500 text-sm">No products found.</TableCell></TableRow>
                              ) : (
                                details.map((item, i) => (
                                  <TableRow key={i} className="hover:bg-blue-50/30 border-b-slate-100">
                                    <TableCell className="text-xs text-slate-700 font-bold align-middle">{item.code || "N/A"}</TableCell>
                                    <TableCell className="text-xs text-slate-700 align-middle font-medium">{item.description || "-"}</TableCell> 
                                    <TableCell className="text-xs text-slate-500 align-middle">{item.unit || "Pcs"}</TableCell>

                                    {/* Editable Fields */}
                                    <TableCell className="text-center align-middle p-2">
                                        {isEditable ? (
                                            <Input 
                                                type="number" className="h-8 text-center text-xs border-slate-200 focus:border-blue-500 bg-slate-50 focus:bg-white" 
                                                value={item.quantity} onChange={(e) => handleDetailChange(i, 'quantity', e.target.value)} 
                                            />
                                        ) : <span className="text-xs font-semibold text-slate-700">{item.quantity}</span>}
                                    </TableCell>

                                    <TableCell className="text-right align-middle p-2">
                                        {isEditable ? (
                                            <Input 
                                                type="number" className="h-8 text-right text-xs border-slate-200 focus:border-blue-500 bg-slate-50 focus:bg-white" 
                                                value={item.unitPrice} onChange={(e) => handleDetailChange(i, 'unitPrice', e.target.value)} 
                                            />
                                        ) : <span className="text-xs text-slate-700">{Number(item.unitPrice).toLocaleString()}</span>}
                                    </TableCell>

                                    <TableCell className="text-right text-xs text-slate-600 align-middle">
                                        {item.grossAmount ? item.grossAmount.toLocaleString() : ((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}
                                    </TableCell>

                                    {/* DYNAMIC DISCOUNT TYPE DROPDOWN */}
                                    <TableCell className="align-middle p-2">
                                        {isEditable ? (
                                            <Select 
                                              value={item.discountType ? item.discountType.toString() : "No Discount"} 
                                              onValueChange={(val) => handleDetailChange(i, 'discountType', val)}
                                            >
                                                <SelectTrigger className="h-8 text-xs border-slate-200 bg-slate-50"><SelectValue placeholder="No Discount" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="No Discount">No Discount</SelectItem>
                                                    {discountOptions.map((opt) => (
                                                        <SelectItem key={opt.id} value={opt.id.toString()}>
                                                            {opt.line_discount}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <span className="text-xs text-slate-500">
                                                {discountOptions.find(d => d.id.toString() == item.discountType)?.line_discount || item.discountType || "No Discount"}
                                            </span>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-right align-middle p-2">
                                        {isEditable ? (
                                            <Input 
                                                type="number" className="h-8 text-right text-xs border-slate-200 focus:border-blue-500 bg-slate-50 focus:bg-white" 
                                                value={item.discountAmount} onChange={(e) => handleDetailChange(i, 'discountAmount', e.target.value)} 
                                            />
                                        ) : <span className="text-xs text-slate-700">{Number(item.discountAmount).toLocaleString()}</span>}
                                    </TableCell>

                                    <TableCell className="text-right font-bold text-xs text-blue-700 align-middle bg-blue-50/30">
                                        {item.totalAmount ? item.totalAmount.toLocaleString() : ((item.quantity * item.unitPrice) - (item.discountAmount || 0)).toLocaleString()}
                                    </TableCell>

                                    <TableCell className="align-middle p-2">
                                        {isEditable ? (
                                            <Input className="h-8 text-xs border-slate-200 bg-slate-50 focus:bg-white" value={item.reason} onChange={(e) => handleDetailChange(i, 'reason', e.target.value)} />
                                        ) : <span className="text-xs text-slate-600 italic">{item.reason || "-"}</span>}
                                    </TableCell>

                                    <TableCell className="align-middle p-2">
                                        {isEditable ? (
                                            <Select value={item.returnType as string} onValueChange={(val) => handleDetailChange(i, 'returnType', val)}>
                                                <SelectTrigger className="h-8 text-xs border-slate-200 bg-slate-50"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="Bad Order">Bad Order</SelectItem>
                                                  <SelectItem value="Wrong Item">Wrong Items</SelectItem>
                                                  <SelectItem value="Excess Item">Excess Items</SelectItem>
                                                  <SelectItem value="Late Delivery">Late Delivery</SelectItem>
                                                  <SelectItem value="Good Order">Good Order</SelectItem>
                                                  <SelectItem value="Cylinder Exchange">Cylinder Exchange</SelectItem>
                                                  <SelectItem value="Pull Out">Pull Out</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : <Badge variant="secondary" className="text-[10px] font-normal">{item.returnType as React.ReactNode}</Badge>}
                                    </TableCell>

                                    {isEditable && (
                                        <TableCell className="text-center align-middle">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteRow(i)}>
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

            {/* Footer Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                {/* Left: Remarks */}
                <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <ReadOnlyField label="Order No." value="-" />
                        <ReadOnlyField label="Invoice No." value={selectedReturn?.invoiceNo || ""} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide font-bold text-slate-500">Remarks</Label>
                        <Textarea 
                            readOnly={!isEditable} 
                            className={`min-h-[100px] resize-none border-slate-200 text-slate-700 rounded-lg ${!isEditable ? 'bg-slate-50' : 'bg-white focus:ring-blue-500'}`}
                            value={selectedReturn?.remarks || ""} 
                            onChange={(e) => {
                                if (selectedReturn) {
                                    setSelectedReturn({ ...selectedReturn, remarks: e.target.value });
                                }
                            }}
                            placeholder="Add remarks here..."
                        />
                    </div>
                </div>

                {/* Right: Financials */}
                <div className="space-y-5">
                    
                    {/* Card 1: Totals */}
                    <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                        
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Gross Amount</span>
                            <span className="font-semibold text-slate-800">
                                ₱{details.reduce((acc, i) => acc + (i.grossAmount || (i.quantity * i.unitPrice)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Discount Amount</span>
                            <span className="font-semibold text-slate-800">
                                ₱{details.reduce((acc, i) => acc + (i.discountAmount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        
                        <div className="h-px bg-slate-100 my-3"></div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-slate-900 font-bold text-base">Net Amount</span>
                            <span className="font-bold text-blue-700 text-xl">
                                ₱{details.reduce((acc, i) => acc + (i.totalAmount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Expanded Status Details */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Applied</span>
                            <span className="font-medium text-slate-900">No</span> 
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Date Applied</span>
                            <span className="font-medium text-slate-900">-</span> 
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Transaction Status</span>
                            <span className="font-medium text-slate-900">
                                {selectedReturn?.status === 'Pending' ? 'Viewing' : 'Closed'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Posted</span>
                            <span className="font-medium text-slate-900">No</span> 
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Received</span>
                            <span className="font-bold text-slate-900">
                                {selectedReturn?.status === 'Received' ? "Yes" : "No"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Applied To</span>
                            <span className="font-medium text-slate-900">-</span> 
                        </div>
                    </div>
                </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="border-t border-slate-100 p-5 bg-white flex justify-end gap-3 sticky bottom-0 z-20">
              <Button 
                variant="outline" 
                className="gap-2 bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                onClick={() => handlePrint()} 
              >
                 <Printer className="h-4 w-4" /> Print Return Slip
              </Button>
              
              <Button variant="outline" className="bg-white text-slate-700 border-slate-300 min-w-[90px] hover:bg-slate-50" onClick={() => setSelectedReturn(null)}>
                  Close
              </Button>

              {isEditable && (
                <>
                    <Button 
                       className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px] shadow-sm shadow-emerald-200" 
                       onClick={handleReceiveClick}
                    >
                        Receive
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white min-w-[160px] shadow-md shadow-blue-200" onClick={handleUpdateReturn}>
                        Update Sales Return
                    </Button>
                </>
              )}
          </div>

        </DialogContent>
      </Dialog>
      
      {/* --- HIDDEN PRINT COMPONENT --- */}
      <div style={{ display: "none" }}>
        <SalesReturnPrintSlip ref={printComponentRef} data={printData} />
      </div>

      {/* --- CREATE MODAL --- */}
      <CreateSalesReturnModal 
        isOpen={isCreateOpen} 
        onClose={() => {
            setCreateOpen(false);
            loadHistory(); 
        }} 
        onSuccess={() => {
            console.log("New Return Created - Refreshing List...");
            loadHistory(); 
        }}
      />

      {/* --- CONFIRM RECEIVE MODAL --- */}
      <Dialog open={isConfirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-[400px] p-6 bg-white rounded-xl shadow-2xl border-0">
          
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-lg font-bold text-slate-800">
                Confirm Receipt
              </DialogTitle>
              <div className="text-sm text-slate-500 leading-relaxed">
                Are you sure you want to mark Return <span className="font-bold text-slate-700">{selectedReturn?.returnNo}</span> as <span className="font-bold text-green-600">RECEIVED</span>?
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setConfirmOpen(false)}
              disabled={isReceiving}
              className="h-11 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
            >
              Cancel
            </Button>
            
            <Button 
              onClick={handleConfirmReceive} 
              disabled={isReceiving}
              className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md shadow-emerald-100"
            >
              {isReceiving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
            </Button>
          </div>

        </DialogContent>
      </Dialog>

      {/* 🟢 NEW PRODUCT LOOKUP MODAL (Attached to Edit Screen) */}
      <div className="relative z-[9999]"> {/* Wrapped in high Z-index to force display on top */}
        <ProductLookupModal 
            isOpen={isProductLookupOpen} 
            onClose={() => setIsProductLookupOpen(false)} 
            onConfirm={handleAddProductsToEdit} 
        />
      </div>

    </div>
  );
}