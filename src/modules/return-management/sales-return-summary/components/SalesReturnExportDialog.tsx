"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Loader2,
  Printer,
  Check,
  ChevronsUpDown,
  CalendarIcon,
} from "lucide-react";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// API & Types
import { SalesReturnProvider } from "../provider/api";
import type {
  SummaryCustomerOption,
  SummarySalesmanOption,
  SummarySupplierOption,
  API_SalesReturnType,
  SummaryFilters,
  SummaryReturnHeader,
} from "../type";

interface Props {
  customers: SummaryCustomerOption[];
  salesmen: SummarySalesmanOption[];
  suppliers: SummarySupplierOption[];
  returnTypes: API_SalesReturnType[];
}

// --- HELPER: FilterCombobox ---
interface FilterComboboxProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  items: { value: string; label: string }[];
}

function FilterCombobox({
  label,
  value,
  onChange,
  items,
}: FilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    value === "All"
      ? `All ${label}s`
      : items.find((item) => item.value === value)?.label || `All ${label}s`;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 font-normal"
          >
            <span className="truncate">{selectedLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => {
                    onChange("All");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "All" ? "opacity-100" : "opacity-0",
                    )}
                  />
                  All {label}s
                </CommandItem>
                {items.map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.label}
                    onSelect={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// --- DATE HELPERS ---
const fmtDate = (d: Date) => d.toISOString().split("T")[0];

export function SalesReturnExportDialog({
  customers,
  salesmen,
  suppliers,
  returnTypes,
}: Props) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  // --- STATE ---
  const [rangeType, setRangeType] = useState<string>("thisMonth");

  const [dateFrom, setDateFrom] = useState<string>(
    fmtDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  );
  const [dateTo, setDateTo] = useState<string>(fmtDate(new Date()));

  const [status, setStatus] = useState<string>("All");
  const [customerCode, setCustomerCode] = useState<string>("All");
  const [salesmanId, setSalesmanId] = useState<string>("All");
  const [supplierName, setSupplierName] = useState<string>("All");
  const [returnCategory, setReturnCategory] = useState<string>("All");

  // --- DATE LOGIC ---
  const handleDatePreset = (type: string) => {
    setRangeType(type);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (type) {
      case "all":
        start = new Date("2000-01-01");
        end = now;
        break;
      case "today":
        start = now;
        end = now;
        break;
      case "tomorrow":
        start = new Date(now);
        start.setDate(now.getDate() + 1);
        end = new Date(start);
        break;
      case "thisWeek":
        const day = now.getDay();
        const diff = now.getDate() - day;
        start = new Date(now.setDate(diff));
        end = new Date();
        break;
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "thisYear":
        start = new Date(now.getFullYear(), 0, 1);
        end = now;
        break;
      case "custom":
        // Don't change dates, just show inputs
        break;
    }

    // Update dates silently unless custom
    if (type !== "custom") {
      setDateFrom(fmtDate(start));
      setDateTo(fmtDate(end));
    }
  };

  // --- MEMOS ---
  const filters: SummaryFilters = useMemo(
    () => ({
      dateFrom,
      dateTo,
      status,
      customerCode,
      salesmanId,
      supplierName,
      returnCategory,
    }),
    [
      dateFrom,
      dateTo,
      status,
      customerCode,
      salesmanId,
      supplierName,
      returnCategory,
    ],
  );

  const customerItems = useMemo(
    () => customers.map((c) => ({ value: c.value, label: c.label })),
    [customers],
  );
  const salesmanItems = useMemo(
    () => salesmen.map((s) => ({ value: s.value, label: s.label })),
    [salesmen],
  );
  const supplierItems = useMemo(
    () => suppliers.map((s) => ({ value: s.name, label: s.name })),
    [suppliers],
  );

  // --- GENERATE HANDLER ---
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await SalesReturnProvider.getSalesReturnSummaryReport({
        page: 1,
        limit: 5000,
        search: "",
        filters,
      });

      const data = res.data || [];

      if (data.length === 0) {
        alert("No records found for the selected filters.");
        setGenerating(false);
        return;
      }

      const newWindow = window.open("", "_blank");
      if (!newWindow) {
        alert("Pop-up blocked. Please allow pop-ups for this site.");
        setGenerating(false);
        return;
      }

      let totalQty = 0;
      let totalGross = 0;
      let totalDisc = 0;
      let totalNet = 0;

      const tableRows = data
        .flatMap((header) => {
          const dateStr = header.returnDate
            ? String(header.returnDate).split("T")[0]
            : "-";
          return (header.items || []).map((item) => {
            totalQty += Number(item.quantity) || 0;
            totalGross += Number(item.grossAmount) || 0;
            totalDisc += Number(item.discountAmount) || 0;
            totalNet += Number(item.netAmount) || 0;

            return `
            <tr>
              <td class="font-mono">${header.returnNumber}</td>
              <td>${dateStr}</td>
              <td>${header.salesmanName}</td>
              <td class="truncate-text" title="${header.customerName}">${header.customerName}</td>
              <td class="truncate-text">${item.supplierName || "-"}</td>
              <td>${item.productCategory || "-"}</td>
              <td class="truncate-text" title="${item.productName}">${item.productName}</td>
              <td>${item.returnCategory || "-"}</td>
              <td class="italic text-gray-500">${item.specificReason || "-"}</td>
              <td class="text-center">${item.unit || "Pcs"}</td>
              <td class="text-right">${Number(item.quantity).toLocaleString()}</td>
              <td class="text-right">${Number(item.unitPrice).toFixed(2)}</td>
              <td class="text-right">${Number(item.grossAmount).toFixed(2)}</td>
              <td class="text-right text-red-600">(${Number(item.discountAmount).toFixed(2)})</td>
              <td class="text-right font-bold">${Number(item.netAmount).toFixed(2)}</td>
              <td class="text-center text-xs uppercase">${header.returnStatus}</td>
            </tr>
          `;
          });
        })
        .join("");

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Sales Return Summary - ${fmtDate(new Date())}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap');
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Inter', sans-serif; font-size: 10px; margin: 0; padding: 20px; color: #111; }
            * { box-sizing: border-box; }
            h1 { font-size: 18px; margin: 0 0 5px 0; text-transform: uppercase; }
            .meta { font-size: 11px; color: #555; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; }
            th { background: #f3f4f6; border: 1px solid #d1d5db; padding: 6px 4px; text-align: left; font-weight: 700; text-transform: uppercase; }
            td { border: 1px solid #e5e7eb; padding: 4px; vertical-align: top; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-mono { font-family: 'JetBrains Mono', monospace; }
            .font-bold { font-weight: 700; }
            .text-red-600 { color: #dc2626; }
            .uppercase { text-transform: uppercase; }
            .italic { font-style: italic; }
            .truncate-text { max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            tfoot tr td { background-color: #e5e7eb; font-weight: bold; border-top: 2px solid #000; font-size: 10px; }
            @media print {
              .truncate-text { white-space: normal; overflow: visible; }
              th { background-color: #e5e7eb !important; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <h1>Sales Return Summary Report</h1>
          <div class="meta">
            <strong>Generated:</strong> ${new Date().toLocaleString()} <br/>
            <strong>Period:</strong> ${dateFrom} to ${dateTo} | 
            <strong>Status:</strong> ${status} | 
            <strong>Customer:</strong> ${customerCode === "All" ? "All" : "Selected"} |
            <strong>Supplier:</strong> ${supplierName === "All" ? "All" : supplierName}
          </div>
          <table>
            <thead>
              <tr>
                <th width="8%">Return No</th>
                <th width="6%">Date</th>
                <th width="8%">Salesman</th>
                <th width="10%">Customer</th>
                <th width="8%">Supplier</th>
                <th width="8%">Category</th>
                <th width="12%">Product</th>
                <th width="6%">Type</th>
                <th width="6%">Reason</th>
                <th width="3%" class="text-center">Unit</th>
                <th width="4%" class="text-right">Qty</th>
                <th width="5%" class="text-right">Unit Price</th>
                <th width="5%" class="text-right">Gross</th>
                <th width="5%" class="text-right">Disc</th>
                <th width="6%" class="text-right">Net</th>
                <th width="5%" class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="10" class="text-right">GRAND TOTALS:</td>
                <td class="text-right">${totalQty.toLocaleString()}</td>
                <td></td>
                <td class="text-right">${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td class="text-right text-red-600">(${totalDisc.toLocaleString(undefined, { minimumFractionDigits: 2 })})</td>
                <td class="text-right">${totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </body>
        </html>
      `;

      newWindow.document.write(fullHtml);
      newWindow.document.close();
      setGenerating(false);
      setOpen(false);
    } catch (error) {
      console.error("Export failed", error);
      alert("An error occurred while generating the report.");
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
        >
          <FileText className="h-4 w-4" />
          Export Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[750px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">
            What needs to be printed?
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Filter select the criteria for the printed report.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* 1. SALESMAN & CUSTOMER */}
          <div className="grid grid-cols-2 gap-4">
            <FilterCombobox
              label="Salesman"
              value={salesmanId}
              onChange={setSalesmanId}
              items={salesmanItems}
            />
            <FilterCombobox
              label="Customer"
              value={customerCode}
              onChange={setCustomerCode}
              items={customerItems}
            />
          </div>

          {/* 2. SUPPLIER (Full Width) */}
          <div className="grid grid-cols-1">
            <FilterCombobox
              label="Supplier"
              value={supplierName}
              onChange={setSupplierName}
              items={supplierItems}
            />
          </div>

          {/* 3. STATUS & RETURN TYPE */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Return Type
              </Label>
              <Select value={returnCategory} onValueChange={setReturnCategory}>
                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  {returnTypes.map((t) => (
                    <SelectItem key={t.type_name} value={t.type_name}>
                      {t.type_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 4. DATE RANGE */}
          <div className="space-y-3 pt-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Date Range
            </Label>

            {/* Quick Selection Chips */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "tomorrow", label: "Tomorrow" },
                { id: "thisWeek", label: "This Week" },
                { id: "thisMonth", label: "This Month" },
                { id: "thisYear", label: "This Year" },
                { id: "custom", label: "Custom" },
              ].map((item) => (
                <Button
                  key={item.id}
                  variant={rangeType === item.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDatePreset(item.id)}
                  className={cn(
                    "h-8 text-xs rounded-full px-3 transition-all",
                    rangeType === item.id
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
                  )}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            {/* Custom Inputs - Only Visible when 'Custom' is selected */}
            {rangeType === "custom" && (
              <div className="flex items-center gap-2 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="relative flex-1">
                  <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <span className="text-slate-400 font-bold">-</span>
                <div className="relative flex-1">
                  <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 border-t pt-4 mt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleGenerate}
            disabled={generating}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-20"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" /> Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
