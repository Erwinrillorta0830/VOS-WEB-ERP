"use client"

import { useState } from "react";
import { Printer, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  } from "@/components/ui/select"
import { SalesReturn, ReturnItem } from "../types";
import { AddProductModal } from "./AddProductModal";
import { Product } from "../data/mock-products";

interface SalesReturnFormProps {
  initialData: SalesReturn;
  onBack: () => void;
}

export function SalesReturnForm({ initialData, onBack }: SalesReturnFormProps) {
  const [data, setData] = useState(initialData);
  const [isReceived, setIsReceived] = useState(initialData.status === 'Received');
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

  // --- LOGIC ---
  const isNewMode = data.returnNo === 'NEW'; 
  const isViewMode = isReceived && !isNewMode; 

  // Title Logic
  let formTitle = "Edit Sales Return";
  if (isNewMode) formTitle = "Create Sales Return"; 
  else if (isViewMode) formTitle = "View Sales Return";

  const handleReceive = () => {
    setIsReceived(true);
    setData(prev => ({...prev, status: 'Received'}));
  };

  // Helper to format date string to YYYY-MM-DD for input type="date"
  const formatDateForInput = (dateString: string | undefined) => {
    if (!dateString) return new Date().toISOString().split('T')[0];
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    return dateString;
  };

  // HANDLER: Delete an item from the list
  const handleDeleteItem = (indexToDelete: number) => {
    setData((prev) => {
        // 1. Remove the item
        const updatedItems = prev.items.filter((_, idx) => idx !== indexToDelete);
        
        // 2. Recalculate the Total Amount based on remaining items
        const newTotalAmount = updatedItems.reduce((acc, item) => acc + item.totalAmount, 0);

        return {
            ...prev,
            items: updatedItems,
            totalAmount: newTotalAmount,
        };
    });
  };

  // HANDLER: Process products selected from modal
  const handleAddProductsFromModal = (selectedProducts: Product[]) => {
    const newItems: ReturnItem[] = selectedProducts.map(prod => {
        const defaultQty = 1;
        const gross = prod.unitPrice * defaultQty;
        return {
            code: prod.code,
            description: prod.description,
            unit: prod.unit,
            quantity: defaultQty,
            unitPrice: prod.unitPrice,
            grossAmount: gross,
            discountType: 'No Discount',
            discountAmount: 0,
            totalAmount: gross,
            reason: '',
            returnType: 'Bad Order'
        };
    });

    setData(prev => {
        const updatedItems = [...(prev.items || []), ...newItems];
        const newTotalAmount = updatedItems.reduce((acc, item) => acc + item.totalAmount, 0);
        return {
            ...prev,
            items: updatedItems,
            totalAmount: newTotalAmount
        };
    });
    
    setIsAddProductModalOpen(false); 
  };

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in zoom-in-95 duration-200 relative">
      
      {/* HEADER */}
      <div className="flex items-center justify-between py-4 px-6 border-b">
        <div>
           <h2 className="text-xl font-semibold">{formTitle}</h2>
           {!isNewMode && <p className="text-xs text-muted-foreground mt-1">Return No: {data.returnNo}</p>}
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-auto py-6 px-6 space-y-6">
        
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Salesman</Label>
                <Input defaultValue={data.salesman} className="h-9" readOnly={isViewMode} placeholder="Select salesman" />
            </div>
            <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Customer</Label>
                <Input defaultValue={data.customer} className="h-9" readOnly={isViewMode} placeholder="Select customer" />
            </div>

            <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Salesman Code</Label>
                <Input defaultValue={data.salesmanCode} disabled className="h-9 bg-muted/50" />
            </div>
            
            <div className="flex gap-4">
                 <div className="flex-1 space-y-1">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Customer Code</Label>
                    <Input defaultValue={data.customerCode} disabled className="h-9 bg-muted/50" />
                 </div>
                 <div className="flex items-center space-x-2 pt-6">
                    <Checkbox id="tp" defaultChecked={data.thirdParty} disabled={isViewMode} />
                    <label htmlFor="tp" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Third Party
                    </label>
                 </div>
            </div>

            <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Branch</Label>
                <Input defaultValue={data.branch} className="h-9" readOnly={isViewMode} />
            </div>
        </div>

        {/* RETURN DATE */}
        <div className="absolute top-[80px] right-12 w-1/4 space-y-1">
             <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Return Date</Label>
             <Input 
                type="date"
                defaultValue={formatDateForInput(data.returnDate)} 
                className="h-9 block" 
                readOnly={isViewMode} 
             />
        </div>

        {/* PRODUCTS TABLE SUMMARY */}
        <div className="space-y-2 pt-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">Products Summary</h3>
                {!isViewMode && (
                    <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 h-8 text-xs font-normal"
                        onClick={() => setIsAddProductModalOpen(true)}
                    >
                        <Plus className="mr-2 h-3 w-3" /> Add Product
                    </Button>
                )}
            </div>

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader className="bg-[#1d4ed8] hover:bg-[#1d4ed8]">
                        <TableRow className="hover:bg-[#1d4ed8] border-none">
                            <TableHead className="text-white h-9 text-xs font-semibold pl-4">Code</TableHead>
                            <TableHead className="text-white h-9 text-xs font-semibold w-[200px]">Description</TableHead>
                            <TableHead className="text-white h-9 text-xs font-semibold">Unit</TableHead>
                            <TableHead className="text-white h-9 text-xs font-semibold">Quantity</TableHead>
                            <TableHead className="text-white h-9 text-xs font-semibold">Unit Price</TableHead>
                            <TableHead className="text-white h-9 text-xs font-semibold">Gross Amount</TableHead>
                            <TableHead className="text-white h-9 text-xs font-semibold w-[140px]">Discount Type</TableHead>
                            <TableHead className="text-white h-9 text-xs font-semibold">Discount Amount</TableHead>
                            <TableHead className="text-white h-9 text-xs font-semibold">Total Amount</TableHead>
                            <TableHead className="text-white h-9 text-xs font-semibold w-[180px]">Reason</TableHead>
                            <TableHead className="text-white h-9 text-xs font-semibold w-[120px]">Return Type</TableHead>
                            {!isViewMode && <TableHead className="text-white h-9 text-xs font-semibold w-[40px]"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.items && data.items.length > 0 ? (
                            data.items.map((item, idx) => (
                                <TableRow key={idx} className="hover:bg-muted/50 border-b">
                                    <TableCell className="text-xs py-2 pl-4 font-medium">{item.code}</TableCell>
                                    <TableCell className="text-xs py-2">{item.description}</TableCell>
                                    <TableCell className="text-xs py-2">{item.unit}</TableCell>
                                    <TableCell className="py-2">
                                        <Input 
                                            type="number"
                                            min="1"
                                            className="h-8 w-20 text-xs" 
                                            defaultValue={item.quantity} 
                                            readOnly={isViewMode} 
                                        />
                                    </TableCell>
                                    <TableCell className="text-xs py-2">{item.unitPrice}</TableCell>
                                    <TableCell className="text-xs py-2">{item.grossAmount.toFixed(2)}</TableCell>
                                    <TableCell className="py-2">
                                        <Select defaultValue={item.discountType} disabled={isViewMode}>
                                            <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="No Discount">No Discount</SelectItem><SelectItem value="Fixed">Fixed</SelectItem></SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <Input 
                                            type="number" 
                                            step="0.01"
                                            min="0"
                                            className="h-8 w-20 text-xs" 
                                            defaultValue={item.discountAmount} 
                                            readOnly={isViewMode} 
                                        />
                                    </TableCell>
                                    <TableCell className="text-xs py-2 font-medium">{item.totalAmount.toFixed(2)}</TableCell>
                                    <TableCell className="py-2"><Input className="h-8 w-full text-xs" defaultValue={item.reason} readOnly={isViewMode} /></TableCell>
                                    <TableCell className="py-2">
                                        <Select defaultValue={item.returnType} disabled={isViewMode}>
                                            <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="Bad Order">Bad Order</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent>
                                        </Select>
                                    </TableCell>
                                    {!isViewMode && (
                                        <TableCell className="py-2">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDeleteItem(idx)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                             <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No products added.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>

        {/* BOTTOM SECTION Financials/Remarks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
            <div className="lg:col-span-2 space-y-4">
                <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Order No.</Label>
                    <Input className="h-9" defaultValue={data.orderNo} readOnly={isViewMode} />
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Invoice No.</Label>
                    <Input className="h-9" defaultValue={data.invoiceNo} readOnly={isViewMode} />
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Remarks</Label>
                    <Textarea className="min-h-[120px] resize-none text-sm" defaultValue={data.remarks} readOnly={isViewMode} />
                </div>
            </div>

            {/* FINANCIAL PANEL */}
            <div className="bg-slate-50/50 border rounded-lg p-5 space-y-4 text-sm h-fit">
                <h4 className="font-semibold text-xs text-gray-700 mb-2">Financial Summary</h4>
                
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">Gross Amount</span>
                        <span className="font-medium">₱{data.items?.reduce((acc, i) => acc + i.grossAmount, 0).toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">Discount Amount</span>
                        <span className="font-medium">₱{data.items?.reduce((acc, i) => acc + i.discountAmount, 0).toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between items-center font-bold text-sm">
                        <span>Net Amount</span>
                        <span>₱{data.totalAmount.toFixed(2)}</span>
                    </div>
                </div>

                {!isNewMode && (
                    <>
                        <div className="h-px bg-border my-4" />
                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between"><span className="text-muted-foreground">Applied</span><span>No</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Date Applied</span><span>-</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Transaction Status</span><span>{isViewMode ? "Viewing" : "Editing"}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Posted</span><span className="text-orange-600 font-medium">No</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Received</span>{isReceived ? <span className="text-green-600 font-bold">Yes</span> : <span className="text-orange-600 font-medium">No</span>}</div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Applied To</span><span>-</span></div>
                        </div>
                    </>
                )}
            </div>
        </div>

      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-end gap-3 py-4 px-6 border-t mt-auto">
        {isNewMode && (
            <>
                <Button variant="outline" onClick={onBack} className="h-9 text-xs">Cancel</Button>
                <Button className="bg-[#2563eb] hover:bg-[#1d4ed8] h-9 px-6 text-xs font-medium">Create Sales Return</Button>
            </>
        )}

        {!isNewMode && (
            <>
                <Button variant="outline" className="h-9 text-xs"><Printer className="mr-2 h-3 w-3" /> Print Return Slip</Button>
                <Button variant="outline" onClick={onBack} className="h-9 text-xs">Close</Button>
                {!isViewMode && (
                    <>
                        <Button className="bg-[#22c55e] hover:bg-[#16a34a] h-9 px-6 text-xs font-medium" onClick={handleReceive}>Receive</Button>
                        <Button className="bg-[#2563eb] hover:bg-[#1d4ed8] h-9 px-6 text-xs font-medium">Update Sales Return</Button>
                    </>
                )}
            </>
        )}
      </div>

      <AddProductModal 
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onAddProducts={handleAddProductsFromModal}
        existingCodes={data.items?.map(i => i.code) || []}
      />

    </div>
  );
}