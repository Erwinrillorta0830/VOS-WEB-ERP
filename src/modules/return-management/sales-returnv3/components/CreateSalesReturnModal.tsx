"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  AlertCircle,
  FileText,
  User,
  Calculator,
  CheckCircle,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import {
  SalesReturnItem,
  API_LineDiscount,
  API_SalesReturnType,
  InvoiceOption,
} from "../type";

// Import Child Modal
import { ProductLookupModal } from "./ProductLookupModal";
// Import Provider & Types
import {
  SalesReturnProvider,
  SalesmanOption,
  CustomerOption,
  BranchOption,
} from "../provider/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateSalesReturnModal({ isOpen, onClose, onSuccess }: Props) {
  // --- 1. FORM STATE ---
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [selectedSalesmanId, setSelectedSalesmanId] = useState("");
  const [salesmanCode, setSalesmanCode] = useState("");
  const [branchName, setBranchName] = useState("");

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerCode, setCustomerCode] = useState("");

  const [priceType, setPriceType] = useState("A");

  const [isThirdParty, setIsThirdParty] = useState(false);
  // Success Modal State
  const [isSuccessOpen, setSuccessOpen] = useState(false);

  // UI State for Validation
  const [validationError, setValidationError] = useState<string | null>(null);

  // Bottom Form Fields
  const [orderNo, setOrderNo] = useState("");

  // INVOICE STATE
  const [invoiceNo, setInvoiceNo] = useState("");
  const [remarks, setRemarks] = useState("");

  // --- 2. DATA LISTS ---
  const [salesmen, setSalesmen] = useState<SalesmanOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  const [lineDiscountOptions, setLineDiscountOptions] = useState<
    API_LineDiscount[]
  >([]);
  const [returnTypeOptions, setReturnTypeOptions] = useState<
    API_SalesReturnType[]
  >([]);

  // INVOICE DATA LIST & DROPDOWN STATE
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const invoiceWrapperRef = useRef<HTMLDivElement>(null);

  // --- 3. CART STATE ---
  const [items, setItems] = useState<SalesReturnItem[]>([]);
  const [isProductLookupOpen, setIsProductLookupOpen] = useState(false);

  // --- 4. SEARCHABLE DROPDOWN STATES ---
  const [isSalesmanOpen, setIsSalesmanOpen] = useState(false);
  const [salesmanSearch, setSalesmanSearch] = useState("");
  const salesmanWrapperRef = useRef<HTMLDivElement>(null);

  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const customerWrapperRef = useRef<HTMLDivElement>(null);

  // --- 5. INITIAL LOAD ---
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          const [
            salesmenData,
            customersData,
            branchesData,
            lineDiscountData,
            returnTypesData,
            invoiceListData,
          ] = await Promise.all([
            SalesReturnProvider.getFormSalesmen(),
            SalesReturnProvider.getFormCustomers(),
            SalesReturnProvider.getFormBranches(),
            SalesReturnProvider.getLineDiscounts(),
            SalesReturnProvider.getSalesReturnTypes(),
            SalesReturnProvider.getInvoiceReturnList(),
          ]);
          setSalesmen(salesmenData);
          setCustomers(customersData);
          setBranches(branchesData);
          setLineDiscountOptions(lineDiscountData);
          setReturnTypeOptions(returnTypesData);
          setInvoiceOptions(invoiceListData);
        } catch (error) {
          console.error("Failed to load form data", error);
        }
      };
      loadData();
    }
  }, [isOpen]);

  // --- 6. CLICK OUTSIDE HANDLERS ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      // Salesman
      if (
        salesmanWrapperRef.current &&
        !salesmanWrapperRef.current.contains(target)
      ) {
        setIsSalesmanOpen(false);
        const found = salesmen.find(
          (s) => s.id.toString() === selectedSalesmanId,
        );
        if (found) setSalesmanSearch(found.name);
      }

      // Customer
      if (
        customerWrapperRef.current &&
        !customerWrapperRef.current.contains(target)
      ) {
        setIsCustomerOpen(false);
        const found = customers.find(
          (c) => c.id.toString() === selectedCustomerId,
        );
        if (found) setCustomerSearch(found.name);
      }

      // Invoice
      if (
        invoiceWrapperRef.current &&
        !invoiceWrapperRef.current.contains(target)
      ) {
        setIsInvoiceOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedSalesmanId, salesmen, selectedCustomerId, customers]);

  // --- RESET FUNCTION ---
  const resetForm = () => {
    setItems([]);
    setReturnDate(new Date().toISOString().split("T")[0]);
    setSelectedSalesmanId("");
    setSalesmanSearch("");
    setSalesmanCode("");
    setSelectedCustomerId("");
    setCustomerSearch("");
    setCustomerCode("");
    setBranchName("");
    setPriceType("A");
    setRemarks("");
    setOrderNo("");
    setInvoiceNo("");
    setInvoiceSearch("");
    setIsThirdParty(false);
    setValidationError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // --- 7. FILTERING & SELECTION ---
  const filteredSalesmen = salesmen.filter((s) =>
    s.name.toLowerCase().includes(salesmanSearch.toLowerCase()),
  );
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()),
  );

  const filteredInvoices = invoiceOptions.filter((inv) =>
    inv.invoice_no.toLowerCase().includes(invoiceSearch.toLowerCase()),
  );

  const handleSelectSalesman = (salesman: SalesmanOption) => {
    setSelectedSalesmanId(salesman.id.toString());
    setSalesmanSearch(salesman.name);
    setSalesmanCode(salesman.code);
    setPriceType(salesman.priceType || "A");
    const linkedBranch = branches.find((b) => b.id === salesman.branchId);
    setBranchName(linkedBranch ? linkedBranch.name : "");
    setValidationError(null);
    setIsSalesmanOpen(false);
  };

  const handleSelectCustomer = (customer: CustomerOption) => {
    setSelectedCustomerId(customer.id.toString());
    setCustomerSearch(customer.name);
    setCustomerCode(customer.code || "");
    setValidationError(null);
    setIsCustomerOpen(false);
  };

  // --- 8. VALIDATION & ACTIONS ---
  const handleOpenProductLookup = () => {
    setValidationError(null);
    if (!returnDate) {
      setValidationError("Please select a Return Date before adding products.");
      return;
    }
    if (!selectedSalesmanId) {
      setValidationError("Please select a Salesman before adding products.");
      return;
    }
    if (!selectedCustomerId) {
      setValidationError("Please select a Customer before adding products.");
      return;
    }
    setIsProductLookupOpen(true);
  };

  const handleCreateReturn = async () => {
    setValidationError(null);
    if (!returnDate) {
      setValidationError("Return Date is required.");
      return;
    }
    if (items.length === 0) {
      setValidationError("Please add at least one product.");
      return;
    }
    // 🟢 REVISION: Added Validation for Order No.
    if (!orderNo.trim()) {
      setValidationError("Order No. is required.");
      return;
    }

    const invalidItems = items.some(
      (item) => !item.returnType || item.returnType === "",
    );

    if (invalidItems) {
      setValidationError("Please select a Return Type for all items.");
      return;
    }

    try {
      const selectedSalesmanObj = salesmen.find(
        (s) => s.id.toString() === selectedSalesmanId,
      );
      const branchId = selectedSalesmanObj
        ? selectedSalesmanObj.branchId
        : null;

      const payload = {
        invoiceNo,
        orderNo,
        customer: customerCode,
        salesmanId: selectedSalesmanId,
        salesmanCode: salesmanCode,
        branchId: branchId,
        isThirdParty,
        totalAmount: totalNet,
        returnDate,
        priceType,
        remarks,
        items,
      };

      await SalesReturnProvider.submitReturn(payload);

      setSuccessOpen(true);
    } catch (error: any) {
      console.error(error);
      setValidationError(error.message || "Failed to create Sales Return.");
    }
  };

  const handleFinalize = () => {
    setSuccessOpen(false);
    if (onSuccess) onSuccess();
    handleClose();
  };

  // --- 9. ITEM LOGIC ---
  const handleAddProducts = (newItems: any[]) => {
    const preparedItems = newItems.map((item) => {
      const rawId = item.product_id || item.productId || item.id;
      return {
        ...item,
        productId: rawId,
        product_id: rawId,
        grossAmount: item.unitPrice * item.quantity,
        discountType: "",
        discountAmount: 0,
        reason: "",
        returnType: "",
      };
    });

    setItems((prev) => [...prev, ...preparedItems]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof SalesReturnItem,
    value: any,
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      (item as any)[field] = value;

      if (field === "quantity" || field === "unitPrice") {
        item.grossAmount = item.quantity * item.unitPrice;
        if (item.discountType) {
          const selectedOption = lineDiscountOptions.find(
            (d) => d.id.toString() === item.discountType?.toString(),
          );
          if (selectedOption) {
            const percentage = parseFloat(selectedOption.percentage) || 0;
            item.discountAmount = (item.grossAmount || 0) * (percentage / 100);
          }
        }
      }

      if (field === "discountType") {
        if (value === "") {
          item.discountAmount = 0;
        } else {
          const selectedOption = lineDiscountOptions.find(
            (d) => d.id.toString() === value.toString(),
          );
          if (selectedOption) {
            const percentage = parseFloat(selectedOption.percentage) || 0;
            item.discountAmount = (item.grossAmount || 0) * (percentage / 100);
          }
        }
      }

      item.totalAmount = (item.grossAmount || 0) - (item.discountAmount || 0);
      updated[index] = item;
      return updated;
    });
  };

  // --- 10. CALCULATIONS ---
  const totalGross = items.reduce(
    (sum, item) => sum + (item.grossAmount || 0),
    0,
  );
  const totalDiscount = items.reduce(
    (sum, item) => sum + (item.discountAmount || 0),
    0,
  );
  const totalNet = items.reduce((sum, item) => sum + item.totalAmount, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-300">
      <div className="bg-slate-50 w-full h-full md:max-w-[1300px] md:h-[95vh] md:rounded-xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/20 animate-in zoom-in-95 duration-300 ease-out">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Create Sales Return
              </h2>
              <p className="text-xs text-gray-500">
                Fill in the details below to process a return
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {validationError && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center justify-between rounded-r shadow-sm">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <span className="text-sm font-medium">{validationError}</span>
              </div>
              <button
                onClick={() => setValidationError(null)}
                className="bg-red-500 hover:bg-red-600 text-white h-7 w-7 rounded-md flex items-center justify-center shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* 1. PRIMARY DETAILS */}
          {/* ... (Same UI Code as before) ... */}
          {/* COL 1: Salesman, COL 2: Customer, COL 3: Date & Price */}
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 rounded-l-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Salesman */}
              <div className="space-y-4">
                <div className="space-y-1.5 relative" ref={salesmanWrapperRef}>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    Salesman <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500" />
                    <input
                      type="text"
                      className="w-full h-10 border border-gray-200 rounded-md text-sm pl-9 pr-8 bg-white outline-none focus:ring-2 focus:border-blue-500"
                      placeholder="Search Salesman..."
                      value={salesmanSearch}
                      onChange={(e) => {
                        setSalesmanSearch(e.target.value);
                        setIsSalesmanOpen(true);
                        setSelectedSalesmanId("");
                        setSalesmanCode("");
                        setBranchName("");
                      }}
                      onFocus={() => {
                        setIsSalesmanOpen(true);
                        setSalesmanSearch("");
                      }}
                    />
                    <ChevronDown className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {isSalesmanOpen && (
                    <div className="absolute top-[calc(100%+4px)] left-0 w-full z-20 bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-y-auto">
                      {filteredSalesmen.map((s) => (
                        <div
                          key={s.id}
                          className="px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 text-gray-700"
                          onClick={() => handleSelectSalesman(s)}
                        >
                          {s.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                    Salesman Code
                  </label>
                  <Input
                    value={salesmanCode}
                    readOnly
                    className="h-10 bg-slate-50 border-gray-200 text-gray-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Customer */}
              <div className="space-y-4">
                <div className="space-y-1.5 relative" ref={customerWrapperRef}>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500" />
                    <input
                      type="text"
                      className="w-full h-10 border border-gray-200 rounded-md text-sm pl-9 pr-8 bg-white outline-none focus:ring-2 focus:border-blue-500"
                      placeholder="Search Customer..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setIsCustomerOpen(true);
                      }}
                      onFocus={() => {
                        setIsCustomerOpen(true);
                        setCustomerSearch("");
                      }}
                    />
                    <ChevronDown className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {isCustomerOpen && (
                    <div className="absolute top-[calc(100%+4px)] left-0 w-full z-20 bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-y-auto">
                      {filteredCustomers.map((c) => (
                        <div
                          key={c.id}
                          className="px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 text-gray-700"
                          onClick={() => handleSelectCustomer(c)}
                        >
                          <div className="flex flex-col">
                            <span>{c.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {c.code}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                    Customer Code
                  </label>
                  <Input
                    value={customerCode}
                    readOnly
                    className="h-10 bg-slate-50 border-gray-200 text-gray-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Date & Price */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    Return Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="h-10 w-full bg-white border-gray-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                      Branch
                    </label>
                    <Input
                      value={branchName}
                      readOnly
                      className="h-10 bg-slate-50 border-gray-200 text-gray-500 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                      Price Type
                    </label>
                    <div className="relative">
                      <select
                        className="w-full h-10 border border-gray-200 rounded-md text-sm px-3 bg-white outline-none focus:ring-2 focus:border-blue-500 appearance-none"
                        value={priceType}
                        onChange={(e) => setPriceType(e.target.value)}
                      >
                        <option value="A">Type A</option>
                        <option value="B">Type B</option>
                        <option value="C">Type C</option>
                        <option value="D">Type D</option>
                        <option value="E">Type E</option>
                      </select>
                      <ChevronDown className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center pt-2">
                  <Checkbox
                    id="thirdParty"
                    checked={isThirdParty}
                    onCheckedChange={(c) => setIsThirdParty(c as boolean)}
                    className="data-[state=checked]:bg-blue-600 border-gray-300"
                  />
                  <label
                    htmlFor="thirdParty"
                    className="ml-2 text-sm font-medium text-gray-600 cursor-pointer select-none"
                  >
                    Third Party Transaction
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 2. PRODUCT TABLE (UNCHANGED) */}
          {/* ... keeping your existing product table component ... */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-5 py-4 bg-white border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <div className="bg-blue-100 p-1.5 rounded text-blue-600">
                  <Calculator className="h-4 w-4" />
                </div>
                Products Summary
              </h3>
              <Button
                size="sm"
                onClick={handleOpenProductLookup}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 shadow-md"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Add Product
              </Button>
            </div>

            <div className="overflow-x-auto relative">
              <table className="w-full text-sm text-left min-w-[1100px]">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider w-28">
                      Code
                    </th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider w-20">
                      Unit
                    </th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider w-24 text-center">
                      Qty
                    </th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider w-28 text-right">
                      Price
                    </th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider w-28 text-right">
                      Gross
                    </th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider w-36">
                      Disc. Type
                    </th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider w-28 text-right">
                      Disc. Amt
                    </th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider w-32 text-right">
                      Total
                    </th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider w-40">
                      Reason
                    </th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider w-40">
                      Return Type
                    </th>
                    <th className="sticky right-0 z-10 px-2 py-3 w-12 bg-blue-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="px-6 py-16 text-center text-gray-400 bg-slate-50"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 text-gray-300 mb-1" />
                          <p>No items added yet.</p>
                          <span className="text-xs">
                            Click "Add Product" to browse catalog.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-blue-50/50 group transition-colors duration-200"
                      >
                        <td className="px-4 py-2 font-mono text-xs text-gray-500">
                          {item.code}
                        </td>
                        <td className="px-4 py-2 font-medium text-gray-800">
                          {item.description}
                        </td>
                        <td className="px-4 py-2">
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs border border-gray-200">
                            {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="1"
                            className="w-full text-center border border-gray-300 rounded h-8 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "quantity",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          ₱{item.unitPrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500">
                          ₱{(item.grossAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">
                          <select
                            className="w-full border border-gray-300 rounded h-8 text-xs px-1 bg-white focus:border-blue-500 outline-none"
                            value={item.discountType || ""}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "discountType",
                                e.target.value,
                              )
                            }
                          >
                            <option value="">None</option>
                            {lineDiscountOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.line_discount}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            readOnly
                            disabled
                            className="w-full text-right border border-gray-200 bg-gray-100 text-gray-500 rounded h-8 text-sm outline-none cursor-not-allowed"
                            value={
                              item.discountAmount === 0
                                ? ""
                                : item.discountAmount
                            }
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-blue-700">
                          ₱{item.totalAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            placeholder="Enter reason"
                            className="w-full border border-gray-300 rounded h-8 text-xs px-2 outline-none focus:border-blue-500"
                            value={item.reason || ""}
                            onChange={(e) =>
                              handleItemChange(idx, "reason", e.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            required
                            className="w-full border border-gray-300 rounded h-8 text-xs px-1 bg-white outline-none focus:border-blue-500"
                            value={item.returnType || ""}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "returnType",
                                e.target.value,
                              )
                            }
                          >
                            <option value="" disabled>
                              Select an option
                            </option>
                            {returnTypeOptions.length > 0 ? (
                              returnTypeOptions.map((type) => (
                                <option
                                  key={type.type_id}
                                  value={type.type_name}
                                >
                                  {type.type_name}
                                </option>
                              ))
                            ) : (
                              <>
                                <option value="Good Order">Good Order</option>
                                <option value="Bad Order">Bad Order</option>
                              </>
                            )}
                          </select>
                        </td>
                        <td className="sticky right-0 z-10 px-2 py-2 text-center bg-white border-l border-transparent group-hover:border-blue-100">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="bg-red-500 hover:bg-red-600 text-white h-7 w-7 rounded-md flex items-center justify-center shadow-sm"
                            title="Remove Item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. BOTTOM SUMMARY */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
            <div className="space-y-4 bg-white p-5 rounded-lg border border-gray-200 shadow-sm h-full">
              <h4 className="font-bold text-gray-700 text-sm mb-2">
                Additional Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    Order No. <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={orderNo}
                    onChange={(e) => setOrderNo(e.target.value)}
                    className="h-9 border-gray-300 focus:bg-white"
                    placeholder="e.g. ORD-001"
                  />
                </div>

                {/* INVOICE NO DROPDOWN */}
                <div className="space-y-1.5" ref={invoiceWrapperRef}>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    Invoice No. (Optional)
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      className="w-full h-9 border border-gray-300 rounded-md text-sm px-3 bg-white outline-none focus:ring-2 focus:border-blue-500"
                      placeholder="e.g. INV-2023"
                      value={invoiceSearch || invoiceNo}
                      onChange={(e) => {
                        setInvoiceSearch(e.target.value);
                        setInvoiceNo(e.target.value);
                        setIsInvoiceOpen(true);
                      }}
                      onFocus={() => setIsInvoiceOpen(true)}
                    />
                    <ChevronDown className="h-3 w-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {isInvoiceOpen && (
                      <div className="absolute bottom-[calc(100%+4px)] left-0 w-full z-50 bg-white border border-gray-200 rounded-md shadow-xl max-h-48 overflow-y-auto">
                        {filteredInvoices.length > 0 ? (
                          filteredInvoices.map((inv) => (
                            <div
                              key={inv.id}
                              className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 text-gray-700"
                              onClick={() => {
                                setInvoiceNo(inv.invoice_no);
                                setInvoiceSearch(inv.invoice_no);
                                setIsInvoiceOpen(false);
                              }}
                            >
                              {inv.invoice_no}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-gray-400 text-center">
                            No invoices found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                  Remarks
                </label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="resize-none h-24 border-gray-300 focus:border-blue-500 focus:bg-white"
                  placeholder="Add any notes regarding this return..."
                />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-0 shadow-sm overflow-hidden h-fit">
              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <h4 className="font-bold text-gray-800">Financial Summary</h4>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Total Gross Amount</span>
                  <span className="font-medium text-gray-900 tabular-nums">
                    ₱
                    {totalGross.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-red-500">
                  <span>Total Discount</span>
                  <span className="font-medium tabular-nums">
                    - ₱
                    {totalDiscount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="my-2 border-t border-dashed border-gray-200"></div>
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-800">
                    Net Amount
                  </span>
                  <span className="text-2xl font-bold text-blue-600 tabular-nums">
                    ₱
                    {totalNet.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateReturn}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 shadow-lg"
          >
            <Save className="h-4 w-4 mr-2" />
            Create Sales Return
          </Button>
        </div>
      </div>

      <ProductLookupModal
        isOpen={isProductLookupOpen}
        onClose={() => setIsProductLookupOpen(false)}
        onConfirm={handleAddProducts}
      />

      {/* SUCCESS MODAL */}
      <Dialog
        open={isSuccessOpen}
        onOpenChange={(open) => !open && handleFinalize()}
      >
        <DialogContent className="max-w-[400px] p-8 bg-white rounded-2xl shadow-2xl border-0 focus:outline-none z-60">
          <div className="flex flex-col items-center text-center gap-6">
            <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center animate-in zoom-in duration-300">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-xl font-bold text-slate-800">
                Success!
              </DialogTitle>
              <div className="text-slate-500">
                Sales Return created successfully.
              </div>
            </div>

            <Button
              onClick={handleFinalize}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base rounded-xl shadow-emerald-200 shadow-lg transition-all active:scale-95"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
