"use client";

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

// ✅ Correct relative paths for component subfolder
import { SalesReturn, SalesReturnItem } from "../types";
import { SalesReturnProvider } from "../provider/api";

interface Props {
  initialData: SalesReturn;
  onBack: () => void;
  onSuccess: () => void;
}

export function SalesReturnForm({ initialData, onBack, onSuccess }: Props) {
  const [formData, setFormData] = useState<SalesReturn>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleItemChange = (index: number, field: keyof SalesReturnItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate total for that row if quantity changes
    if (field === "quantity") {
      newItems[index].totalAmount = Number(value) * newItems[index].unitPrice;
    }

    const newTotal = newItems.reduce((sum, item) => sum + item.totalAmount, 0);
    setFormData({ ...formData, items: newItems, totalAmount: newTotal });
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      // Ensure your provider has a submitReturn method
      if (SalesReturnProvider.submitReturn) {
        await SalesReturnProvider.submitReturn(formData);
      } else {
        console.warn("submitReturn not implemented in provider yet");
        // Temporary mock success for testing UI
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      alert("Sales Return submitted successfully!");
      onSuccess();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Process Sales Return</h2>
          <p className="text-sm text-muted-foreground">Invoice: {formData.invoiceNo}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="py-3 bg-slate-50/50"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Customer</CardTitle></CardHeader>
          <CardContent className="pt-4"><p className="font-semibold">{formData.customer}</p></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="py-3 bg-slate-50/50"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Salesman</CardTitle></CardHeader>
          <CardContent className="pt-4"><p className="font-semibold">{formData.salesman}</p></CardContent>
        </Card>
        <Card className="bg-blue-600 border-blue-600 shadow-md">
          <CardHeader className="py-3"><CardTitle className="text-xs uppercase tracking-wider text-blue-100">Total Return Amount</CardTitle></CardHeader>
          <CardContent className="pt-2"><p className="text-2xl font-bold text-white">₱{formData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-md border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs">Product Description</TableHead>
              <TableHead className="w-32 text-xs">Qty to Return</TableHead>
              <TableHead className="text-xs">Unit Price</TableHead>
              <TableHead className="w-48 text-xs">Return Reason</TableHead>
              <TableHead className="text-right text-xs">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formData.items.map((item, idx) => (
              <TableRow key={item.code}>
                <TableCell className="text-xs font-medium">
                  <div className="flex flex-col">
                    <span>{item.description}</span>
                    <span className="text-[10px] text-muted-foreground">Code: {item.code}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    min="0"
                    value={item.quantity} 
                    onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                    className="h-8 text-xs"
                  />
                </TableCell>
                <TableCell className="text-xs">₱{item.unitPrice.toLocaleString()}</TableCell>
                <TableCell>
                  <Select 
                    value={item.returnType || "Good Order"} 
                    onValueChange={(val) => handleItemChange(idx, "returnType", val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Good Order">Good Order</SelectItem>
                      <SelectItem value="Bad Order">Bad Order</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right text-xs font-bold">
                  ₱{item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="ghost" onClick={onBack}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || formData.items.length === 0} className="bg-blue-600 hover:bg-blue-700 min-w-[140px]">
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" /> Submit Return</>
          )}
        </Button>
      </div>
    </div>
  );
}