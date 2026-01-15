"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Plus, X, Package, Check, AlertTriangle, Loader2, ArrowRight, ArrowLeft, Building2, Store } from "lucide-react"; 
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

// --- IMPORTS ---
import { Product, CartItem, Supplier, Branch, ProductSupplier, LineDiscount } from "../type";
import { ReturnToSupplierProvider } from "../providers/api"; 
import { ProductPicker } from "./ProductPicker";
import { ReturnReviewPanel } from "./ReturnReviewPanel";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onReturnCreated: () => void;
}

type ModalStep = 'input' | 'review';

export function CreateReturnModal({ isOpen, onClose, onReturnCreated }: Props) {
  // --- DATA STATE ---
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productConnections, setProductConnections] = useState<ProductSupplier[]>([]);
  const [lineDiscounts, setLineDiscounts] = useState<LineDiscount[]>([]); 
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- WORKFLOW STATE ---
  const [step, setStep] = useState<ModalStep>('input');

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

  // Refs for click outside
  const supplierRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);

  // --- FILTERED PRODUCTS LOGIC ---
  const filteredProducts = useMemo(() => {
    if (!selectedSupplierId) return []; 
    const validProductIds = productConnections
        .filter(conn => conn.supplier_id === Number(selectedSupplierId))
        .map(conn => String(conn.product_id));
    return products.filter(p => validProductIds.includes(p.id));
  }, [products, productConnections, selectedSupplierId]);

  // --- FETCH DATA ON MOUNT ---
  useEffect(() => {
    if (isOpen) {
        setStep('input'); // Reset step on open
        const loadData = async () => {
            setIsLoadingData(true);
            try {
                const [
                    suppliersData, 
                    branchesData, 
                    productsData, 
                    connectionsData, 
                    lineDiscountsData
                ] = await Promise.all([
                    ReturnToSupplierProvider.getSuppliers(),
                    ReturnToSupplierProvider.getBranches(),
                    ReturnToSupplierProvider.getProducts(),
                    ReturnToSupplierProvider.getProductSupplierConnections(),
                    ReturnToSupplierProvider.getLineDiscounts()
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

  // Close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(event.target as Node)) {
        setSupplierOpen(false);
      }
      if (branchRef.current && !branchRef.current.contains(event.target as Node)) {
        setBranchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- ACTIONS ---
  const handleAddProduct = (product: Product, quantity: number = 1) => {
    const existing = addedProducts.find(p => p.id === product.id);
    if (existing) {
        updateItem(product.id, 'quantity', existing.quantity + quantity);
    } else {
        setAddedProducts([...addedProducts, { 
            ...product, 
            quantity: quantity, 
            onHand: 100, 
            discount: 0, 
            customPrice: product.price 
        }]);
    }
  };

  const updateItem = (id: string, field: keyof CartItem, value: number) => {
      setAddedProducts(current => 
          current.map(item => item.id === id ? { ...item, [field]: value } : item)
      );
  };

  const handleRemoveProduct = (productId: string) => {
      setAddedProducts(addedProducts.filter(p => p.id !== productId));
  };

  const handleClearAllRequest = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    setAddedProducts([]);
    setShowClearConfirm(false);
  };

  const handleCloseFull = () => {
    if (showClearConfirm) return; 
    
    // Reset Form
    setSelectedSupplierId("");
    setSupplierQuery("");
    setSelectedBranchId("");
    setBranchQuery("");
    setRemarks("");
    setShowProductPicker(false);
    setAddedProducts([]);
    setStep('input');
    onClose();
  }

  // --- STEP 1: REVIEW CLICK ---
  const handleGoToReview = () => {
    if (!selectedSupplierId || !selectedBranchId || addedProducts.length === 0) {
        // Simple validation check
        return;
    }
    setStep('review');
  };

  // --- STEP 2: SUBMIT CLICK ---
  const handleCreateReturn = async () => {
    if (!selectedSupplierId || !selectedBranchId || addedProducts.length === 0) return;

    setIsSubmitting(true);
    try {
        const formattedItems = addedProducts.map(item => {
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
                item_remarks: "" 
            };
        });

        const payload = {
            supplier_id: Number(selectedSupplierId),
            branch_id: Number(selectedBranchId),
            transaction_date: new Date().toISOString().split('T')[0],
            status: "pending", 
            remarks: remarks,
            is_posted: 0,
            rts_items: formattedItems 
        };

        const success = await ReturnToSupplierProvider.createReturnTransaction(payload);
        
        if (success) {
            onReturnCreated(); 
            handleCloseFull(); 
        } else {
            alert("Failed to create return. Check console for details.");
        }
    } catch (error) {
        console.error("Submission error:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const getModalWidth = () => {
      if (showProductPicker) return 'w-[98vw] sm:max-w-[1300px] h-[95vh]';
      if (addedProducts.length > 0) return 'w-[95vw] sm:max-w-[1200px]';
      return 'w-[90vw] sm:max-w-[700px]';
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.supplier_name.toLowerCase().includes(supplierQuery.toLowerCase())
  );
  
  const filteredBranches = branches.filter(b => 
    b.branch_name.toLowerCase().includes(branchQuery.toLowerCase())
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseFull()}>
        <DialogContent 
          className={`p-0 overflow-hidden gap-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${getModalWidth()} bg-white border-none shadow-2xl [&>button]:hidden`}
        >
          
          {/* HEADER */}
          {showProductPicker ? (
              <DialogHeader className="px-6 py-5 border-b flex flex-row items-center justify-between bg-white z-20 h-[70px] flex-shrink-0">
                  <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <div className="bg-blue-100 p-2 rounded-lg"><Plus className="h-5 w-5 text-blue-600" /></div>
                      Add Products
                  </DialogTitle>
                  <button 
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center"
                    onClick={() => setShowProductPicker(false)}
                    title="Close Picker"
                  >
                      <X className="h-5 w-5" />
                  </button>
              </DialogHeader>
          ) : (
              <DialogHeader className="px-8 py-6 border-b flex flex-row items-center justify-between flex-shrink-0 bg-white">
                  <div>
                      <DialogTitle className="text-xl font-bold text-slate-900">
                          {step === 'input' ? "Create Return to Supplier" : "Review Transaction"}
                      </DialogTitle>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                          {step === 'input' ? "Fill in the details below to process a return." : "Please review the details before confirming."}
                      </p>
                  </div>
                  <button 
                    onClick={handleCloseFull} 
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center"
                    title="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
              </DialogHeader>
          )}

          {/* BODY */}
          <div className={`
              overflow-y-auto bg-slate-50/50 
              ${showProductPicker ? "h-[calc(95vh-70px)]" : "p-8 max-h-[85vh]"}
          `}>
              {showProductPicker ? (
                  <ProductPicker 
                      isVisible={showProductPicker}
                      onClose={() => setShowProductPicker(false)}
                      products={filteredProducts} 
                      addedProducts={addedProducts}
                      onAdd={handleAddProduct}
                      onRemove={handleRemoveProduct}
                      onUpdateQty={(id, qty) => updateItem(id, 'quantity', qty)}
                      onClearAll={handleClearAllRequest}
                  />
              ) : (
                  <div className="space-y-8">
                      {/* FORM SECTION - Shown in INPUT, Replaced by Summary in REVIEW */}
                      
                      {step === 'input' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative z-20">
                              {/* Supplier Input */}
                              <div className="space-y-2.5 flex flex-col relative" ref={supplierRef}>
                                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Supplier <span className="text-red-500">*</span></Label>
                                  <div className="relative">
                                      <Input 
                                          placeholder={isLoadingData ? "Loading..." : "Select or type supplier..."}
                                          value={supplierQuery}
                                          onChange={(e) => {
                                              setSupplierQuery(e.target.value);
                                              setSupplierOpen(true);
                                              if (selectedSupplierId && e.target.value !== suppliers.find(s => s.supplier_name === selectedSupplierId)?.supplier_name) {
                                                  setSelectedSupplierId("");
                                                  setAddedProducts([]);
                                              }
                                          }}
                                          onFocus={() => setSupplierOpen(true)}
                                          className="h-11 bg-slate-50 focus:bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal rounded-lg"
                                      />
                                  </div>
                                  {supplierOpen && (
                                      <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-100 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[200px] overflow-auto custom-scrollbar">
                                          {filteredSuppliers.length === 0 ? (
                                              <div className="py-3 text-center text-xs text-slate-500">No supplier found.</div>
                                          ) : (
                                              filteredSuppliers.map((supplier) => (
                                                  <div
                                                      key={supplier.id}
                                                      className="px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center font-medium transition-colors"
                                                      onClick={() => {
                                                          setSelectedSupplierId(String(supplier.id));
                                                          setSupplierQuery(supplier.supplier_name);
                                                          setSupplierOpen(false);
                                                          setAddedProducts([]);
                                                      }}
                                                  >
                                                      <Check className={cn("mr-2 h-4 w-4 text-blue-600", selectedSupplierId === String(supplier.id) ? "opacity-100" : "opacity-0")} />
                                                      {supplier.supplier_name}
                                                  </div>
                                              ))
                                          )}
                                      </div>
                                  )}
                              </div>

                              {/* Branch Input */}
                              <div className="space-y-2.5 flex flex-col relative" ref={branchRef}>
                                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Branch <span className="text-red-500">*</span></Label>
                                  <div className="relative">
                                      <Input 
                                          placeholder={isLoadingData ? "Loading..." : "Select or type branch..."}
                                          value={branchQuery}
                                          onChange={(e) => {
                                              setBranchQuery(e.target.value);
                                              setBranchOpen(true);
                                              if (selectedBranchId && e.target.value !== branches.find(b => b.branch_name === selectedBranchId)?.branch_name) {
                                                  setSelectedBranchId("");
                                              }
                                          }}
                                          onFocus={() => setBranchOpen(true)}
                                          className="h-11 bg-slate-50 focus:bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal rounded-lg"
                                      />
                                  </div>
                                  {branchOpen && (
                                      <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-100 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[200px] overflow-auto custom-scrollbar">
                                          {filteredBranches.length === 0 ? (
                                              <div className="py-3 text-center text-xs text-slate-500">No branch found.</div>
                                          ) : (
                                              filteredBranches.map((branch) => (
                                                  <div
                                                      key={branch.id}
                                                      className="px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center font-medium transition-colors"
                                                      onClick={() => {
                                                          setSelectedBranchId(String(branch.id));
                                                          setBranchQuery(branch.branch_name);
                                                          setBranchOpen(false);
                                                      }}
                                                  >
                                                      <Check className={cn("mr-2 h-4 w-4 text-blue-600", selectedBranchId === String(branch.id) ? "opacity-100" : "opacity-0")} />
                                                      {branch.branch_name} 
                                                  </div>
                                              ))
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>
                      ) : (
                          // STEP 2: SUMMARY VIEW
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-8 animate-in fade-in zoom-in-95">
                              <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                      <Building2 className="h-4 w-4" /> Supplier
                                  </div>
                                  <div className="text-lg font-bold text-slate-900">{supplierQuery}</div>
                              </div>
                              <div className="w-px h-12 bg-slate-100 mx-4" />
                              <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                      <Store className="h-4 w-4" /> Branch
                                  </div>
                                  <div className="text-lg font-bold text-slate-900">{branchQuery}</div>
                              </div>
                          </div>
                      )}

                      {/* DYNAMIC SECTION (THE CART / REVIEW PANEL) */}
                      {isSelectionComplete ? (
                          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
                              
                              <div className="flex items-center justify-between">
                                  <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                      <Package className="h-4 w-4 text-blue-600" />
                                      {step === 'input' ? "Products to Return" : "Product Summary"}
                                  </Label>
                                  {step === 'input' && (
                                      <Button 
                                          onClick={() => setShowProductPicker(true)} 
                                          className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-5 text-xs font-bold shadow-sm transition-all hover:shadow-blue-200 hover:shadow-lg active:scale-95 rounded-lg"
                                      >
                                          <Plus className="mr-2 h-3.5 w-3.5" /> Add Products
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
                                      readOnly={step === 'review'} // <--- TOGGLE READ ONLY HERE
                                  />
                              ) : (
                                  <div 
                                      className="border-2 border-dashed border-slate-300 rounded-xl h-40 flex flex-col items-center justify-center bg-white text-center px-4 hover:bg-blue-50/30 hover:border-blue-300 transition-all cursor-pointer group"
                                      onClick={() => setShowProductPicker(true)}
                                  >
                                      <div className="bg-slate-100 p-3 rounded-full mb-3 group-hover:bg-blue-100 transition-colors">
                                          <Plus className="h-6 w-6 text-slate-400 group-hover:text-blue-500" />
                                      </div>
                                      <p className="text-sm font-bold text-slate-600 group-hover:text-blue-700 transition-colors">No products added yet.</p>
                                      <p className="text-xs text-slate-400 mt-1 font-medium">Click to browse products or scan barcode</p>
                                  </div>
                              )}
                          </div>
                      ) : (
                          <div className="border-2 border-dashed border-slate-200 rounded-xl h-32 flex items-center justify-center bg-slate-50 text-center px-4 mt-6">
                              <p className="text-sm font-medium text-slate-400 flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
                                  Please select a supplier and branch to begin
                              </p>
                          </div>
                      )}
                  </div>
              )}
          </div>

          {/* FOOTER */}
          {!showProductPicker && (
              <DialogFooter className="px-8 py-5 border-t bg-white sm:justify-between gap-3 flex-shrink-0">
                  
                  {/* LEFT SIDE BUTTONS */}
                  <div>
                    {step === 'review' && (
                        <Button variant="ghost" onClick={() => setStep('input')} className="h-11 px-4 text-slate-500 hover:text-slate-900">
                             <ArrowLeft className="h-4 w-4 mr-2" /> Back to Edit
                        </Button>
                    )}
                  </div>

                  {/* RIGHT SIDE BUTTONS */}
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleCloseFull} className="h-11 px-6 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 hover:text-slate-900 rounded-xl">Cancel</Button>
                    
                    {step === 'input' ? (
                        <Button 
                            disabled={!isSelectionComplete || addedProducts.length === 0} 
                            onClick={handleGoToReview}
                            className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-8 font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none rounded-xl"
                        >
                            Review Transaction <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button 
                            disabled={isSubmitting} 
                            onClick={handleCreateReturn}
                            className="bg-green-600 hover:bg-green-700 text-white h-11 px-8 font-bold shadow-lg shadow-green-200 hover:shadow-green-300 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none rounded-xl"
                        >
                            {isSubmitting ? (
                                <>
                                   <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                                </>
                            ) : "Confirm & Submit"}
                        </Button>
                    )}
                  </div>
              </DialogFooter>
          )}
          
        </DialogContent>
      </Dialog>

      {/* --- CONFIRMATION DIALOG (Clear All) --- */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl bg-white rounded-xl">
            <div className="p-6 pt-8 text-center flex flex-col items-center">
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4 ring-8 ring-red-50/50">
                    <AlertTriangle className="h-7 w-7 text-red-500" />
                </div>
                <DialogTitle className="text-lg font-bold text-slate-900 mb-2 text-center">
                    Clear all products?
                </DialogTitle>
                <p className="text-sm text-slate-500 mb-6 max-w-[280px] leading-relaxed font-medium">
                    This will remove all {addedProducts.length} items from your selected list. This action cannot be undone.
                </p>
                <div className="grid grid-cols-2 gap-3 w-full">
                    <Button 
                        variant="outline" 
                        onClick={() => setShowClearConfirm(false)} 
                        className="h-10 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 rounded-lg"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={confirmClearAll} 
                        className="h-10 bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-100 rounded-lg"
                    >
                        Yes, Clear All
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}