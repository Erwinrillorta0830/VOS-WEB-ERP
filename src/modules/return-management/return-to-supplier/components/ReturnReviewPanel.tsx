"use client";

import React from "react";
import { Trash2, FileText, Calculator } from "lucide-react";
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
  readOnly?: boolean; // <--- NEW PROP
}

export function ReturnReviewPanel({
  items,
  lineDiscounts = [],
  onUpdateItem,
  onRemoveItem,
  remarks,
  setRemarks,
  readOnly = false, // Default to false
}: ReturnReviewPanelProps) {
  
  const totalItems = items.length;
  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);

  const grossAmount = items.reduce((acc, item) => {
    const finalPrice = item.customPrice ?? item.price;
    return acc + (finalPrice * item.quantity);
  }, 0);

  const totalDiscount = items.reduce((acc, item) => {
    const finalPrice = item.customPrice ?? item.price;
    const lineTotal = finalPrice * item.quantity;
    return acc + (lineTotal * (item.discount / 100));
  }, 0);

  const netAmount = grossAmount - totalDiscount;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out gap-6">
      
      {/* TABLE SECTION */}
      <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden flex-1 flex flex-col min-h-[300px]">
        <div className="overflow-auto custom-scrollbar flex-1 max-h-[450px]"> 
            <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                <TableRow className="hover:bg-slate-50 h-11">
                    <TableHead className="w-[100px] text-xs font-bold text-slate-900 pl-4">Code</TableHead>
                    <TableHead className="text-xs font-bold text-slate-900 min-w-[200px]">Product Name</TableHead>
                    <TableHead className="w-[80px] text-xs font-bold text-slate-900">Unit</TableHead>
                    <TableHead className="w-[80px] text-xs font-bold text-slate-900 text-center">On Hand</TableHead>
                    <TableHead className="w-[100px] text-xs font-bold text-slate-900 text-center">Return Qty</TableHead>
                    <TableHead className="w-[120px] text-xs font-bold text-slate-900">Unit Price</TableHead>
                    <TableHead className="w-[160px] text-xs font-bold text-slate-900 text-center">Discount</TableHead>
                    <TableHead className="w-[120px] text-xs font-bold text-slate-900 text-right">Total</TableHead>
                    {!readOnly && <TableHead className="w-[60px] text-xs font-bold text-slate-900 text-center pr-4">Action</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item) => {
                const price = item.customPrice ?? item.price;
                const lineTotal = (price * item.quantity) * (1 - item.discount / 100);
                
                const currentDiscountCode = lineDiscounts.find(
                    (ld) => parseFloat(ld.percentage) === item.discount
                )?.line_discount || "custom";

                return (
                    <TableRow key={item.id} className="hover:bg-blue-50/30 group transition-colors border-slate-100">
                        {/* Code */}
                        <TableCell className="text-xs font-semibold text-slate-500 pl-4 py-3 font-mono bg-slate-50/30">
                            {item.code}
                        </TableCell>
                        
                        {/* Product Name */}
                        <TableCell className="text-sm text-slate-900 font-bold leading-tight py-3">
                            {item.name}
                        </TableCell>
                        
                        {/* Unit */}
                        <TableCell className="py-3">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase">
                                {item.unit}
                            </span>
                        </TableCell>
                        
                        {/* On Hand */}
                        <TableCell className="text-xs text-center text-slate-500 py-3">
                            {item.onHand}
                        </TableCell>
                        
                        {/* Quantity Input */}
                        <TableCell className="py-3">
                            <div className="flex justify-center">
                                {readOnly ? (
                                    <span className="font-bold text-slate-900 text-sm">{item.quantity}</span>
                                ) : (
                                    <Input
                                        type="number"
                                        min={1}
                                        className="h-9 w-20 text-sm text-center bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-sm transition-all font-bold text-slate-900 rounded-lg"
                                        value={item.quantity}
                                        onChange={(e) => onUpdateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                                    />
                                )}
                            </div>
                        </TableCell>
                        
                        {/* Price Input */}
                        <TableCell className="py-3">
                            <div className="relative w-28">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">₱</span>
                                {readOnly ? (
                                    <div className="h-9 pl-6 flex items-center text-sm font-medium text-slate-700">
                                        {item.customPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                ) : (
                                    <Input
                                        type="number"
                                        min={0}
                                        className="h-9 pl-6 text-sm bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-sm transition-all font-medium text-slate-700 rounded-lg"
                                        value={item.customPrice}
                                        onChange={(e) => onUpdateItem(item.id, "customPrice", parseFloat(e.target.value) || 0)}
                                    />
                                )}
                            </div>
                        </TableCell>    
                        
                        {/* Discount Logic */}
                        <TableCell className="py-3">
                            {readOnly ? (
                                <div className="text-center text-sm">
                                    {item.discount > 0 ? (
                                        <span className="text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                            {item.discount}%
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={currentDiscountCode}
                                        onValueChange={(val) => {
                                            if (val === "custom") return; 
                                            if (val === "none") {
                                                onUpdateItem(item.id, "discount", 0);
                                                return;
                                            }
                                            const selected = lineDiscounts.find((ld) => ld.line_discount === val);
                                            if (selected) {
                                                onUpdateItem(item.id, "discount", parseFloat(selected.percentage));
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-9 w-[70px] text-xs px-2 bg-slate-50 border-slate-200">
                                            <SelectValue placeholder="-" />
                                        </SelectTrigger>
                                        
                                        <SelectContent position="popper" className="max-h-[200px] w-[180px]">
                                            <SelectItem value="none" className="text-xs">None</SelectItem>
                                            {lineDiscounts.map((ld) => (
                                                <SelectItem key={ld.id} value={ld.line_discount} className="text-xs">
                                                    <span className="font-bold">{ld.line_discount}</span> 
                                                    <span className="text-slate-500 ml-1">
                                                        ({parseFloat(ld.percentage)}%)
                                                    </span>
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="custom" className="hidden">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Manual Override */}
                                    <div className="relative flex-1">
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            className={`h-9 w-full text-sm text-center bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-sm transition-all rounded-lg font-medium text-slate-700 ${item.discount > 0 ? 'text-orange-600 font-bold border-orange-200 bg-orange-50' : ''}`}
                                            value={item.discount}
                                            onChange={(e) => onUpdateItem(item.id, "discount", parseFloat(e.target.value) || 0)}
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                                    </div>
                                </div>
                            )}
                        </TableCell>
                        
                        {/* Total Line */}
                        <TableCell className="text-sm font-bold text-slate-900 text-right tabular-nums pr-4 py-3">
                            {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        
                        {/* DELETE ACTION - Hidden in ReadOnly */}
                        {!readOnly && (
                            <TableCell className="text-center py-3 pr-4">
                                <div className="flex justify-center items-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 bg-red-500 text-white hover:bg-red-600 hover:shadow-red-200 hover:shadow-md transition-all duration-200 rounded-lg shadow-sm"
                                        onClick={() => onRemoveItem(item.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        )}
                    </TableRow>
                );
                })}
            </TableBody>
            </Table>
        </div>
      </div>

      {/* FOOTER SUMMARY & REMARKS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Remarks Section */}
        <div className="lg:col-span-8 flex flex-col gap-2">
          <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            Transaction Remarks
          </Label>
          <div className="relative flex-1">
             {readOnly ? (
                 <div className="w-full h-full min-h-[120px] p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-medium">
                     {remarks || "No remarks provided."}
                 </div>
             ) : (
                <Textarea
                    placeholder="Enter detailed reasons for this return (Optional)..."
                    className="resize-none w-full h-full min-h-[120px] text-sm p-4 rounded-xl shadow-sm transition-all bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400 text-slate-700 font-medium"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                />
             )}
          </div>
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-slate-400" />
                Return Summary
            </h4>
            
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Total Line Items</span>
                    <span className="font-bold text-slate-900">{totalItems}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Total Quantity</span>
                    <span className="font-bold text-slate-900">{totalQuantity} units</span>
                </div>
                
                <Separator className="bg-slate-100 my-2" />
                
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Gross Amount</span>
                    <span className="font-semibold tabular-nums text-slate-700">₱ {grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {totalDiscount > 0 && (
                    <div className="flex justify-between text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                        <span className="font-medium">Total Discount</span>
                        <span className="font-bold tabular-nums">- ₱ {totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                )}
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Net Amount</span>
                <span className="text-2xl font-extrabold text-blue-600 tabular-nums tracking-tight leading-none">
                    ₱ {netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}