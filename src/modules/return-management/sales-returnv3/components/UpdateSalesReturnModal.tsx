"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Plus,
  Trash2,
  Printer,
  Save,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Link as LinkIcon,
  FileText,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { SalesReturnProvider } from "../provider/api";
import {
  SalesReturn,
  SalesReturnItem,
  SalesReturnStatusCard,
  InvoiceOption,
  API_LineDiscount,
  API_SalesReturnType,
} from "../type";
import { ProductLookupModal } from "./ProductLookupModal";
import { SalesReturnPrintSlip } from "./SalesReturnPrintSlip";
import { createRoot } from "react-dom/client";

interface Props {
  returnId: number;
  initialData: SalesReturn;
  onClose: () => void;
  onSuccess: () => void;
}

const ReadOnlyField = ({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | number | undefined;
  className?: string;
}) => (
  <div className={cn("space-y-1.5", className)}>
    <Label className="text-xs uppercase tracking-wide font-bold text-slate-500">
      {label}
    </Label>
    <div className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-800 shadow-sm">
      {value || "-"}
    </div>
  </div>
);

export function UpdateSalesReturnModal({
  returnId,
  initialData,
  onClose,
  onSuccess,
}: Props) {
  // --- STATE ---
  const [headerData, setHeaderData] = useState<SalesReturn>(initialData);
  const [details, setDetails] = useState<SalesReturnItem[]>([]);
  const [statusCardData, setStatusCardData] =
    useState<SalesReturnStatusCard | null>(null);
  const [loading, setLoading] = useState(true);

  // 🟢 Track the ID for the junction table link
  const [appliedInvoiceId, setAppliedInvoiceId] = useState<number | null>(null);

  const [discountOptions, setDiscountOptions] = useState<API_LineDiscount[]>(
    [],
  );
  const [returnTypeOptions, setReturnTypeOptions] = useState<
    API_SalesReturnType[]
  >([]);
  const [salesmenOptions, setSalesmenOptions] = useState<any[]>([]);
  const [customerOptions, setCustomerOptions] = useState<any[]>([]);

  const [isProductLookupOpen, setIsProductLookupOpen] = useState(false);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [isUpdateSuccessOpen, setIsUpdateSuccessOpen] = useState(false);
  const [isReceiveConfirmOpen, setIsReceiveConfirmOpen] = useState(false);
  const [isInvoiceLookupOpen, setIsInvoiceLookupOpen] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");

  // 🟢 REVISED: Edit Permissions Logic
  const isPending = headerData.status === "Pending";
  const isReceived = headerData.status === "Received";

  // Rule 1: Everything is editable if Pending
  // Rule 2: Only Remarks and Applied To are editable if Received
  const canEditAll = isPending;
  const canEditLimited = isPending || isReceived;

  // --- INITIAL LOAD ---
  useEffect(() => {
    const loadFullDetails = async () => {
      setLoading(true);
      try {
        const [
          items,
          statusData,
          invoices,
          discounts,
          retTypes,
          salesmen,
          customers,
        ] = await Promise.all([
          SalesReturnProvider.getProductsSummary(returnId, headerData.returnNo),
          SalesReturnProvider.getStatusCardData(returnId),
          SalesReturnProvider.getInvoiceReturnList(headerData.customerCode),
          SalesReturnProvider.getLineDiscounts(),
          SalesReturnProvider.getSalesReturnTypes(),
          SalesReturnProvider.getSalesmenList(),
          SalesReturnProvider.getCustomersList(),
        ]);

        setDetails(items);
        setStatusCardData(statusData);
        setInvoiceOptions(invoices);
        setDiscountOptions(discounts);
        setReturnTypeOptions(retTypes);
        setSalesmenOptions(salesmen);
        setCustomerOptions(customers);
      } catch (err) {
        console.error("Failed to load details", err);
      } finally {
        setLoading(false);
      }
    };

    if (returnId) {
      loadFullDetails();
    }
  }, [returnId, headerData.returnNo, headerData.customerCode]);

  // --- HELPERS ---
  const getSalesmanName = (id: any) =>
    salesmenOptions.find((opt) => String(opt.value) === String(id))?.label ||
    id ||
    "-";
  const getSalesmanCode = (id: any) => {
    const found = salesmenOptions.find(
      (opt) => String(opt.value) === String(id),
    );
    return found ? found.code || found.value : id || "-";
  };
  const getSalesmanBranch = (id: any) =>
    salesmenOptions.find((opt) => String(opt.value) === String(id))?.branch ||
    "N/A";
  const getCustomerName = (code: any) =>
    customerOptions.find((opt) => String(opt.value) === String(code))?.label ||
    code ||
    "-";

  // --- HANDLERS: EDIT TABLE ---
  const handleDetailChange = (index: number, field: string, value: any) => {
    setDetails((prev) => {
      const newDetails = [...prev];
      const item = { ...newDetails[index], [field]: value };

      if (field === "discountType") {
        if (value === "No Discount" || !value) {
          item.discountAmount = 0;
        } else {
          const selectedDisc = discountOptions.find(
            (d) => d.id.toString() === value,
          );
          if (selectedDisc) {
            const percentage = parseFloat(selectedDisc.percentage);
            const gross =
              Number(item.quantity || 0) * Number(item.unitPrice || 0);
            item.discountAmount = gross * (percentage / 100);
          }
        }
      }

      const qty = Number(item.quantity || 0);
      const price = Number(item.unitPrice || 0);
      const disc = Number(item.discountAmount || 0);

      item.grossAmount = qty * price;
      item.totalAmount = qty * price - disc;

      newDetails[index] = item;
      return newDetails;
    });
  };

  const handleDeleteRow = (index: number) => {
    setDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddProductsToEdit = (newItems: any[]) => {
    if (!newItems || newItems.length === 0) return;

    const formattedItems = newItems.map((item, index) => {
      const price = Number(item.unitPrice) || Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      const gross = price * qty;
      const discAmt = Number(item.discountAmount) || 0;

      return {
        id: `added-${Date.now()}-${index}-${Math.floor(Math.random() * 10000)}`,
        productId: item.productId || item.product_id || item.id,
        code: item.code || "N/A",
        description: item.description || item.product_name || "Unknown Item",
        unit: item.unit || "Pcs",
        quantity: qty,
        unitPrice: price,
        grossAmount: gross,
        discountType: item.discountType || null,
        discountAmount: discAmt,
        totalAmount: gross - discAmt,
        reason: item.reason || "",
        returnType: item.returnType || "",
      };
    });

    setDetails((prev) => [...prev, ...formattedItems]);
    setIsProductLookupOpen(false);
  };

  // --- HANDLERS: UPDATE ---
  const handleUpdateClick = () => {
    setValidationError(null);
    if (!headerData.orderNo || !headerData.orderNo.toString().trim()) {
      setValidationError("Order No. is required.");
      return;
    }

    const hasIncompleteItems = details.some(
      (item) => !item.returnType || item.returnType === "",
    );
    if (hasIncompleteItems) {
      setValidationError("Please select a 'Return Type' for all items.");
      return;
    }
    setIsUpdateConfirmOpen(true);
  };

  const handleConfirmUpdate = async () => {
    try {
      setIsUpdating(true);
      const payload = {
        returnId: headerData.id,
        returnNo: headerData.returnNo,
        items: details,
        remarks: headerData.remarks || "",
        invoiceNo: headerData.invoiceNo,
        orderNo: headerData.orderNo,
        appliedInvoiceId: appliedInvoiceId ?? undefined,
        isThirdParty: headerData.isThirdParty,
      };

      await SalesReturnProvider.updateReturn(payload);
      setIsUpdateConfirmOpen(false);
      setIsUpdateSuccessOpen(true);
    } catch (error) {
      console.error("Update failed", error);
      alert("Failed to update sales return.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmReceive = async () => {
    try {
      setIsReceiving(true);
      await SalesReturnProvider.updateStatus(headerData.id, "Received");
      setHeaderData({ ...headerData, status: "Received" });
      setStatusCardData((prev) =>
        prev
          ? { ...prev, isReceived: true, transactionStatus: "Received" }
          : null,
      );
      setIsReceiveConfirmOpen(false);
      setIsUpdateSuccessOpen(true);
    } catch (error) {
      console.error("Receive failed", error);
      alert("Failed to receive sales return.");
    } finally {
      setIsReceiving(false);
    }
  };

  const handlePrintInNewTab = () => {
    const printData = {
      returnNo: headerData.returnNo,
      returnDate: headerData.returnDate,
      status: headerData.status,
      remarks: headerData.remarks,
      salesmanName: getSalesmanName(headerData.salesmanId),
      salesmanCode: getSalesmanCode(headerData.salesmanId),
      customerName: getCustomerName(headerData.customerCode),
      customerCode: headerData.customerCode,
      branchName: getSalesmanBranch(headerData.salesmanId),
      items: details,
      totalAmount: details.reduce(
        (acc, item) => acc + (item.totalAmount || 0),
        0,
      ),
    };

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Pop-up blocked.");
      return;
    }

    printWindow.document.write(
      "<html><head><title>Print Preview</title></head><body><div id='print-root'></div></body></html>",
    );
    document
      .querySelectorAll('link[rel="stylesheet"], style')
      .forEach((node) => {
        printWindow.document.head.appendChild(node.cloneNode(true));
      });
    const styleOverride = printWindow.document.createElement("style");
    styleOverride.innerHTML = `
      body { background-color: #e5e7eb; padding: 40px; display: flex; justify-content: center; }
      #print-root { background-color: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
      .hidden { display: block !important; }
    `;
    printWindow.document.head.appendChild(styleOverride);
    const root = createRoot(printWindow.document.getElementById("print-root")!);
    root.render(<SalesReturnPrintSlip data={printData} />);
    printWindow.setTimeout(() => {
      printWindow.print();
    }, 1000);
  };

  // --- RENDER ---
  const totalGross = details.reduce(
    (acc, i) => acc + Number(i.quantity) * Number(i.unitPrice),
    0,
  );
  const totalDiscount = details.reduce(
    (acc, i) => acc + (Number(i.discountAmount) || 0),
    0,
  );
  const totalNet = details.reduce(
    (acc, i) => acc + (Number(i.totalAmount) || 0),
    0,
  );
  const filteredInvoices = invoiceOptions.filter((inv) =>
    inv.invoice_no.toLowerCase().includes(invoiceSearch.toLowerCase()),
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[95vw] lg:max-w-7xl h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-xl [&>button]:hidden">
        {/* HEADER */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div>
            <DialogTitle className="text-2xl font-bold text-slate-800">
              {isPending ? "Edit Sales Return" : "Return Details"}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold uppercase tracking-wider">
                {headerData.returnNo}
              </span>
              <span className="text-slate-400 text-sm">|</span>
              <span className="text-sm text-slate-500">
                {headerData.returnDate}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow-sm transition-all active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {validationError && (
          <div className="mx-8 mt-6 mb-0 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center justify-between rounded-r shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
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

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
          {/* METADATA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-xl border border-blue-100 shadow-sm">
            <div className="space-y-4">
              <ReadOnlyField
                label="Salesman"
                value={getSalesmanName(headerData.salesmanId)}
              />
              <ReadOnlyField
                label="Salesman Code"
                value={getSalesmanCode(headerData.salesmanId)}
              />
              <ReadOnlyField
                label="Branch"
                value={getSalesmanBranch(headerData.salesmanId)}
              />
            </div>
            <div className="space-y-4">
              <ReadOnlyField
                label="Customer"
                value={getCustomerName(headerData.customerCode)}
              />
              <ReadOnlyField
                label="Customer Code"
                value={headerData.customerCode}
              />
              <ReadOnlyField label="Price Type" value={headerData.priceType} />
            </div>
            <div className="flex flex-col space-y-4 h-full">
              <ReadOnlyField
                label="Return Date"
                value={headerData.returnDate}
              />
              <ReadOnlyField
                label="Received Date"
                value={headerData.createdAt}
              />
              <div className="flex items-center space-x-2 pt-2 mt-auto">
                {/* 🟢 REVISED: Disabled if not Pending */}
                <Checkbox
                  id="isThirdParty"
                  checked={headerData.isThirdParty || false}
                  disabled={!canEditAll}
                  onCheckedChange={(checked) =>
                    setHeaderData({
                      ...headerData,
                      isThirdParty: checked as boolean,
                    })
                  }
                />
                <Label
                  htmlFor="isThirdParty"
                  className="text-sm font-medium text-slate-700 cursor-pointer"
                >
                  Third Party Transaction
                </Label>
              </div>
            </div>
          </div>

          {/* PRODUCT TABLE */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="h-5 w-1 bg-blue-600 rounded-full"></span>
                Products Summary
              </h3>
              {/* 🟢 REVISED: Add Button hidden if not Pending */}
              {canEditAll && (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md shadow-blue-200"
                  onClick={() => setIsProductLookupOpen(true)}
                >
                  <Plus className="h-4 w-4" /> Add Product
                </Button>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-600 hover:bg-blue-600! border-none">
                      <TableHead className="text-white font-semibold h-11 w-[120px] uppercase text-xs">
                        Code
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 min-w-[200px] uppercase text-xs">
                        Description
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 w-[80px] uppercase text-xs">
                        Unit
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 text-center min-w-[100px] uppercase text-xs">
                        Qty
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 text-right min-w-[120px] uppercase text-xs">
                        Price
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 text-right w-[100px] uppercase text-xs">
                        Gross
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 w-[130px] uppercase text-xs">
                        Disc. Type
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 text-right w-[100px] uppercase text-xs">
                        Disc. Amt
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 text-right w-[100px] uppercase text-xs">
                        Total
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 min-w-[150px] uppercase text-xs">
                        Reason
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 w-[160px] uppercase text-xs">
                        Return Type
                      </TableHead>
                      {/* 🟢 REVISED: Delete Column hidden if not Pending */}
                      {canEditAll && (
                        <TableHead className="text-white font-semibold h-11 w-[50px]"></TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={12} className="h-32 text-center">
                          <Loader2 className="animate-spin text-blue-500 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : details.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={12}
                          className="h-24 text-center text-slate-500 text-sm"
                        >
                          No products found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      details.map((item, i) => (
                        <TableRow
                          key={item.id || i}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          {/* 🟢 REVISED: All inputs disabled if not Pending (canEditAll) */}
                          <TableCell className="text-xs text-slate-700 font-bold align-middle">
                            {item.code}
                          </TableCell>
                          <TableCell className="align-middle">
                            <div
                              className="text-xs text-slate-700 font-medium truncate max-w-[220px]"
                              title={item.description}
                            >
                              {item.description}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 align-middle">
                            <Badge
                              variant="outline"
                              className="text-slate-600 border-slate-300 font-normal"
                            >
                              {item.unit}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center align-middle p-2">
                            {canEditAll ? (
                              <Input
                                type="number"
                                className="h-9 w-full text-center text-sm border-slate-300 px-2"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleDetailChange(
                                    i,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                              />
                            ) : (
                              <span className="text-xs font-semibold text-slate-700">
                                {item.quantity}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right align-middle p-2">
                            {canEditAll ? (
                              <Input
                                type="number"
                                className="h-9 w-full text-right text-sm border-slate-300 px-2"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleDetailChange(
                                    i,
                                    "unitPrice",
                                    e.target.value,
                                  )
                                }
                              />
                            ) : (
                              <span className="text-xs text-slate-700">
                                {Number(item.unitPrice).toLocaleString()}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs text-slate-600 align-middle font-mono">
                            {(
                              Number(item.quantity) * Number(item.unitPrice)
                            ).toLocaleString()}
                          </TableCell>
                          <TableCell className="align-middle p-2">
                            {canEditAll ? (
                              <Select
                                value={
                                  item.discountType?.toString() || "No Discount"
                                }
                                onValueChange={(val) =>
                                  handleDetailChange(i, "discountType", val)
                                }
                              >
                                <SelectTrigger className="h-9 w-full text-xs border-slate-300">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="No Discount">
                                    None
                                  </SelectItem>
                                  {discountOptions.map((opt) => (
                                    <SelectItem
                                      key={opt.id}
                                      value={opt.id.toString()}
                                    >
                                      {opt.line_discount}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-slate-500">
                                {discountOptions.find(
                                  (d) => d.id.toString() == item.discountType,
                                )?.line_discount || "None"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right align-middle p-2">
                            <Input
                              type="number"
                              readOnly
                              className="h-9 w-full text-right text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                              value={item.discountAmount}
                            />
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm text-blue-700 align-middle">
                            {(Number(item.totalAmount) || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="align-middle p-2">
                            {canEditAll ? (
                              <Input
                                className="h-9 w-full text-sm border-slate-300"
                                placeholder="Enter reason..."
                                value={item.reason}
                                onChange={(e) =>
                                  handleDetailChange(
                                    i,
                                    "reason",
                                    e.target.value,
                                  )
                                }
                              />
                            ) : (
                              <span className="text-xs text-slate-600 italic">
                                {item.reason || "-"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="align-middle p-2">
                            {canEditAll ? (
                              <Select
                                value={item.returnType as string}
                                onValueChange={(val) =>
                                  handleDetailChange(i, "returnType", val)
                                }
                              >
                                <SelectTrigger className="h-9 w-full text-xs border-slate-300">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {returnTypeOptions.length > 0 ? (
                                    returnTypeOptions.map((type) => (
                                      <SelectItem
                                        key={type.type_id}
                                        value={type.type_name}
                                      >
                                        {type.type_name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <>
                                      <SelectItem value="Good Order">
                                        Good Order
                                      </SelectItem>
                                      <SelectItem value="Bad Order">
                                        Bad Order
                                      </SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-normal"
                              >
                                {item.returnType as React.ReactNode}
                              </Badge>
                            )}
                          </TableCell>
                          {canEditAll && (
                            <TableCell className="text-center align-middle">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-white hover:bg-red-500"
                                onClick={() => handleDeleteRow(i)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* BOTTOM FORM GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-bold text-slate-500">
                    Order No.
                  </Label>
                  {/* 🟢 REVISED: Disabled if not Pending */}
                  {canEditAll ? (
                    <Input
                      value={headerData.orderNo || ""}
                      onChange={(e) =>
                        setHeaderData({
                          ...headerData,
                          orderNo: e.target.value,
                        })
                      }
                      className="h-9 bg-white border-slate-300"
                    />
                  ) : (
                    <div className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-800">
                      {headerData.orderNo || "-"}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-bold text-slate-500">
                    Invoice No.
                  </Label>
                  {/* 🟢 REVISED: Disabled if not Pending */}
                  {canEditAll ? (
                    <Input
                      value={headerData.invoiceNo || ""}
                      onChange={(e) =>
                        setHeaderData({
                          ...headerData,
                          invoiceNo: e.target.value,
                        })
                      }
                      className="h-9 bg-white border-slate-300"
                    />
                  ) : (
                    <div className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-800">
                      {headerData.invoiceNo || "-"}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-slate-500">
                  Remarks
                </Label>
                {/* 🟢 REVISED: Editable if Pending or Received (canEditLimited) */}
                <Textarea
                  readOnly={!canEditLimited}
                  className={cn(
                    "min-h-[100px] border-slate-300 rounded-md focus:border-blue-500",
                    !canEditLimited
                      ? "bg-slate-50 border-slate-200"
                      : "bg-white",
                  )}
                  value={headerData.remarks || ""}
                  onChange={(e) =>
                    setHeaderData({ ...headerData, remarks: e.target.value })
                  }
                />
              </div>
            </div>

            {/* FINANCIAL SUMMARY */}
            <div className="space-y-5">
              <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm space-y-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">
                    Gross Amount
                  </span>
                  <span className="font-semibold text-slate-800">
                    ₱
                    {totalGross.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">
                    Discount Amount
                  </span>
                  <span className="font-semibold text-slate-800">
                    ₱
                    {totalDiscount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="h-px bg-slate-100 my-3"></div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-900 font-bold text-base">
                    Net Amount
                  </span>
                  <span className="font-bold text-blue-700 text-xl">
                    ₱
                    {totalNet.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="h-px bg-slate-100 my-3"></div>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="flex justify-between items-center col-span-2">
                    <span className="text-slate-500 font-medium">
                      Applied to
                    </span>
                    {/* 🟢 REVISED: Editable if Pending or Received (canEditLimited) */}
                    {canEditLimited ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 px-2"
                        onClick={() => setIsInvoiceLookupOpen(true)}
                      >
                        {statusCardData?.appliedTo || "Select Invoice"}{" "}
                        <LinkIcon className="ml-1 h-3 w-3" />
                      </Button>
                    ) : (
                      <span className="text-slate-800 font-medium">
                        {statusCardData?.appliedTo || "-"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="border-t border-slate-100 p-5 bg-white flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={handlePrintInNewTab}>
            <Printer className="h-4 w-4 mr-2" /> Print Slip
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]"
            onClick={() => setIsReceiveConfirmOpen(true)}
            disabled={!isPending}
          >
            Receive
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-40"
            onClick={handleUpdateClick}
            disabled={!canEditLimited}
          >
            Update Sales Return
          </Button>
        </div>
      </DialogContent>

      {/* --- NESTED MODALS --- */}
      {isProductLookupOpen && (
        <ProductLookupModal
          isOpen={isProductLookupOpen}
          onClose={() => setIsProductLookupOpen(false)}
          onConfirm={handleAddProductsToEdit}
        />
      )}

      {/* 2. INVOICE LOOKUP - 🟢 REVISED: Shows Amount */}
      <Dialog open={isInvoiceLookupOpen} onOpenChange={setIsInvoiceLookupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Select Invoice{" "}
              <Badge variant="secondary" className="text-xs font-normal">
                {invoiceOptions.length} Found
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search Invoice No..."
                className="pl-10"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
              {filteredInvoices.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  No invoices found.
                </div>
              ) : (
                filteredInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition-colors justify-between"
                    onClick={() => {
                      setStatusCardData((prev) => ({
                        ...prev!,
                        appliedTo: inv.invoice_no,
                      }));
                      setAppliedInvoiceId(Number(inv.id));
                      setIsInvoiceLookupOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-800">
                          {inv.invoice_no}
                        </div>
                        <div className="text-xs text-slate-500">
                          ID: {inv.id}
                        </div>
                      </div>
                    </div>
                    {/* 🟢 REVISED: Display Amount on Right Side */}
                    <span className="text-xs text-slate-500 font-mono">
                      ₱
                      {Number(inv.amount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DIALOGS (Update, Success, Receive) remain same structure */}
      <Dialog open={isUpdateConfirmOpen} onOpenChange={setIsUpdateConfirmOpen}>
        <DialogContent className="max-w-[400px] p-6 bg-white rounded-xl shadow-2xl border-0">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Save className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-lg font-bold">
                Confirm Update
              </DialogTitle>
              <div className="text-sm text-slate-500">
                Are you sure you want to save changes to Sales Return{" "}
                <span className="font-bold">{headerData.returnNo}</span>?
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsUpdateConfirmOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpdate}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirm Update"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isUpdateSuccessOpen}
        onOpenChange={(open) => {
          if (!open) {
            onSuccess();
            onClose();
          }
        }}
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
                Sales Return updated successfully.
              </div>
            </div>
            <Button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base rounded-xl shadow-emerald-200 shadow-lg transition-all active:scale-95"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isReceiveConfirmOpen}
        onOpenChange={setIsReceiveConfirmOpen}
      >
        <DialogContent className="max-w-[400px] p-6 bg-white rounded-xl shadow-2xl border-0">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-lg font-bold">
                Confirm Receipt
              </DialogTitle>
              <div className="text-sm text-slate-500">
                Are you sure you want to mark Return{" "}
                <span className="font-bold">{headerData.returnNo}</span> as
                RECEIVED?
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsReceiveConfirmOpen(false)}
              disabled={isReceiving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReceive}
              disabled={isReceiving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isReceiving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
