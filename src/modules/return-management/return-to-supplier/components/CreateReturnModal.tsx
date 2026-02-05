"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Plus,
  X,
  Package,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReturnCreationData } from "../hooks/useReturnCreationData";
import { ReturnToSupplierProvider } from "../providers/api";
import { ProductPicker } from "./ProductPicker";
import { ReturnReviewPanel } from "./ReturnReviewPanel";
import { CartItem } from "../type";
import { calculateLineItem } from "../utils/calculations";

export function CreateReturnModal({
  isOpen,
  onClose,
  onReturnCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onReturnCreated: () => void;
}) {
  const {
    refs,
    inventory,
    loadInventory,
    loading: isLoadingInventory,
  } = useReturnCreationData(isOpen);

  const [step, setStep] = useState<"input" | "review">("input");
  const [selection, setSelection] = useState({
    supplierId: "",
    branchId: "",
    remarks: "",
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openSupplier, setOpenSupplier] = useState(false);
  const [openBranch, setOpenBranch] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return refs.suppliers;
    return refs.suppliers.filter((s) =>
      s.supplier_name.toLowerCase().includes(supplierSearch.toLowerCase()),
    );
  }, [refs.suppliers, supplierSearch]);

  const filteredBranches = useMemo(() => {
    if (!branchSearch) return refs.branches;
    return refs.branches.filter((b) =>
      b.branch_name.toLowerCase().includes(branchSearch.toLowerCase()),
    );
  }, [refs.branches, branchSearch]);

  // ✅ DISPLAY LOGIC: Group Flat Items + Apply Supplier Discounts
  const groupedProducts = useMemo(() => {
    const invArray = Array.from(inventory.values());

    // 1. Create Lookup Maps for Performance (O(1) Access)
    const productPriceMap = new Map();
    refs.products.forEach((p) => productPriceMap.set(String(p.id), p));

    const connectionMap = new Map();
    refs.connections.forEach((c) =>
      // Key: "ProductID-SupplierID" for precise lookup
      connectionMap.set(`${c.product_id}-${c.supplier_id}`, c),
    );

    const discountMap = new Map();
    refs.discounts.forEach((d) => discountMap.set(String(d.id), d));

    // 2. Enrich Data (Attach Price & Calculate Discount)
    const enrichedItems = invArray
      .map((item: any) => {
        // Price Lookup
        const priceRef = productPriceMap.get(String(item.product_id));

        // Discount Lookup: Specific to this Product AND the selected Supplier
        const connection = connectionMap.get(
          `${item.product_id}-${selection.supplierId}`,
        );

        let discountLabel = undefined;
        let computedDiscount = 0;

        if (connection?.discount_type) {
          // Try to find the discount definition in line_discount table
          const discountObj = discountMap.get(String(connection.discount_type));

          if (discountObj) {
            // Case A: Linked Discount (e.g., ID pointing to "L1 - 5%")
            computedDiscount = parseFloat(discountObj.percentage);
            discountLabel = discountObj.line_discount;
          } else {
            // Case B: Direct Value/Code (fallback)
            discountLabel = String(connection.discount_type);
          }
        }

        return {
          id: String(item.product_id),
          masterId: String(item.master_id),
          code: item.product_code || "N/A",
          name: item.name,
          unit: item.unit_name,
          unitCount: item.unit_count,
          stock: item.running_inventory,
          price: priceRef ? priceRef.price : 0,
          uom_id: 0,
          // ✅ Data for UI & Calculation
          discountType: discountLabel, // Shows in Badge (e.g. "L1")
          supplierDiscount: computedDiscount, // Used for auto-applying %
        };
      })
      .filter((p) => Number(p.stock ?? 0) > 0);

    // 3. Group by MASTER ID (Parent Relationship)
    const groups: Record<string, any> = {};

    enrichedItems.forEach((item) => {
      const groupKey = item.masterId;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          masterId: groupKey,
          masterCode: item.code,
          masterName: item.name,
          variants: [],
        };
      }
      groups[groupKey].variants.push(item);
    });

    // 4. Finalize Groups (Sort variants)
    return Object.values(groups).map((group) => {
      group.variants.sort((a: any, b: any) => a.unitCount - b.unitCount);
      if (group.variants.length > 0) {
        group.masterName = group.variants[0].name;
      }
      group.variants.sort((a: any, b: any) => b.unitCount - a.unitCount);
      return group;
    });
  }, [
    inventory,
    refs.products,
    refs.connections,
    refs.discounts,
    selection.supplierId,
  ]);

  useEffect(() => {
    if (selection.supplierId && selection.branchId) {
      loadInventory(Number(selection.branchId), Number(selection.supplierId));
    }
  }, [selection.supplierId, selection.branchId]);

  const addToCart = (p: any, qty = 1) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === p.id);
      if (exists)
        return prev.map((i) =>
          i.id === p.id ? { ...i, quantity: i.quantity + qty } : i,
        );
      return [
        ...prev,
        {
          ...p,
          quantity: qty,
          onHand: p.stock,
          // ✅ Apply the fetched Supplier Discount automatically
          discount: p.supplierDiscount || 0,
          customPrice: p.price,
        },
      ];
    });
  };

  const updateCart = (id: string, field: keyof CartItem, val: number) => {
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: val } : i)),
    );
  };

  const handleCloseFull = () => {
    setSelection({ supplierId: "", branchId: "", remarks: "" });
    setCart([]);
    setStep("input");
    setShowPicker(false);
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const rts_items = cart.map((item) => {
      const { gross, discountAmount, net } = calculateLineItem(item);
      return {
        product_id: Number(item.id),
        uom_id: item.uom_id || 1,
        quantity: item.quantity * (item.unitCount || 1),
        gross_unit_price: item.customPrice || item.price,
        gross_amount: gross,
        discount_rate: item.discount,
        discount_amount: discountAmount,
        net_amount: net,
        item_remarks: "",
      };
    });

    const success = await ReturnToSupplierProvider.createTransaction({
      supplier_id: Number(selection.supplierId),
      branch_id: Number(selection.branchId),
      transaction_date: new Date().toISOString().split("T")[0],
      is_posted: 0,
      remarks: selection.remarks,
      rts_items,
    });

    if (success) {
      onReturnCreated();
      handleCloseFull();
    } else {
      alert("Failed to create return transaction.");
    }
    setSubmitting(false);
  };

  const getModalWidth = () => {
    if (showPicker) return "w-[98vw] !max-w-[90vw] h-[95vh]";
    return "w-[95vw] !max-w-[1300px] h-[80vh]";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseFull()}>
      <DialogContent
        className={`p-0 overflow-hidden gap-0 ${getModalWidth()} bg-white border-none shadow-2xl [&>button]:hidden transition-all duration-300`}
      >
        <DialogHeader className="px-6 py-5 border-b flex flex-row items-center justify-between bg-white z-20 shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            {showPicker ? (
              <>
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Plus className="h-5 w-5 text-blue-600" />
                </div>
                Add Products
              </>
            ) : step === "input" ? (
              "Create Return"
            ) : (
              "Review Transaction"
            )}
          </DialogTitle>
          <button
            onClick={showPicker ? () => setShowPicker(false) : handleCloseFull}
            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow-sm transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <div
          className={`${showPicker ? "overflow-hidden h-[calc(95vh-70px)]" : "overflow-y-auto p-8 max-h-[85vh] bg-slate-50/50"}`}
        >
          {showPicker ? (
            <ProductPicker
              isVisible={true}
              onClose={() => setShowPicker(false)}
              products={groupedProducts}
              addedProducts={cart}
              onAdd={addToCart}
              onRemove={(id) => setCart((c) => c.filter((i) => i.id !== id))}
              onUpdateQty={(id, q) => updateCart(id, "quantity", q)}
              onClearAll={() => setCart([])}
              isLoading={isLoadingInventory}
            />
          ) : (
            <div className="space-y-8">
              {step === "input" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  {/* Supplier Select */}
                  <div className="space-y-2 flex flex-col">
                    <Label className="text-xs font-bold text-slate-700 uppercase">
                      Supplier *
                    </Label>
                    <Popover
                      open={openSupplier}
                      onOpenChange={setOpenSupplier}
                      modal={true}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full h-11 justify-between bg-slate-50 border-slate-200"
                        >
                          {selection.supplierId
                            ? refs.suppliers.find(
                                (s) => String(s.id) === selection.supplierId,
                              )?.supplier_name
                            : "Select Supplier..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search supplier..."
                            value={supplierSearch}
                            onValueChange={setSupplierSearch}
                          />
                          <CommandList>
                            <CommandGroup>
                              {filteredSuppliers.map((s) => (
                                <CommandItem
                                  key={s.id}
                                  value={String(s.id)}
                                  onSelect={() => {
                                    setSelection((prev) => ({
                                      ...prev,
                                      supplierId: String(s.id),
                                    }));
                                    setCart([]);
                                    setOpenSupplier(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selection.supplierId === String(s.id)
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {s.supplier_name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Branch Select */}
                  <div className="space-y-2 flex flex-col">
                    <Label className="text-xs font-bold text-slate-700 uppercase">
                      Branch *
                    </Label>
                    <Popover
                      open={openBranch}
                      onOpenChange={setOpenBranch}
                      modal={true}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full h-11 justify-between bg-slate-50 border-slate-200"
                        >
                          {selection.branchId
                            ? refs.branches.find(
                                (b) => String(b.id) === selection.branchId,
                              )?.branch_name
                            : "Select Branch..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search branch..."
                            value={branchSearch}
                            onValueChange={setBranchSearch}
                          />
                          <CommandList>
                            <CommandGroup>
                              {filteredBranches.map((b) => (
                                <CommandItem
                                  key={b.id}
                                  value={String(b.id)}
                                  onSelect={() => {
                                    setSelection((prev) => ({
                                      ...prev,
                                      branchId: String(b.id),
                                    }));
                                    setOpenBranch(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selection.branchId === String(b.id)
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {b.branch_name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex gap-8">
                  {/* Review Mode Summary */}
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase">
                      Supplier
                    </div>
                    <div className="text-lg font-bold">
                      {
                        refs.suppliers.find(
                          (s) => String(s.id) === selection.supplierId,
                        )?.supplier_name
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase">
                      Branch
                    </div>
                    <div className="text-lg font-bold">
                      {
                        refs.branches.find(
                          (b) => String(b.id) === selection.branchId,
                        )?.branch_name
                      }
                    </div>
                  </div>
                </div>
              )}

              {/* Cart Section */}
              {selection.supplierId && selection.branchId ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />{" "}
                      {step === "input" ? "Items" : "Summary"}
                    </Label>
                    {step === "input" && (
                      <Button
                        onClick={() => setShowPicker(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-xs"
                      >
                        <Plus className="mr-2 h-3 w-3" /> Add
                      </Button>
                    )}
                  </div>
                  {cart.length > 0 ? (
                    <ReturnReviewPanel
                      items={cart}
                      lineDiscounts={refs.discounts}
                      onUpdateItem={updateCart}
                      onRemoveItem={(id) =>
                        setCart((c) => c.filter((i) => i.id !== id))
                      }
                      remarks={selection.remarks}
                      setRemarks={(r) =>
                        setSelection((s) => ({ ...s, remarks: r }))
                      }
                      readOnly={step === "review"}
                    />
                  ) : (
                    <div className="border-2 border-dashed h-32 flex items-center justify-center text-slate-400 text-sm">
                      No items selected
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed h-32 flex items-center justify-center text-slate-400 text-sm">
                  Please select Supplier and Branch first.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!showPicker && (
          <DialogFooter className="px-8 py-5 border-t bg-white shrink-0">
            {step === "review" && (
              <Button
                variant="ghost"
                onClick={() => setStep("input")}
                className="mr-auto"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleCloseFull}
              className="mr-2"
            >
              Cancel
            </Button>
            {step === "input" ? (
              <Button
                disabled={
                  !selection.supplierId ||
                  !selection.branchId ||
                  cart.length === 0
                }
                onClick={() => setStep("review")}
                className="bg-blue-600 text-white"
              >
                Review <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {submitting ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : (
                  "Confirm Return"
                )}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
