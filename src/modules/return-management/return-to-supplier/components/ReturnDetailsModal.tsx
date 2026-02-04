"use client";

import React, { useRef, useEffect, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, X, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// Types & API
import { ReturnToSupplier, RTSItem } from "../type";
import { ReturnToSupplierProvider } from "../providers/api";
import {
  PrintableReturnSlip,
  ReturnItem,
} from "../components/PrintableReturnSlip";

interface ReturnDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReturnToSupplier | null;
}

export function ReturnDetailsModal({
  isOpen,
  onClose,
  data,
}: ReturnDetailsModalProps) {
  const componentRef = useRef<HTMLDivElement>(null);

  // State for fetched items
  const [items, setItems] = useState<RTSItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Fetch items when data changes
  useEffect(() => {
    if (isOpen && data) {
      const fetchItems = async () => {
        setLoadingItems(true);
        try {
          const fetchedItems = await ReturnToSupplierProvider.getReturnItems(
            data.id,
          );
          setItems(fetchedItems);
        } catch (err) {
          console.error("Failed to load return items", err);
        } finally {
          setLoadingItems(false);
        }
      };
      fetchItems();
    } else {
      setItems([]);
    }
  }, [isOpen, data]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: data ? `${data.returnNo}_ReturnSlip` : "Return_Slip",
    pageStyle: `
      @page { size: auto; margin: 15mm; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    `,
  });

  if (!data) return null;

  const isPosted = data.status === "Posted";

  // Calculate Summary
  const totalItems = items.length;
  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
  const grossAmount = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const netAmount = items.reduce((acc, item) => acc + item.total, 0);
  const totalDiscount = grossAmount - netAmount;

  // Convert for printable component
  const printableItems: ReturnItem[] = items.map((i) => ({
    code: i.code,
    name: i.name,
    unit: i.unit,
    quantity: i.quantity,
    price: i.price,
    discount: i.discountRate,
    total: i.total,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Width Fix: Force wide modal on desktop, override default close button behavior */}
      <DialogContent className="max-w-[1200px]! w-[90vw]! h-[90vh] bg-white p-0 gap-0 overflow-hidden shadow-2xl flex flex-col sm:rounded-xl border border-slate-200 [&>button]:hidden">
        {/* --- HEADER --- */}
        <div className="flex flex-row items-center justify-between px-8 py-6 bg-white shrink-0 border-b border-slate-100">
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Return Details
            </DialogTitle>
            <div className="flex items-center gap-3 text-sm mt-1">
              <Badge
                variant="secondary"
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-sm font-bold border border-blue-100 px-2"
              >
                {data.returnNo}
              </Badge>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-medium">
                {new Date(data.returnDate).toLocaleDateString()}
              </span>
            </div>
          </div>
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white rounded-md w-8 h-8 transition-colors shadow-sm"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* --- SCROLLABLE BODY --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 bg-white">
          {/* 1. INFO CARD */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="space-y-6">
              {/* Row 1: Supplier | Branch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Supplier
                  </Label>
                  <div className="flex items-center px-3 h-10 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 shadow-sm">
                    {data.supplier}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Branch
                  </Label>
                  <div className="flex items-center px-3 h-10 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 shadow-sm">
                    {data.branch}
                  </div>
                </div>
              </div>

              {/* Row 2: Ref No. | Status | Return Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Document Ref No.
                  </Label>
                  <div className="flex items-center px-3 h-10 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 shadow-sm">
                    {data.returnNo}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Status
                  </Label>
                  <div
                    className={`flex items-center px-3 h-10 rounded-md border text-sm font-bold shadow-sm ${
                      isPosted
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}
                  >
                    {data.status}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Return Date
                  </Label>
                  <div className="flex items-center px-3 h-10 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 shadow-sm">
                    {new Date(data.returnDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. PRODUCTS TABLE */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
              <h3 className="text-lg font-bold text-slate-900">
                Products Summary
              </h3>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm ring-1 ring-slate-100">
              <Table>
                <TableHeader className="bg-blue-600!">
                  <TableRow className="bg-blue-600! border-none">
                    <TableHead className="text-white font-bold text-xs uppercase h-10 pl-6 w-[15%]">
                      Code
                    </TableHead>
                    <TableHead className="text-white font-bold text-xs uppercase h-10 w-[30%]">
                      Description
                    </TableHead>
                    <TableHead className="text-white font-bold text-xs uppercase h-10 text-center w-[10%]">
                      Unit
                    </TableHead>
                    <TableHead className="text-white font-bold text-xs uppercase h-10 text-center w-[10%]">
                      Qty
                    </TableHead>
                    <TableHead className="text-white font-bold text-xs uppercase h-10 text-right w-[10%]">
                      Price
                    </TableHead>
                    <TableHead className="text-white font-bold text-xs uppercase h-10 text-right w-[10%]">
                      Discount
                    </TableHead>
                    <TableHead className="text-white font-bold text-xs uppercase h-10 text-right w-[15%] pr-6">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingItems ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-500" />
                          <p className="text-sm font-medium">
                            Loading items...
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-32 text-center text-slate-500 italic"
                      >
                        No items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, i) => (
                      <TableRow
                        key={i}
                        className="hover:bg-slate-50 border-b border-slate-100 last:border-0 group"
                      >
                        <TableCell className="font-bold text-slate-700 text-xs pl-6 py-4">
                          {item.code}
                        </TableCell>
                        <TableCell className="font-medium text-slate-800 text-sm py-4">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <Badge
                            variant="secondary"
                            className="font-normal text-xs bg-slate-100 text-slate-600 border-slate-200"
                          >
                            {item.unit}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-900 py-4 bg-slate-50/50">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right text-slate-600 text-sm py-4">
                          {item.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right text-slate-600 text-sm py-4">
                          {item.discountAmount > 0
                            ? item.discountAmount.toFixed(2)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-blue-600 pr-6 py-4 bg-slate-50/30">
                          {item.total.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 3. FOOTER GRID (Remarks & Summary Side-by-Side) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-4">
            {/* Left: Remarks */}
            <div className="lg:col-span-2 space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Remarks
              </Label>
              <div className="p-4 bg-white rounded-xl text-sm text-slate-700 border border-slate-200 min-h-40 shadow-sm relative">
                {data.remarks ? (
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {data.remarks}
                  </p>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 italic">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 opacity-50" /> No remarks
                      provided
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Totals Card */}
            <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full flex flex-col justify-center ring-1 ring-slate-50">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-500">
                    Total Items
                  </span>
                  <span className="font-bold text-slate-900">{totalItems}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-500">
                    Total Quantity
                  </span>
                  <span className="font-bold text-slate-900">
                    {totalQuantity}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-dashed border-slate-200 pt-3">
                  <span className="font-medium text-slate-500">
                    Gross Amount
                  </span>
                  <span className="font-bold text-slate-800">
                    ₱{" "}
                    {grossAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-500">
                    Discount Amount
                  </span>
                  <span className="font-bold text-slate-800">
                    ₱{" "}
                    {totalDiscount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="border-t border-dashed border-slate-200 my-2"></div>
                <div className="flex justify-between items-end bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <span className="font-bold text-lg text-slate-900">
                    Net Amount
                  </span>
                  <span className="font-extrabold text-2xl text-blue-600">
                    ₱{" "}
                    {netAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- FOOTER BUTTONS --- */}
        <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <Button
            variant="outline"
            className="h-10 border-slate-200 text-slate-700 gap-2 bg-white hover:bg-slate-50 shadow-sm"
            onClick={() => handlePrint()}
          >
            <Printer className="h-4 w-4" /> Print Slip
          </Button>
          <Button
            variant="outline"
            className="h-10 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Hidden Printable Component */}
      <div
        style={{
          position: "absolute",
          top: "-10000px",
          left: "-10000px",
          zIndex: -10,
        }}
      >
        <PrintableReturnSlip
          ref={componentRef}
          data={data}
          items={printableItems}
        />
      </div>
    </Dialog>
  );
}
