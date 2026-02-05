"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Scan,
  Package,
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
import { CartItem } from "../type";

interface GroupedProduct {
  masterId: string;
  masterCode: string;
  masterName: string;
  variants: {
    id: string;
    code: string;
    name: string;
    unit: string;
    unitCount: number;
    price: number;
    stock: number;
    discountType?: string;
    supplierDiscount?: number;
  }[];
}

interface ProductPickerProps {
  isVisible: boolean;
  onClose: () => void;
  products: any[]; // Accepts both GroupedProduct[] and flat item arrays
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

  // ✅ CRITICAL LOGIC: Normalized Data handling
  // This detects if 'products' is flat (from ReturnDetailsModal) or Grouped (from CreateReturnModal)
  // and standardizes it to prevent the "undefined map" crash.
  const normalizedGroups = useMemo(() => {
    if (!products || products.length === 0) return [];

    // Check if data is already grouped (has 'variants' property)
    const firstItem = products[0];
    const isAlreadyGrouped =
      firstItem && "variants" in firstItem && Array.isArray(firstItem.variants);

    if (isAlreadyGrouped) {
      return products as GroupedProduct[];
    }

    // FALLBACK: Auto-Group flat items (Fixes ReturnDetailsModal crash)
    const groups: Record<string, any> = {};

    products.forEach((item) => {
      // Use masterId if available (from api.ts), otherwise use product_id
      const groupKey = item.masterId || String(item.id);

      if (!groups[groupKey]) {
        groups[groupKey] = {
          masterId: groupKey,
          masterCode: item.code || "N/A",
          masterName: item.name,
          variants: [],
        };
      }
      groups[groupKey].variants.push(item);
    });

    return Object.values(groups).map((group: any) => {
      // Sort variants to find best Master Name (Smallest unit)
      group.variants.sort((a: any, b: any) => a.unitCount - b.unitCount);
      if (group.variants.length > 0) group.masterName = group.variants[0].name;

      // Sort for display (Largest unit first)
      group.variants.sort((a: any, b: any) => b.unitCount - a.unitCount);
      return group;
    }) as GroupedProduct[];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (isLoading) return [];
    let result = normalizedGroups;

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(
        (group) =>
          group.masterName.toLowerCase().includes(lower) ||
          group.masterCode.toLowerCase().includes(lower) ||
          group.variants.some((v) => v.name.toLowerCase().includes(lower)),
      );
    }
    if (barcodeQuery) {
      const lower = barcodeQuery.toLowerCase();
      result = result.filter(
        (group) =>
          group.masterCode.toLowerCase().includes(lower) ||
          group.variants.some((v) => v.code.toLowerCase().includes(lower)),
      );
    }
    return result;
  }, [normalizedGroups, searchQuery, barcodeQuery, isLoading]);

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
                : `${filteredProducts.length} Product Families`}
            </span>
          </div>
          {/* Search Inputs */}
          <div className="flex gap-3">
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
              {filteredProducts.map((group) => (
                <div
                  key={group.masterId}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                    <h4 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight">
                      {group.masterName}
                    </h4>
                    <div className="text-[11px] text-slate-500 font-mono mt-1">
                      Code: {group.masterCode}
                    </div>
                  </div>

                  <div className="p-2 space-y-2">
                    {/* ✅ SAFE MAPPING: Added optional chaining and fallback */}
                    {(group.variants || []).map((variant) => {
                      const inCart =
                        addedProducts.find((p) => p.id === variant.id)
                          ?.quantity || 0;
                      const isMaxed =
                        variant.stock > 0 && inCart >= variant.stock;

                      return (
                        <div
                          key={variant.id}
                          className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 hover:border-blue-100 transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">
                              ₱{" "}
                              {variant.price.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <span>
                                {variant.unit} ({variant.unitCount} pcs)
                              </span>
                              {variant.discountType && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] h-4 px-1 py-0 border-amber-200 text-amber-700 bg-amber-50"
                                >
                                  {variant.discountType}
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Stock: {variant.stock} available
                            </span>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => onAdd(variant, 1)}
                            disabled={isMaxed}
                            className={`h-8 px-3 text-xs font-bold shadow-sm ${
                              isMaxed
                                ? "bg-slate-100 text-slate-400"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                          >
                            {isMaxed ? "Maxed" : "+ Add"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: CART SIDEBAR (Identical to previous) */}
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
