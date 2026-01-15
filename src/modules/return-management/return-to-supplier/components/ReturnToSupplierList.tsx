"use client";

import React, { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, Eye, Search, Filter, Loader2, Plus } from "lucide-react";
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
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PrintableReturnSlip, ReturnItem } from "../components/PrintableReturnSlip";
import { CreateReturnModal } from "./CreateReturnModal"; // <--- IMPORT THE MODAL

// --- MODAL COMPONENT (View Details) ---
function ReturnDetailsModal({ 
  isOpen, 
  onClose, 
  data 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  data: ReturnToSupplier | null 
}) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef, 
    documentTitle: data ? `${data.returnNo}_ReturnSlip` : "Return_Slip",
    pageStyle: `
      @page { size: auto; margin: 15mm; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    `
  });

  if (!data) return null;

  const isPosted = data.status === "Posted";
  
  // MOCK ITEMS (For view only)
  const productItems: ReturnItem[] = [
    { code: "MOCK-001", name: "Mock Product Data (Fetch items by ID needed)", unit: "PCS", quantity: 1, price: 0, discount: 0, total: 0 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[85vw] w-full bg-white p-0 overflow-hidden flex flex-col max-h-[90vh] shadow-lg rounded-md">
        
        {/* HEADER */}
        <div className="flex items-start justify-between p-6 border-b pb-4 bg-white pr-12 relative">
          <div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {isPosted ? "View Return to Supplier" : "Edit Return to Supplier"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">{data.returnNo}</p>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => handlePrint()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase">Supplier</span>
              <div className="font-medium text-gray-900 text-base">{data.supplier}</div>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase">Branch</span>
              <div className="font-medium text-gray-900 text-base uppercase">{data.branch}</div>
            </div>
            <div className="space-y-1.5">
               <span className="text-xs font-semibold text-gray-500 uppercase">Return Date</span>
               <div className="font-medium text-gray-900 text-base">{data.returnDate}</div>
            </div>
            <div className="space-y-1.5">
               <span className="text-xs font-semibold text-gray-500 uppercase">Status</span>
               <Badge variant="secondary" className={`rounded-sm px-2 py-0.5 font-medium text-sm ${isPosted ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                 {data.status}
               </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-gray-900">Products</h3>
            <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   <TableRow>
                     <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                       To view items, implement `getReturnItems(id)` API
                     </TableCell>
                   </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">Remarks</label>
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-md text-sm text-gray-700">
               {data.remarks || "No remarks provided."}
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-white flex justify-end gap-3">
             <Button variant="outline" className="h-10 px-6 border-gray-300" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
      
      <div style={{ position: "absolute", top: "-10000px", left: "-10000px", zIndex: -10 }}>
        <PrintableReturnSlip ref={componentRef} data={data} items={productItems} />
      </div>
    </Dialog>
  );
}


// --- MAIN LIST COMPONENT ---
export function ReturnToSupplierList() {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // <--- NEW STATE FOR CREATE MODAL
  const [selectedReturn, setSelectedReturn] = useState<ReturnToSupplier | null>(null);
  
  // 1. DATA STATES
  const [data, setData] = useState<ReturnToSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. FILTER STATES
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Posted">("All");

  // 3. FETCH DATA FUNCTION
  const fetchReturns = async () => {
    setLoading(true);
    try {
      const result = await ReturnToSupplierProvider.getReturnTransactions(
        searchQuery,
        statusFilter
      );
      setData(result);
    } catch (error) {
      console.error("Failed to fetch returns", error);
    } finally {
      setLoading(false);
    }
  };

  // 4. USE EFFECT (Trigger fetch on mount and when filters change)
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

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
         <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Return to Supplier</h1>
            <p className="text-muted-foreground text-sm">Manage returns of goods and bad stocks to suppliers</p>
         </div>
         {/* THE CREATE BUTTON */}
        
      </div>

      {/* FILTER SECTION */}
      <div className="flex flex-col sm:flex-row gap-3">
        
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by Return No..."
            className="pl-9 w-full bg-white border-gray-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-[180px]">
          <Select 
            value={statusFilter} 
            onValueChange={(val: any) => setStatusFilter(val)}
          >
            <SelectTrigger className="bg-white">
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
      <div className="border rounded-md bg-white shadow-sm min-h-[300px]">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold text-xs uppercase text-gray-500">Return No.</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-gray-500">Supplier</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-gray-500">Branch</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-gray-500">Return Date</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-gray-500 text-right">Total Amount</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-gray-500">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-gray-500">Remarks</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-gray-500 text-center">Actions</TableHead>
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
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                  No return transactions found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-blue-600 cursor-pointer hover:underline text-xs" onClick={() => handleViewDetails(item)}>
                    {item.returnNo}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-900">{item.supplier}</TableCell>
                  <TableCell className="text-xs text-gray-500 uppercase">{item.branch}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(item.returnDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-right text-gray-900">
                    {item.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`
                        px-2 py-0.5 text-xs font-normal border-0
                        ${item.status === 'Posted' 
                          ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                          : 'bg-orange-100 text-orange-700 hover:bg-orange-100'
                        }
                      `}
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 truncate max-w-[200px]">
                    {item.remarks}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
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
      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-gray-500">
          Showing {data.length} results
        </p>
        <Pagination className="w-auto mx-0">
          <PaginationContent>
            <PaginationItem>
              <Button variant="outline" className="h-8 px-3 border-gray-200" disabled>Previous</Button>
            </PaginationItem>
            <PaginationItem>
                <Button variant="default" className="h-8 w-8 bg-blue-600 hover:bg-blue-700">1</Button>
            </PaginationItem>
            <PaginationItem>
                <Button variant="outline" className="h-8 px-3 border-gray-200">Next</Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <ReturnDetailsModal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        data={selectedReturn} 
      />

      {/* CREATE RETURN MODAL */}
      <CreateReturnModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onReturnCreated={fetchReturns} 
      />
    </div>
  );
} 