// src/modules/return-to-supplier/components/ReturnReviewPanel.tsx

"use client";

import React, { useState, useEffect } from "react";
import { FileText, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CartItem, LineDiscount } from "../type";

interface ReturnReviewPanelProps {
  items: CartItem[];
  lineDiscounts: LineDiscount[];
  onUpdateItem: (id: string, field: keyof CartItem, value: number) => void;
  onRemoveItem: (id: string) => void;
  remarks: string;
  setRemarks: (val: string) => void;
  readOnly?: boolean;
}

export function ReturnReviewPanel({
  items,
  lineDiscounts = [],
  onUpdateItem,
  onRemoveItem, // Kept in props for API consistency but not used in Table
  remarks,
  setRemarks,
  readOnly = false,
}: ReturnReviewPanelProps) {
  const [localRemarks, setLocalRemarks] = useState(remarks);

  useEffect(() => {
    setLocalRemarks(remarks);
  }, [remarks]);

  const totalItems = items.length;
  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
  const grossAmount = items.reduce(
    (acc, item) => acc + (item.customPrice ?? item.price) * item.quantity,
    0,
  );
  const totalDiscount = items.reduce((acc, item) => {
    const price = item.customPrice ?? item.price;
    return acc + price * item.quantity * (item.discount / 100);
  }, 0);
  const netAmount = grossAmount - totalDiscount;

  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* TABLE SECTION */}
      <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow className="hover:bg-slate-50 h-11">
                <TableHead className="w-[100px] text-xs font-bold text-slate-900 pl-4">
                  Code
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-900 min-w-[200px]">
                  Product Name
                </TableHead>
                <TableHead className="w-20 text-xs font-bold text-slate-900">
                  Unit
                </TableHead>
                <TableHead className="w-[100px] text-xs font-bold text-slate-900 text-center">
                  Quantity
                </TableHead>
                {/* [REV-4] Fixed Alignment to Right for Currency */}
                <TableHead className="w-[120px] text-xs font-bold text-slate-900 text-right">
                  Unit Price
                </TableHead>
                <TableHead className="w-40 text-xs font-bold text-slate-900 text-right">
                  Discount
                </TableHead>
                {/* [REV-4] Fixed Alignment to Right for Currency */}
                <TableHead className="w-[120px] text-xs font-bold text-slate-900 text-right pr-4">
                  Total
                </TableHead>
                {/* [REV-4] Removed Action Column as requested */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const price = item.customPrice ?? item.price;
                const lineTotal =
                  price * item.quantity * (1 - item.discount / 100);
                const currentDiscountCode =
                  lineDiscounts.find(
                    (ld) => parseFloat(ld.percentage) === item.discount,
                  )?.line_discount || "custom";

                return (
                  <TableRow
                    key={item.id}
                    className="hover:bg-blue-50/30 group transition-colors border-slate-100"
                  >
                    <TableCell className="text-xs font-semibold text-slate-500 pl-4 py-3 font-mono bg-slate-50/30">
                      {item.code}
                    </TableCell>
                    <TableCell className="text-sm text-slate-900 font-bold leading-tight py-3">
                      {item.name}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase">
                        {item.unit}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex justify-center">
                        {readOnly ? (
                          <span className="font-bold text-slate-900 text-sm">
                            {item.quantity}
                          </span>
                        ) : (
                          <Input
                            type="number"
                            min={0} // Changed to 0 so user can "remove" by setting 0 if action col is gone
                            className="h-9 w-20 text-sm text-right bg-white border-slate-200 font-bold text-slate-900 rounded-lg"
                            value={item.quantity}
                            onChange={(e) =>
                              onUpdateItem(
                                item.id,
                                "quantity",
                                parseInt(e.target.value) || 0,
                              )
                            }
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="relative w-full flex justify-end">
                        {readOnly ? (
                          <div className="h-9 flex items-center text-sm font-medium text-slate-700">
                            <span className="text-xs text-slate-400 mr-1">
                              ₱
                            </span>
                            {item.customPrice?.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        ) : (
                          <div className="relative w-28">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                              ₱
                            </span>
                            <Input
                              type="number"
                              min={0}
                              className="h-9 pl-6 text-sm bg-white border-slate-200 font-medium text-slate-700 rounded-lg text-right"
                              value={item.customPrice ?? item.price}
                              onChange={(e) =>
                                onUpdateItem(
                                  item.id,
                                  "customPrice",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {readOnly ? (
                        <div className="text-right text-sm">
                          {item.discount > 0 ? (
                            <span className="text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-100">
                              {item.discount}%
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Select
                            value={currentDiscountCode}
                            onValueChange={(val) => {
                              if (val === "custom") return;
                              if (val === "none") {
                                onUpdateItem(item.id, "discount", 0);
                                return;
                              }
                              const selected = lineDiscounts.find(
                                (ld) => ld.line_discount === val,
                              );
                              if (selected)
                                onUpdateItem(
                                  item.id,
                                  "discount",
                                  parseFloat(selected.percentage),
                                );
                            }}
                          >
                            <SelectTrigger className="h-9 w-[70px] text-xs px-2 bg-slate-50 border-slate-200">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent
                              position="popper"
                              className="max-h-[200px] w-[180px]"
                            >
                              <SelectItem value="none" className="text-xs">
                                None
                              </SelectItem>
                              {lineDiscounts.map((ld) => (
                                <SelectItem
                                  key={ld.id}
                                  value={ld.line_discount}
                                  className="text-xs"
                                >
                                  <span className="font-bold">
                                    {ld.line_discount}
                                  </span>
                                  <span className="text-slate-500 ml-1">
                                    ({parseFloat(ld.percentage)}%)
                                  </span>
                                </SelectItem>
                              ))}
                              <SelectItem value="custom" className="hidden">
                                Custom
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="relative flex-1 max-w-20">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              className={`h-9 w-full text-sm text-center bg-white border-slate-200 font-medium text-slate-700 ${
                                item.discount > 0
                                  ? "text-orange-600 font-bold border-orange-200 bg-orange-50"
                                  : ""
                              }`}
                              value={item.discount}
                              onChange={(e) =>
                                onUpdateItem(
                                  item.id,
                                  "discount",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                              %
                            </span>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    {/* [REV-4] Fixed Alignment to Right and Padding */}
                    <TableCell className="text-sm font-bold text-slate-900 text-right tabular-nums pr-4 py-3">
                      {lineTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    {/* [REV-4] Removed Action Cell */}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-2">
          <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" /> Transaction Remarks
          </Label>
          <div className="relative flex-1">
            {readOnly ? (
              <div className="w-full h-full min-h-[120px] p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-medium">
                {remarks || "No remarks provided."}
              </div>
            ) : (
              <Textarea
                placeholder="Enter detailed reasons for this return (Optional)..."
                className="resize-none w-full h-full min-h-[120px] text-sm p-4 rounded-xl shadow-sm transition-all bg-white border-slate-200 focus:border-blue-500 font-medium"
                value={localRemarks}
                onChange={(e) => setLocalRemarks(e.target.value)}
                onBlur={() => setRemarks(localRemarks)}
              />
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-blue-600" />
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-slate-400" /> Return Summary
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">
                  Total Line Items
                </span>
                <span className="font-bold text-slate-900">{totalItems}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">
                  Total Quantity
                </span>
                <span className="font-bold text-slate-900">
                  {totalQuantity} units
                </span>
              </div>
              <Separator className="bg-slate-100 my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Gross Amount</span>
                <span className="font-semibold tabular-nums text-slate-700">
                  ₱{" "}
                  {grossAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                  <span className="font-medium">Total Discount</span>
                  <span className="font-bold tabular-nums">
                    - ₱{" "}
                    {totalDiscount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Net Amount
              </span>
              <span className="text-2xl font-extrabold text-blue-600 tabular-nums tracking-tight leading-none">
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
  );
}
