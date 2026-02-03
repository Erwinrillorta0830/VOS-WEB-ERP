"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Scan,
  X,
  Plus,
  Minus,
  Package,
  AlertCircle,
  ShoppingCart,
  Trash2,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const filteredRawProducts = useMemo(() => {
    let result = products;
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = products.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.code.toLowerCase().includes(lower),
      );
    }
    if (barcodeQuery) {
      const lower = barcodeQuery.toLowerCase();
      result = result.filter((p) => p.code.toLowerCase().includes(lower));
    }
    return result;
  }, [products, searchQuery, barcodeQuery]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>();
    filteredRawProducts.forEach((p) => {
      const key = p.name.trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    });
    return Array.from(groups.values());
  }, [filteredRawProducts]);

  const currentTotal = addedProducts.reduce((sum, item) => {
    const price = item.customPrice ?? item.price;
    return sum + price * item.quantity;
  }, 0);

  const handleAdd = (variant: Product) => {
    const stock = variant.stock || 0;
    const inCart =
      addedProducts.find((p) => p.id === variant.id)?.quantity || 0;

    if (inCart + 1 > stock) {
      setWarningMessage(`Limit reached. Only ${stock} available.`);
      setTimeout(() => setWarningMessage(null), 3000);
      return;
    }
    setWarningMessage(null);
    onAdd(variant, 1);
  };

  const handleQty = (id: string, newQty: number) => {
    const existingItem = addedProducts.find((item) => item.id === id);
    const stock = existingItem?.stock || 0;

    if (newQty <= 0) onRemove(id);
    else {
      if (newQty > stock) {
        setWarningMessage(`Limit reached. Only ${stock} available.`);
        setTimeout(() => setWarningMessage(null), 3000);
        return;
      }
      setWarningMessage(null);
      onUpdateQty(id, newQty);
    }
  };

  if (!isVisible) return null;

  return (
    // Main Container: Matches the height passed from the parent modal
    <div className="grid grid-cols-1 lg:grid-cols-3 h-full animate-in fade-in slide-in-from-right-8 bg-white overflow-hidden relative">
      {/* WARNING BANNER */}
      {warningMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-red-100 text-red-700 px-4 py-2 rounded-full shadow-lg text-sm font-bold flex gap-2 border border-red-200">
          <AlertCircle className="h-4 w-4" /> {warningMessage}
        </div>
      )}

      {/* LEFT COLUMN: PRODUCT BROWSER */}
      <div className="col-span-2 flex flex-col h-full bg-slate-50 border-r relative overflow-hidden">
        {/* Header - Fixed Height */}
        <div className="p-6 border-b bg-white shadow-sm z-10 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex gap-2 text-slate-800">
              <Search className="h-5 w-5 text-blue-600" /> Browse Products
            </h3>
            <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 font-medium">
              {filteredRawProducts.length} variants
            </span>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-grow group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <Input
                placeholder="Search name/code..."
                className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative w-1/3 group">
              <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <Input
                placeholder="Scan barcode..."
                className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Scrollable Product List - Fills remaining space */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-24 bg-slate-50/50 min-h-0">
          {groupedProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Package className="h-10 w-10 mb-2 opacity-50" />{" "}
              <p className="font-medium">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
              {groupedProducts.map((group) => {
                const main = group[0];
                return (
                  <div
                    key={main.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                  >
                    <div className="p-3 border-b border-slate-50 bg-slate-50/30">
                      <h4 className="font-bold text-sm text-slate-800 line-clamp-1">
                        {main.name}
                      </h4>
                      <div className="text-xs text-slate-500 font-mono mt-1 bg-slate-100 inline-block px-1.5 rounded">
                        {main.code}
                      </div>
                    </div>
                    <div className="p-3 space-y-2 flex-1">
                      {group.map((variant) => {
                        const stock = variant.stock || 0;
                        const inCart =
                          addedProducts.find((p) => p.id === variant.id)
                            ?.quantity || 0;
                        const isMaxed = inCart >= stock;
                        const isOutOfStock = stock <= 0;

                        return (
                          <div
                            key={variant.id}
                            className="flex justify-between items-center group/item"
                          >
                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                ₱
                                {variant.price.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>{" "}
                                {variant.unit}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                                  Stock
                                </div>
                                <div
                                  className={`text-sm font-bold leading-none ${isOutOfStock ? "text-red-500" : "text-emerald-600"}`}
                                >
                                  {isOutOfStock ? "0" : stock}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleAdd(variant)}
                                disabled={isOutOfStock || isMaxed}
                                className={`h-8 px-3 text-xs font-bold rounded-lg shadow-sm ${isOutOfStock || isMaxed ? "bg-slate-100 text-slate-400" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                              >
                                {isMaxed ? "Max" : "Add"}
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

      {/* RIGHT COLUMN: CART & CONFIRMATION */}
      {/* ✅ FIXED: Use flex-col and h-full so footer can be sticky at bottom */}
      <div className="col-span-1 bg-white h-full border-l border-slate-200 flex flex-col shadow-xl z-20 overflow-hidden relative">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white z-10">
          <h3 className="font-bold text-slate-800 flex gap-2 items-center text-sm uppercase tracking-wide">
            <ShoppingCart className="h-4 w-4 text-slate-400" /> Selected Items
          </h3>
          {addedProducts.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 hover:bg-red-50 rounded"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Cart Items List - Takes all available space but shrinks for footer */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0 bg-slate-50/30">
          {addedProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200">
                <Package className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-sm font-medium">List is empty</p>
            </div>
          ) : (
            addedProducts.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-3 animate-in slide-in-from-bottom-2 duration-300"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-sm text-slate-800 line-clamp-2">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono bg-slate-100 inline-block px-1 rounded">
                      {item.code}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="text-xs font-medium text-slate-600">
                    ₱
                    {(
                      item.quantity * (item.customPrice || item.price)
                    ).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 bg-white rounded border border-slate-200 shadow-sm">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded hover:bg-slate-100"
                      onClick={() => handleQty(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-xs font-bold tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded hover:bg-slate-100"
                      onClick={() => handleQty(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer - Fixed at Bottom */}
        {/* ✅ FIXED: High Z-Index, white background, shadow to ensure it sits on top */}
        <div className="px-6 pt-5 pb-20 border-t border-slate-200 bg-white shrink-0 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-50 relative">
          <div className="flex justify-between items-end mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Total Amount
            </span>
            <span className="text-2xl font-extrabold text-slate-900 leading-none">
              ₱
              {currentTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <Button
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
            onClick={onClose}
          >
            Confirm Selection
          </Button>
        </div>
      </div>
    </div>
  );
}
