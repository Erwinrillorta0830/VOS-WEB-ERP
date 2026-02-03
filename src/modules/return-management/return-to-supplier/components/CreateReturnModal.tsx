"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus,
  X,
  Package,
  Check,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import {
  Product,
  CartItem,
  Supplier,
  Branch,
  ProductSupplier,
  LineDiscount,
} from "../type";
import { ReturnToSupplierProvider } from "../providers/api";
import { ProductPicker } from "./ProductPicker";
import { ReturnReviewPanel } from "./ReturnReviewPanel";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onReturnCreated: () => void;
}

type ModalStep = "input" | "review";

export function CreateReturnModal({ isOpen, onClose, onReturnCreated }: Props) {
  // --- DATA STATE ---
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productConnections, setProductConnections] = useState<
    ProductSupplier[]
  >([]);
  const [lineDiscounts, setLineDiscounts] = useState<LineDiscount[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inventory Map
  const [inventoryMap, setInventoryMap] = useState<Map<number, number>>(
    new Map(),
  );

  // --- WORKFLOW STATE ---
  const [step, setStep] = useState<ModalStep>("input");

  // --- FORM STATE ---
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [branchQuery, setBranchQuery] = useState("");
  const [branchOpen, setBranchOpen] = useState(false);
  const [remarks, setRemarks] = useState("");

  // --- VIEW STATE ---
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [addedProducts, setAddedProducts] = useState<CartItem[]>([]);

  const isSelectionComplete = selectedSupplierId && selectedBranchId;
  const supplierRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);

  // --- FILTERED PRODUCTS LOGIC ---
  const filteredProducts = useMemo(() => {
    if (!selectedSupplierId) return [];

    const validProductIds = productConnections
      .filter((conn) => conn.supplier_id === Number(selectedSupplierId))
      .map((conn) => String(conn.product_id));

    return (
      products
        .filter((p) => validProductIds.includes(p.id))
        .map((p) => {
          const stockCount = inventoryMap.get(Number(p.id)) || 0;
          return {
            ...p,
            stock: stockCount,
          };
        })
        // ✅ STRICT FILTER: Only show items with available stock
        .filter((p) => (p.stock || 0) > 0)
    );
  }, [products, productConnections, selectedSupplierId, inventoryMap]);

  // --- FETCH DATA ---
  useEffect(() => {
    if (isOpen) {
      setStep("input");
      const loadData = async () => {
        setIsLoadingData(true);
        try {
          const [
            suppliersData,
            branchesData,
            productsData,
            connectionsData,
            lineDiscountsData,
          ] = await Promise.all([
            ReturnToSupplierProvider.getSuppliers(),
            ReturnToSupplierProvider.getBranches(),
            ReturnToSupplierProvider.getProducts(),
            ReturnToSupplierProvider.getProductSupplierConnections(),
            ReturnToSupplierProvider.getLineDiscounts(),
          ]);
          setSuppliers(suppliersData);
          setBranches(branchesData);
          setProducts(productsData);
          setProductConnections(connectionsData);
          setLineDiscounts(lineDiscountsData);
        } catch (error) {
          console.error("Error loading data", error);
        } finally {
          setIsLoadingData(false);
        }
      };
      loadData();
    }
  }, [isOpen]);

  // --- FETCH INVENTORY ---
  useEffect(() => {
    if (!selectedBranchId || !selectedSupplierId) return;

    const fetchInventory = async () => {
      try {
        const data = await ReturnToSupplierProvider.getBranchInventory(
          Number(selectedBranchId),
          Number(selectedSupplierId),
        );

        const map = new Map<number, number>();
        data.forEach((item) => {
          map.set(item.product_id, Number(item.running_inventory));
        });

        setInventoryMap(map);
      } catch (error) {
        console.error("Failed to load inventory", error);
      }
    };

    fetchInventory();
  }, [selectedBranchId, selectedSupplierId]);

  // Close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        supplierRef.current &&
        !supplierRef.current.contains(event.target as Node)
      )
        setSupplierOpen(false);
      if (
        branchRef.current &&
        !branchRef.current.contains(event.target as Node)
      )
        setBranchOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddProduct = (product: Product, quantity: number = 1) => {
    const existing = addedProducts.find((p) => p.id === product.id);
    if (existing) {
      updateItem(product.id, "quantity", existing.quantity + quantity);
    } else {
      setAddedProducts([
        ...addedProducts,
        {
          ...product,
          quantity: quantity,
          onHand: product.stock || 0,
          discount: 0,
          customPrice: product.price,
        },
      ]);
    }
  };

  const updateItem = (id: string, field: keyof CartItem, value: number) => {
    setAddedProducts((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setAddedProducts(addedProducts.filter((p) => p.id !== productId));
  };

  const handleClearAllRequest = () => setShowClearConfirm(true);

  const confirmClearAll = () => {
    setAddedProducts([]);
    setShowClearConfirm(false);
  };

  const handleCloseFull = () => {
    if (showClearConfirm) return;
    setSelectedSupplierId("");
    setSupplierQuery("");
    setSelectedBranchId("");
    setBranchQuery("");
    setRemarks("");
    setShowProductPicker(false);
    setAddedProducts([]);
    setStep("input");
    onClose();
  };

  const handleCreateReturn = async () => {
    if (!selectedSupplierId || !selectedBranchId || addedProducts.length === 0)
      return;
    setIsSubmitting(true);

    try {
      const formattedItems = addedProducts.map((item) => {
        const qty = item.quantity;
        const grossPrice = item.customPrice || item.price;
        const grossAmount = qty * grossPrice;
        const discountRate = item.discount || 0;
        const discountAmount = grossAmount * (discountRate / 100);
        const netAmount = grossAmount - discountAmount;

        return {
          product_id: Number(item.id),
          uom_id: item.uom_id,
          quantity: qty,
          gross_unit_price: grossPrice,
          gross_amount: grossAmount,
          discount_rate: discountRate,
          discount_amount: discountAmount,
          net_amount: netAmount,
          item_remarks: "",
        };
      });

      const payload = {
        supplier_id: Number(selectedSupplierId),
        branch_id: Number(selectedBranchId),
        transaction_date: new Date().toISOString().split("T")[0],
        status: "pending",
        remarks: remarks,
        is_posted: 0,
        rts_items: formattedItems,
      };

      const success =
        await ReturnToSupplierProvider.createReturnTransaction(payload);

      if (success) {
        if (typeof onReturnCreated === "function") onReturnCreated();
        handleCloseFull();
      } else {
        alert("Failed to create return.");
      }
    } catch (error) {
      console.error("Submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModalWidth = () => {
    if (showProductPicker) return "w-[98vw] !max-w-[90vw] h-[95vh]";
    return "w-[95vw] !max-w-[1300px] h-[80vh]";
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseFull()}>
        <DialogContent
          className={`p-0 overflow-hidden gap-0 ${getModalWidth()} bg-white border-none shadow-2xl [&>button]:hidden`}
        >
          {/* HEADER */}
          <DialogHeader className="px-6 py-5 border-b flex flex-row items-center justify-between bg-white z-20 shrink-0">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {showProductPicker ? (
                <>
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Plus className="h-5 w-5 text-blue-600" />
                  </div>
                  Add Products
                </>
              ) : step === "input" ? (
                "Create Return to Supplier"
              ) : (
                "Review Transaction"
              )}
            </DialogTitle>
            <button
              onClick={
                showProductPicker
                  ? () => setShowProductPicker(false)
                  : handleCloseFull
              }
              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow-sm"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>

          {/* ✅ FIX: Removed 'overflow-y-auto' from this parent wrapper when picker is shown.
             This forces ProductPicker to handle its own scrolling internally, preventing the footer 
             from being pushed off-screen.
          */}
          <div
            className={`${showProductPicker ? "overflow-hidden h-[calc(95vh-70px)]" : "overflow-y-auto p-8 max-h-[85vh] bg-slate-50/50"}`}
          >
            {showProductPicker ? (
              <ProductPicker
                isVisible={showProductPicker}
                onClose={() => setShowProductPicker(false)}
                products={filteredProducts}
                addedProducts={addedProducts}
                onAdd={handleAddProduct}
                onRemove={handleRemoveProduct}
                onUpdateQty={(id, qty) => updateItem(id, "quantity", qty)}
                onClearAll={handleClearAllRequest}
              />
            ) : (
              <div className="space-y-8">
                {step === "input" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    {/* Supplier Input */}
                    <div ref={supplierRef} className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700 uppercase">
                        Supplier *
                      </Label>
                      <Input
                        placeholder={
                          isLoadingData ? "Loading..." : "Select supplier..."
                        }
                        value={supplierQuery}
                        onChange={(e) => {
                          setSupplierQuery(e.target.value);
                          setSupplierOpen(true);
                        }}
                        onFocus={() => setSupplierOpen(true)}
                      />
                      {supplierOpen && (
                        <div className="absolute z-50 w-[400px] mt-1 bg-white border rounded-lg shadow-xl max-h-48 overflow-auto">
                          {suppliers
                            .filter((s) =>
                              s.supplier_name
                                .toLowerCase()
                                .includes(supplierQuery.toLowerCase()),
                            )
                            .map((s) => (
                              <div
                                key={s.id}
                                className="p-2 hover:bg-slate-100 cursor-pointer text-sm"
                                onClick={() => {
                                  setSelectedSupplierId(String(s.id));
                                  setSupplierQuery(s.supplier_name);
                                  setSupplierOpen(false);
                                  setAddedProducts([]);
                                }}
                              >
                                {s.supplier_name}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    {/* Branch Input */}
                    <div ref={branchRef} className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700 uppercase">
                        Branch *
                      </Label>
                      <Input
                        placeholder={
                          isLoadingData ? "Loading..." : "Select branch..."
                        }
                        value={branchQuery}
                        onChange={(e) => {
                          setBranchQuery(e.target.value);
                          setBranchOpen(true);
                        }}
                        onFocus={() => setBranchOpen(true)}
                      />
                      {branchOpen && (
                        <div className="absolute z-50 w-[400px] mt-1 bg-white border rounded-lg shadow-xl max-h-48 overflow-auto">
                          {branches
                            .filter((b) =>
                              b.branch_name
                                .toLowerCase()
                                .includes(branchQuery.toLowerCase()),
                            )
                            .map((b) => (
                              <div
                                key={b.id}
                                className="p-2 hover:bg-slate-100 cursor-pointer text-sm"
                                onClick={() => {
                                  setSelectedBranchId(String(b.id));
                                  setBranchQuery(b.branch_name);
                                  setBranchOpen(false);
                                }}
                              >
                                {b.branch_name}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex gap-8">
                    <div>
                      <div className="text-xs text-slate-500 font-bold uppercase">
                        Supplier
                      </div>
                      <div className="text-lg font-bold">{supplierQuery}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-bold uppercase">
                        Branch
                      </div>
                      <div className="text-lg font-bold">{branchQuery}</div>
                    </div>
                  </div>
                )}

                {/* Cart / Review */}
                {isSelectionComplete ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="font-bold flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-600" />{" "}
                        {step === "input" ? "Products to Return" : "Summary"}
                      </Label>
                      {step === "input" && (
                        <Button
                          onClick={() => setShowProductPicker(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-xs"
                        >
                          <Plus className="mr-2 h-3 w-3" /> Add Products
                        </Button>
                      )}
                    </div>
                    {addedProducts.length > 0 ? (
                      <ReturnReviewPanel
                        items={addedProducts}
                        lineDiscounts={lineDiscounts}
                        onUpdateItem={updateItem}
                        onRemoveItem={handleRemoveProduct}
                        remarks={remarks}
                        setRemarks={setRemarks}
                        readOnly={step === "review"}
                      />
                    ) : (
                      <div className="border-2 border-dashed h-32 flex items-center justify-center text-slate-400 text-sm">
                        No products added.
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

          {/* FOOTER */}
          {!showProductPicker && (
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
                  disabled={!isSelectionComplete || addedProducts.length === 0}
                  onClick={() => setStep("review")}
                  className="bg-blue-600 text-white"
                >
                  Review <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateReturn}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : (
                    "Confirm & Submit"
                  )}
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear all items?</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowClearConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmClearAll}>
              Clear
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
