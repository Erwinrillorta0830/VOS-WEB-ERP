"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, X } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- MOCK DATA & TYPES ---
const MOCK_SUPPLIERS = [{ id: "sup-1", name: "Mama Pina's" }, { id: "sup-2", name: "Puregold" }];
const MOCK_PRODUCTS = [
  {
    id: "p1", name: "Mama Pina's Personal Care Product A 400g", code: "MAM-U5HJK1", supplierId: "sup-1",
    units: [{ unit: "Bottle", price: 1750.00, quantityPerUnit: 1 }]
  },
  {
    id: "p2", name: "Mama Pina's Canned Meat Product B 250g", code: "MAM-528ZBG", supplierId: "sup-1",
    units: [{ unit: "Box (1 pcs)", price: 4425.00, quantityPerUnit: 1 }, { unit: "Box (6 pcs)", price: 187.50, quantityPerUnit: 6 }]
  },
];

interface SalesReturn { id: string; invoiceId: string; customerName: string; date: string; status: string; totalAmount: number; items: any[]; }

export function CreateReturnDialog({ onAdd }: { onAdd: (data: SalesReturn) => void }) {
  // 1. STATE MANAGEMENT
  const [open, setOpen] = useState(false); // Main Dialog
  const [isAddProductOpen, setIsAddProductOpen] = useState(false); // Second Manual Modal

  // Form State
  const [invoiceId, setInvoiceId] = useState("");
  const [customer, setCustomer] = useState("");
  const [salesman, setSalesman] = useState("");
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [remarks, setRemarks] = useState("");

  // Add Product Modal State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [tempSelectedProducts, setTempSelectedProducts] = useState<any[]>([]);

  // Calculations
  const grossAmount = selectedItems.reduce((sum, item) => sum + item.total, 0);

  // --- LOGIC: FILTERING & ADDING ---
  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || product.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch && (selectedSupplier === "all" || product.supplierId === selectedSupplier);
    });
  }, [searchQuery, selectedSupplier]);

  const handleAddTempProduct = (product: any, unit: any) => {
    setTempSelectedProducts((prev) => {
      const idx = prev.findIndex((p) => p.productId === product.id && p.unit === unit.unit);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        copy[idx].total = copy[idx].quantity * unit.price;
        return copy;
      }
      return [...prev, { productId: product.id, productName: product.name, productCode: product.code, unit: unit.unit, price: unit.price, quantity: 1, total: unit.price }];
    });
  };

  const confirmAddProducts = () => {
    setSelectedItems((prev) => [...prev, ...tempSelectedProducts]);
    setTempSelectedProducts([]);
    setIsAddProductOpen(false); // Close the manual modal
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: `RTN-${Math.floor(Math.random() * 1000)}`,
      invoiceId, customerName: customer, date: new Date().toISOString().split("T")[0],
      status: "pending", totalAmount: grossAmount, items: selectedItems
    });
    setOpen(false);
    // Reset fields...
    setInvoiceId(""); setCustomer(""); setSelectedItems([]);
  };

  return (
    <>
      {/* --- MAIN WINDOW (SHADCN DIALOG) --- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Sales Return</Button></DialogTrigger>
        <DialogContent className="max-w-[1200px] h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b"><DialogTitle>Create Sales Return</DialogTitle></DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            <form id="create-return-form" onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><Label>Salesman</Label><Input value={salesman} onChange={e=>setSalesman(e.target.value)} placeholder="Salesman..." /></div>
                <div className="space-y-2"><Label>Customer</Label><Input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Customer..." /></div>
                <div className="space-y-2"><Label>Invoice No.</Label><Input value={invoiceId} onChange={e=>setInvoiceId(e.target.value)} /></div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" /></div>
              </div>

              {/* PRODUCTS TABLE */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Products Summary</h3>
                  {/* BUTTON OPENS MANUAL OVERLAY */}
                  <Button type="button" onClick={() => setIsAddProductOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" /> Add Product
                  </Button>
                </div>
                <div className="border rounded-md overflow-hidden bg-background shadow-sm">
                  <Table>
                    <TableHeader className="bg-blue-600">
                      <TableRow className="hover:bg-blue-600">
                        <TableHead className="text-white">Code</TableHead><TableHead className="text-white">Desc</TableHead><TableHead className="text-white">Unit</TableHead><TableHead className="text-white text-right">Qty</TableHead><TableHead className="text-white text-right">Total</TableHead><TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedItems.map((item, i) => (
                        <TableRow key={i}><TableCell>{item.productCode}</TableCell><TableCell>{item.productName}</TableCell><TableCell>{item.unit}</TableCell><TableCell className="text-right">{item.quantity}</TableCell><TableCell className="text-right">₱{item.total.toFixed(2)}</TableCell><TableCell><Button type="button" variant="ghost" size="icon" onClick={() => setSelectedItems(p => p.filter((_, idx) => idx !== i))}><X className="h-4 w-4"/></Button></TableCell></TableRow>
                      ))}
                      {selectedItems.length === 0 && <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No items added.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* FINANCIALS */}
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8"><Label>Remarks</Label><Textarea value={remarks} onChange={e=>setRemarks(e.target.value)} /></div>
                <div className="col-span-4 bg-background p-6 rounded-lg border"><div className="flex justify-between font-bold text-lg"><span>Net Amount</span><span>₱{grossAmount.toFixed(2)}</span></div></div>
              </div>
            </form>
          </div>
          <DialogFooter className="p-4 border-t bg-background"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="create-return-form">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- FIX: MANUAL CSS OVERLAY (NO SHADCN DIALOG) --- */}
      {/* This guarantees the modal appears on top because of z-[99999] */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background w-[1100px] h-[85vh] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200">
            
            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-white">
              <h2 className="text-lg font-semibold">Add Products</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsAddProductOpen(false)}><X className="h-4 w-4" /></Button>
            </div>

            {/* Body */}
            <div className="flex-1 grid grid-cols-12 min-h-0 bg-white">
              {/* Left Column */}
              <div className="col-span-8 border-r bg-muted/5 flex flex-col">
                <div className="p-4 border-b space-y-4 bg-white">
                   <div className="flex gap-4">
                      <Select value={selectedSupplier} onValueChange={setSelectedSupplier}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Supplier" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{MOCK_SUPPLIERS.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
                      <Input placeholder="Search products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1" />
                   </div>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {filteredProducts.map(prod => (
                      <Card key={prod.id}><CardContent className="p-4">
                        <div className="font-medium truncate">{prod.name}</div>
                        <div className="text-xs text-muted-foreground mb-2">{prod.code}</div>
                        <div className="space-y-2">{prod.units.map((u, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-secondary/30 p-2 rounded text-sm hover:bg-secondary/50 cursor-pointer" onClick={() => handleAddTempProduct(prod, u)}>
                             <div><span className="font-bold">₱{u.price}</span> <span className="text-xs text-muted-foreground">{u.unit}</span></div>
                             <Button size="sm" variant="secondary" className="h-6 text-xs">+ Add</Button>
                          </div>
                        ))}</div>
                      </CardContent></Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Right Column */}
              <div className="col-span-4 bg-muted/10 flex flex-col">
                <div className="p-4 border-b font-medium bg-white">Selected Items ({tempSelectedProducts.length})</div>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {tempSelectedProducts.map((item, i) => (
                      <div key={i} className="bg-white p-3 rounded border shadow-sm">
                        <div className="flex justify-between mb-2"><span className="font-medium text-sm truncate w-3/4">{item.productName}</span><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setTempSelectedProducts(prev => prev.filter((_, idx) => idx !== i))}><X className="h-3 w-3"/></Button></div>
                        <div className="flex justify-between items-center text-sm"><span>{item.quantity} x ₱{item.price}</span><span className="font-bold">₱{item.total}</span></div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t bg-white">
                  <div className="flex justify-between font-bold text-lg mb-4"><span>Total</span><span>₱{tempSelectedProducts.reduce((a,b)=>a+b.total,0).toFixed(2)}</span></div>
                  <Button className="w-full" onClick={confirmAddProducts} disabled={tempSelectedProducts.length === 0}>Confirm Selected</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}