"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Scan,
  Package,
  AlertCircle,
  ShoppingCart,
  Trash2,
  X,
  Minus,
  Plus,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Product, CartItem } from "../type";

interface ProductPickerProps {
  isVisible: boolean;
  onClose: () => void;
  products: any[]; // Using any to be flexible with the computed objects from modal
  addedProducts: CartItem[];
  onAdd: (product: any, quantity?: number) => void;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onClearAll: () => void;
  isLoading?: boolean;
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
  isLoading = false,
}: ProductPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeQuery, setBarcodeQuery] = useState("");

  const filteredProducts = useMemo(() => {
    if (isLoading) return [];
    let result = products;
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.code.toLowerCase().includes(lower) ||
          p.unit.toLowerCase().includes(lower),
      );
    }
    if (barcodeQuery) {
      const lower = barcodeQuery.toLowerCase();
      result = result.filter((p) => p.code.toLowerCase().includes(lower));
    }
    return result;
  }, [products, searchQuery, barcodeQuery, isLoading]);

  const currentTotal = addedProducts.reduce((sum, item) => {
    const price = item.customPrice ?? item.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  if (!isVisible) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 h-full animate-in fade-in slide-in-from-right-8 bg-white overflow-hidden relative">
      {/* LEFT: BROWSER */}
      <div className="col-span-2 flex flex-col h-full bg-slate-50 border-r relative overflow-hidden">
        <div className="p-6 border-b bg-white shadow-sm z-10 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex gap-2 text-slate-800">
              <Search className="h-5 w-5 text-blue-600" /> Browse Products
            </h3>
            <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 font-medium">
              {isLoading
                ? "Fetching..."
                : `${filteredProducts.length} items found`}
            </span>
          </div>
          <div className="flex gap-3">
            {/* Search Inputs */}
            <div className="relative grow group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <Input
                autoFocus
                disabled={isLoading}
                placeholder="Search product name or code..."
                className="pl-10 pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all disabled:opacity-50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="relative w-1/3 group">
              <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <Input
                disabled={isLoading}
                placeholder="Scan barcode..."
                className="pl-10 pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all disabled:opacity-50"
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-24 bg-slate-50/50 min-h-0">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between h-48"
                >
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-1/3 self-end" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Package className="h-10 w-10 mb-2 opacity-50" />
              <p className="font-medium">No available stock found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
              {filteredProducts.map((product) => {
                const stock = product.stock || 0;
                const inCart =
                  addedProducts.find((p) => p.id === product.id)?.quantity || 0;
                const isMaxed = stock > 0 && inCart >= stock;
                const displayPrice = (product.price || 0).toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2 },
                );

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between h-full min-h-[180px]"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight">
                          {product.name}
                        </h4>
                        {product.discountType && (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] shrink-0 whitespace-nowrap h-5 px-1.5"
                          >
                            <Tag className="w-3 h-3 mr-1" />{" "}
                            {product.discountType}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mb-3">
                        Code: {product.code}
                      </div>
                      <div className="text-lg font-bold text-slate-900">
                        ₱ {displayPrice}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        <span className="font-medium">{product.unit}</span>
                        <span className="text-slate-400">
                          {" "}
                          (1 {product.unit} = {product.unitCount} pcs)
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-end">
                      <div className="text-xs text-slate-500">
                        Stock:{" "}
                        <div className="font-bold text-slate-700 text-sm">
                          {stock} available
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onAdd(product, 1)}
                        disabled={isMaxed}
                        className={`h-9 px-4 text-xs font-bold rounded-lg shadow-sm ${isMaxed ? "bg-slate-100 text-slate-400" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                      >
                        {isMaxed ? "Maxed" : "+ Add"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: CART SIDEBAR */}
      <div className="col-span-1 bg-white h-full border-l border-slate-200 flex flex-col shadow-xl z-20 overflow-hidden relative">
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0 bg-slate-50/30">
          {addedProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200">
                <Package className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-sm font-medium">No products selected</p>
            </div>
          ) : (
            addedProducts.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-sm text-slate-800 line-clamp-2">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {item.unit} ({item.unitCount})
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                  <div className="text-xs font-medium text-slate-600">
                    ₱{" "}
                    {(item.quantity * (item.customPrice ?? 0)).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 bg-white rounded border border-slate-200 shadow-sm">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-xs font-bold tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-6 pt-5 pb-14 border-t border-slate-200 bg-white shrink-0 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-50 relative">
          <div className="flex justify-between items-end mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Total Price
            </span>
            <span className="text-2xl font-extrabold text-slate-900 leading-none">
              ₱{" "}
              {currentTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <Button
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
            onClick={onClose}
          >
            Confirm Selected Products
          </Button>
        </div>
      </div>
    </div>
  );
}
