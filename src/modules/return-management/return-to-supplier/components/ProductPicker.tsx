"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Scan,
  X,
  Plus,
  Minus,
  Package,
  Trash2,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product, CartItem } from "../type";

interface ProductPickerProps {
  isVisible: boolean;
  onClose: () => void;
  products: Product[];
  addedProducts: CartItem[];
  onAdd: (product: Product, quantity?: number) => void;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onClearAll: () => void;
}

export function ProductPicker({
  isVisible,
  onClose,
  products,
  addedProducts,
  onAdd,
  onRemove,
  onUpdateQty,
  onClearAll,
}: ProductPickerProps) {
  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // --- 1. FILTER LOGIC ---
  const filteredRawProducts = useMemo(() => {
    let result = products;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = products.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.code.toLowerCase().includes(lowerQuery),
      );
    }

    if (barcodeQuery) {
      const lowerBarcode = barcodeQuery.toLowerCase();
      result = result.filter((p) =>
        p.code.toLowerCase().includes(lowerBarcode),
      );
    }

    return result;
  }, [products, searchQuery, barcodeQuery]);

  // --- 2. GROUPING LOGIC ---
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>();

    filteredRawProducts.forEach((p) => {
      const key = p.name.trim();
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(p);
    });

    return Array.from(groups.values());
  }, [filteredRawProducts]);

  // Calculate Total
  const currentTotal = addedProducts.reduce((sum, item) => {
    const price = item.customPrice ?? item.price;
    return sum + price * item.quantity;
  }, 0);

  // --- HANDLERS ---

  // ✅ NEW: Logic to check stock before adding
  const handleAddToSelection = (variant: Product) => {
    // 1. MOCK STOCK set to 10
    const MOCK_STOCK = 10;
    const currentStock = variant.stock || MOCK_STOCK;

    // 2. Check how many of this item are already in the cart
    const existingItem = addedProducts.find((item) => item.id === variant.id);
    const currentQtyInCart = existingItem ? existingItem.quantity : 0;

    // 3. Validation
    if (currentQtyInCart + 1 > currentStock) {
      setWarningMessage(`Product stock is not enough (Max: ${currentStock})`);

      // Clear warning automatically after 3 seconds
      setTimeout(() => setWarningMessage(null), 3000);
      return;
    }

    // 4. If valid, clear warning and proceed
    setWarningMessage(null);
    onAdd(variant, 1);
  };

  // Logic to handle Quantity updates (+/-) inside the cart list
  const handleQuantityChange = (id: string, newQty: number) => {
    const MOCK_STOCK = 10; // Consistent mock stock

    if (newQty <= 0) {
      onRemove(id);
    } else {
      // Check max stock on increase
      const existingItem = addedProducts.find((item) => item.id === id);
      if (existingItem && newQty > existingItem.quantity) {
        // We are increasing
        if (newQty > MOCK_STOCK) {
          setWarningMessage(`Product stock is not enough (Max: ${MOCK_STOCK})`);
          setTimeout(() => setWarningMessage(null), 3000);
          return;
        }
      }

      setWarningMessage(null);
      onUpdateQty(id, newQty);
    }
  };

  if (!isVisible) return null;

  return (
    // ✅ FIXED: Added 'overflow-hidden' to root to prevent outer scrollbars
    <div className="grid grid-cols-1 lg:grid-cols-3 h-full animate-in fade-in slide-in-from-right-8 duration-500 ease-out relative bg-white lg:bg-slate-50 overflow-hidden">
      {/* Mobile Close Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute right-4 top-4 z-50 lg:hidden bg-white/90 backdrop-blur-md shadow-sm border border-slate-100"
      >
        <X className="h-5 w-5 text-slate-600" />
      </Button>

      {/* ✅ NEW: Floating Warning Banner */}
      {warningMessage && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[60] animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold">
            <AlertCircle className="h-4 w-4" />
            {warningMessage}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LEFT COLUMN: Browse Products */}
      {/* ========================================================= */}
      <div className="col-span-1 lg:col-span-2 flex flex-col h-full bg-slate-50/50 border-r border-slate-200 overflow-hidden relative">
        {/* FIXED HEADER */}
        <div className="p-5 lg:p-6 border-b border-slate-200 bg-white shadow-sm z-10 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                Browse Products
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Select items to add to your return list
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
              {filteredRawProducts.length} variants found
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <Input
                placeholder="Search product name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all rounded-lg"
              />
            </div>
            <div className="relative flex-grow sm:flex-grow-0 sm:w-1/3 group">
              <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <Input
                placeholder="Scan barcode..."
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value)}
                className="pl-10 h-11 border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* SCROLLABLE GRID */}
        {/* ✅ FIXED: Added min-h-0 to ensure proper scrolling */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar pb-24 lg:pb-6 relative bg-slate-50/50 min-h-0">
          {groupedProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-slate-300" />
              </div>
              <p className="font-medium text-slate-600">No products found</p>
              <p className="text-sm text-slate-400 mt-1">
                Try adjusting your search filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
              {groupedProducts.map((group) => {
                const mainProduct = group[0];

                return (
                  <div
                    key={mainProduct.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 overflow-hidden flex flex-col h-auto"
                  >
                    {/* CARD HEADER */}
                    <div className="p-4 border-b border-slate-50 bg-slate-50/30">
                      <h4 className="font-bold text-sm text-slate-800 line-clamp-2 leading-relaxed">
                        {mainProduct.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded text-center min-w-[50px]">
                          Code
                        </span>
                        <span className="text-xs font-medium text-slate-700 font-mono">
                          {mainProduct.code}
                        </span>
                      </div>
                    </div>

                    {/* CARD BODY: Variants */}
                    <div className="p-4 space-y-3 bg-white flex-1">
                      {group.map((variant) => {
                        const displayStock = variant.stock || 10;

                        return (
                          <div
                            key={variant.id}
                            className="flex items-center justify-between group/item"
                          >
                            {/* Left Side: Price & Unit */}
                            <div className="flex flex-col">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-lg font-bold text-slate-900">
                                  ₱
                                  {variant.price.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
                                {variant.unit || "UNIT"}
                              </span>
                            </div>

                            {/* Right Side: Stock & Button */}
                            <div className="flex items-center gap-3">
                              {/* --- STOCKS AVAILABLE --- */}
                              <div className="flex flex-col items-end mr-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Stock
                                </span>
                                <span
                                  className={`text-sm font-bold tabular-nums leading-none ${
                                    displayStock > 0
                                      ? "text-emerald-600"
                                      : "text-red-500"
                                  }`}
                                >
                                  {displayStock}
                                </span>
                              </div>

                              <Button
                                size="sm"
                                onClick={() => handleAddToSelection(variant)}
                                className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-xs font-bold shadow-sm shadow-blue-100 active:scale-95 transition-all rounded-lg"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: Summary Panel */}
      {/* ========================================================= */}
      {/* ✅ FIXED: Ensures column structure fits parent height */}
      <div className="flex col-span-1 bg-gray-50 flex-col h-full shadow-[-1px_0_0_0_rgba(0,0,0,0.05)] z-20 overflow-hidden">
        {/* Header */}
        <div className="p-5 lg:p-6 border-b border-gray-200 bg-white z-10 flex-shrink-0">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-gray-400" />
            Selected Products
          </h3>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
              {addedProducts.length} items added
            </span>
            {addedProducts.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Cart List */}
        {/* ✅ FIXED: Added min-h-0 to allow shrinking so footer stays visible */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0">
          {addedProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm space-y-4 opacity-70">
              <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-gray-200 flex items-center justify-center">
                <Package className="h-8 w-8 text-gray-300" />
              </div>
              <p className="font-medium">Your list is empty</p>
            </div>
          ) : (
            addedProducts.map((item) => (
              <div
                key={item.id}
                className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm relative animate-in slide-in-from-bottom-2 duration-300 group"
              >
                <div className="flex justify-between items-start mb-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                        {item.code}
                      </span>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase">
                        {item.unit || "UNIT"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemove(item.id)}
                    className="bg-red-500 text-white p-2 rounded-lg shadow-sm hover:bg-red-600 hover:shadow-red-200 transition-all active:scale-95 flex-shrink-0"
                    title="Remove Item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1 bg-white rounded-md border border-gray-200 shadow-sm p-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-gray-100 rounded text-gray-600"
                      onClick={() =>
                        handleQuantityChange(item.id, item.quantity - 1)
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-bold w-10 text-center tabular-nums text-gray-900">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-gray-100 rounded text-gray-600"
                      onClick={() =>
                        handleQuantityChange(item.id, item.quantity + 1)
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-bold text-gray-900 tabular-nums pr-1">
                    ₱
                    {(
                      item.quantity * (item.customPrice || item.price)
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {/* ✅ FIXED: shrink-0 keeps it from collapsing, sits at bottom */}
        <div className="mb-10 p-5 border-t border-gray-200 bg-white shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] z-30 space-y-4 shrink-0">
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Total Amount
              </span>
              <span className="font-extrabold text-2xl text-gray-900 leading-none mt-1">
                ₱
                {currentTotal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-sm font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-[0.98] rounded-xl"
            onClick={onClose}
          >
            Confirm Selected Products
          </Button>
        </div>
      </div>

      {/* MOBILE STICKY FOOTER */}
      <div className="lg:hidden absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 z-50 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 font-medium">
            Total ({addedProducts.length} items)
          </span>
          <span className="text-xl font-bold text-blue-600">
            ₱
            {currentTotal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
        <Button
          onClick={onClose}
          className="bg-blue-600 text-white px-6 font-bold shadow-md rounded-lg h-11"
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}
