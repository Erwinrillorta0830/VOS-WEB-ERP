"use client";

import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, X } from "lucide-react"; 
// ✅ 1. Import Types (Do not import the Context/Provider)
import { Product } from "../types"; 

// ✅ 2. Define Local Data Structure for the Grid
// We define a separate interface for your 'Source' data to avoid conflict with the main 'Product' type
interface SourceProduct {
  id: string;
  code: string;
  name: string;
  units: { unit: string; price: number }[];
}

// Mock Data (Your specific data)
const MOCK_SOURCE_DATA: SourceProduct[] = [
  {
    id: "1",
    code: "MAM-ACWNR2",
    name: "Mama Pina's Canned Fruits Product A 1kg",
    units: [
      { unit: "Pieces", price: 3312.50 },
      { unit: "Box", price: 5737.50 },
    ],
  },
  {
    id: "2",
    code: "MAM-WXEZUK",
    name: "Mama Pina's Canned Vegetables Product B 1L",
    units: [
      { unit: "Box", price: 3287.50 },
      { unit: "Box (50 pcs)", price: 3750.00 },
    ],
  },
   {
    id: "3",
    code: "MAM-85XBD8",
    name: "Mama Pina's Noodles Product C 500g",
    units: [
      { unit: "Pieces", price: 1962.50 },
    ],
  },
  {
    id: "4",
    code: "MAM-S4QJDH",
    name: "Mama Pina's Cooking Oil Product D 200g",
    units: [
      { unit: "Bag", price: 2562.50 },
    ],
  },
];

// ✅ 3. Define Props expected by the Parent (SalesReturnForm)
interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProducts: (selectedProducts: Product[]) => void; // Passing back the compatible type
  existingCodes: string[];
}

export function AddProductModal({ 
  isOpen, 
  onClose, 
  onAddProducts, 
  existingCodes 
}: AddProductModalProps) {
  
  // Local state for items currently in the "Right Side" cart
  const [stagedItems, setStagedItems] = useState<{ source: SourceProduct; unitIndex: number; qty: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter products logic
  const filteredProducts = useMemo(() => {
    return MOCK_SOURCE_DATA.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleStageItem = (source: SourceProduct, unitIndex: number) => {
    // Check if already added to prevent duplicates (optional logic)
    // For now, we allow adding multiple units
    setStagedItems((prev) => [...prev, { source, unitIndex, qty: 1 }]);
  };

  const handleRemoveStaged = (index: number) => {
    setStagedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ 4. Convert Staged Items to the Format Parent Expects
  const handleConfirm = () => {
    const productsToReturn: Product[] = stagedItems.map(item => {
      // Map your detailed source data to the flat 'Product' type required by types.ts
      return {
        code: item.source.code,
        description: item.source.name,
        unit: item.source.units[item.unitIndex].unit,
        unitPrice: item.source.units[item.unitIndex].price,
        // Note: The parent form currently defaults qty to 1. 
        // If you need to pass specific qty, we'd need to update the parent logic later.
      };
    });

    onAddProducts(productsToReturn); // Send data back to parent
    setStagedItems([]); // Clear local staging
    onClose(); // Close modal
  };

  const totalStagedPrice = stagedItems.reduce((acc, item) => {
    return acc + (item.source.units[item.unitIndex].price * item.qty);
  }, 0);

  return (
    // ✅ 5. Control Dialog using Props (isOpen/onClose)
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      
      {/* DialogTrigger removed because Parent controls opening */}
      
      <DialogContent className="sm:max-w-none w-[90vw] h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Add Products</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden h-full">
          {/* LEFT COLUMN: Product Grid */}
          <div className="flex-[3] flex flex-col border-r p-4 gap-4 bg-gray-50/50 min-w-0">
            
            {/* Search Filters Row */}
            <div className="flex gap-4">
              <div className="w-[250px] space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Supplier</label>
                <Select>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="All Suppliers" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Search Products</label>
                <Input 
                  placeholder="Search by product name or code..." 
                  className="bg-white" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Barcode Row */}
            <div className="flex gap-2">
               <div className="relative flex-1">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input className="pl-9 bg-white" placeholder="Scan or enter barcode..." />
               </div>
               <Button variant="default" className="bg-blue-600">Search</Button>
            </div>

            {/* Products Grid */}
            <ScrollArea className="flex-1 pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="bg-white p-4 rounded-lg border shadow-sm space-y-3 flex flex-col justify-between h-full">
                    <div>
                      <h4 className="font-semibold text-sm line-clamp-2" title={product.name}>{product.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Code: {product.code}</p>
                    </div>
                    
                    <div className="space-y-2 pt-2 mt-auto">
                      {product.units.map((u, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm border-t pt-2 first:border-0 first:pt-0">
                          <div>
                            <div className="font-medium">₱{u.price.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">{u.unit}</div>
                          </div>
                          <Button 
                            size="sm" 
                            className="bg-blue-600 h-8 px-3 ml-2 shrink-0"
                            onClick={() => handleStageItem(product, idx)}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT COLUMN: Staged Items Summary */}
          <div className="flex-[1] min-w-[300px] flex flex-col bg-white h-full">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold">Selected Summary</h3>
              <p className="text-sm text-muted-foreground">{stagedItems.length} item(s)</p>
            </div>

            <ScrollArea className="flex-1 p-4">
              {stagedItems.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                   No products selected
                 </div>
              ) : (
                <div className="space-y-3">
                  {stagedItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start group border-b pb-2 last:border-0">
                      <div className="text-sm">
                        <div className="font-medium line-clamp-1">{item.source.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.source.units[item.unitIndex].unit} — ₱{item.source.units[item.unitIndex].price}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => handleRemoveStaged(idx)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t bg-gray-50 space-y-3 mt-auto">
              <div className="flex justify-between text-sm">
                <span>Total Price</span>
                <span className="font-bold">₱{totalStagedPrice.toFixed(2)}</span>
              </div>
              <Button 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white" 
                disabled={stagedItems.length === 0}
                onClick={handleConfirm}
              >
                Confirm Selected
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}