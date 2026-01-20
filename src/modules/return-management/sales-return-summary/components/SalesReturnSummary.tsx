"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { useReactToPrint } from "react-to-print";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Legend,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Printer,
} from "lucide-react";

import { SalesReturnProvider } from "../provider/api";
import { SalesReturnPrintSlip } from "./SalesReturnPrintSlip";
import type {
  SummaryCustomerOption,
  SummarySalesmanOption,
  SummarySupplierOption,
  API_SalesReturnType,
  SummaryReturnHeader,
  SummaryFilters,
  SummaryMetricsData,
} from "../type";

const COLORS = [
  "#2563EB", // Blue
  "#6B7280", // Gray
  "#14B8A6", // Teal
  "#475569", // Slate
];

type ChartDatum = { name: string; value: number };

type ReportState = {
  rows: SummaryReturnHeader[];
  total: number;
  summary: SummaryMetricsData;
  charts: {
    status: ChartDatum[];
    supplier: ChartDatum[];
    category: ChartDatum[];
  };
};

const fmtDate = (d: Date) => d.toISOString().split("T")[0];

const startOfWeek = (d: Date) => {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);

const getStatusBadge = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === "received")
    return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
  if (s === "pending")
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
};

const CustomTooltip = ({ active, payload, label, prefix = "" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded shadow-lg z-50">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {label ? label : payload[0].name}
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          Value: {prefix}
          {Number(payload[0].value).toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

const getMaxCategoryValue = (data: ChartDatum[]) => {
  if (!data || data.length === 0) return 0;
  return Math.max(...data.map((d) => d.value));
};

export function SalesReturnSummary() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // dropdown data
  const [customers, setCustomers] = useState<SummaryCustomerOption[]>([]);
  const [salesmen, setSalesmen] = useState<SummarySalesmanOption[]>([]);
  const [suppliers, setSuppliers] = useState<SummarySupplierOption[]>([]);
  const [returnTypes, setReturnTypes] = useState<API_SalesReturnType[]>([]);

  // filters
  const [quickRange, setQuickRange] = useState<
    "custom" | "today" | "lastday" | "thisweek" | "thismonth" | "thisyear"
  >("thismonth");

  const [dateFrom, setDateFrom] = useState<string>(
    fmtDate(startOfMonth(new Date())),
  );
  const [dateTo, setDateTo] = useState<string>(fmtDate(new Date()));

  const [search, setSearch] = useState("");
  const [customerCode, setCustomerCode] = useState<string>("All");
  const [salesmanId, setSalesmanId] = useState<string>("All");
  const [status, setStatus] = useState<string>("All");

  const [supplierName, setSupplierName] = useState<string>("All");
  const [returnCategory, setReturnCategory] = useState<string>("All");

  // pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // report + ui
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [report, setReport] = useState<ReportState>({
    rows: [],
    total: 0,
    summary: {
      totalReturns: 0,
      grossAmount: 0,
      totalDiscount: 0,
      netAmount: 0,
      pendingInventory: 0,
      receivedInventory: 0,
    },
    charts: { status: [], supplier: [], category: [] },
  });

  const maxCategoryVal = useMemo(() => {
    const max = getMaxCategoryValue(report.charts.category);
    return max === 0 ? 100 : Math.ceil(max * 1.1);
  }, [report.charts.category]);

  // PRINTING
  const printComponentRef = useRef<HTMLDivElement>(null);
  const [printData, setPrintData] = useState<SummaryReturnHeader | null>(null);

  const handlePrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: `Return-Slip-${printData?.returnNumber || "Document"}`,
  });

  useEffect(() => {
    if (printData) {
      handlePrint();
    }
  }, [printData]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    (async () => {
      const [c, s, sup, rt] = await Promise.all([
        SalesReturnProvider.getCustomersList(),
        SalesReturnProvider.getSalesmenList(),
        SalesReturnProvider.getSuppliers(),
        SalesReturnProvider.getSalesReturnTypes(),
      ]);
      setCustomers(c);
      setSalesmen(s);
      setSuppliers(sup);
      setReturnTypes(rt);
    })();
  }, []);

  useEffect(() => {
    const now = new Date();
    if (quickRange === "custom") return;
    if (quickRange === "today") {
      setDateFrom(fmtDate(now));
      setDateTo(fmtDate(now));
    }
    if (quickRange === "lastday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setDateFrom(fmtDate(y));
      setDateTo(fmtDate(y));
    }
    if (quickRange === "thisweek") {
      setDateFrom(fmtDate(startOfWeek(now)));
      setDateTo(fmtDate(now));
    }
    if (quickRange === "thismonth") {
      setDateFrom(fmtDate(startOfMonth(now)));
      setDateTo(fmtDate(now));
    }
    if (quickRange === "thisyear") {
      setDateFrom(fmtDate(startOfYear(now)));
      setDateTo(fmtDate(now));
    }
  }, [quickRange]);

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

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await SalesReturnProvider.getSalesReturnSummaryReport({
          page,
          limit,
          search,
          filters,
        });

        const rows = res.data || [];

        let gross = 0;
        let discount = 0;
        let net = 0;
        let pending = 0;
        let received = 0;

        for (const r of rows) {
          const st = (r.returnStatus || "").toLowerCase();
          if (st === "pending") pending++;
          if (st === "received") received++;

          net += Number(r.netTotal || 0);

          if (r.items) {
            for (const item of r.items) {
              gross += Number(item.grossAmount || 0);
              discount += Number(item.discountAmount || 0);
            }
          }
        }

        const statusCount = new Map<string, number>();
        const supplierCount = new Map<string, number>();
        const categoryCount = new Map<string, number>();

        for (const r of rows) {
          const st = r.returnStatus || "Unknown";
          statusCount.set(st, (statusCount.get(st) || 0) + 1);

          for (const it of r.items || []) {
            const supplierStr = (it.supplierName || "").trim();
            const suppliersSplit = supplierStr
              ? supplierStr
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean)
              : ["No Supplier"];
            for (const sup of suppliersSplit)
              supplierCount.set(sup, (supplierCount.get(sup) || 0) + 1);

            const cat = it.returnCategory || "Uncategorized";
            const currentTotal = categoryCount.get(cat) || 0;
            const itemNet = Number(it.netAmount || 0);
            categoryCount.set(cat, currentTotal + itemNet);
          }
        }

        const toChart = (m: Map<string, number>) =>
          Array.from(m.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        setReport({
          rows,
          total: res.total || 0,
          summary: {
            totalReturns: res.total || 0,
            grossAmount: gross,
            totalDiscount: discount,
            netAmount: net,
            pendingInventory: pending,
            receivedInventory: received,
          },
          charts: {
            status: toChart(statusCount),
            supplier: toChart(supplierCount).slice(0, 12),
            category: toChart(categoryCount),
          },
        });
        setExpanded({});
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [page, limit, search, filters]);

  const totalPages = Math.max(1, Math.ceil(report.total / limit));

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(
          1,
          "...",
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  const toggleExpand = (returnNumber: string) => {
    setExpanded((prev) => ({ ...prev, [returnNumber]: !prev[returnNumber] }));
  };

  const resetFilters = () => {
    setQuickRange("thismonth");
    setSearch("");
    setCustomerCode("All");
    setSalesmanId("All");
    setStatus("All");
    setSupplierName("All");
    setReturnCategory("All");
    setPage(1);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-4 p-2 sm:p-0">
      {/* FILTER BAR (unchanged) */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        {/* Row 1: Search, Date, Quick Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Search
            </label>
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Return no, invoice, customer code..."
              className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Quick Range
            </label>
            <Select
              value={quickRange}
              onValueChange={(v: any) => {
                setQuickRange(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="lastday">Last Day</SelectItem>
                <SelectItem value="thisweek">This Week</SelectItem>
                <SelectItem value="thismonth">This Month</SelectItem>
                <SelectItem value="thisyear">This Year</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Date From
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setQuickRange("custom");
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Date To
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setQuickRange("custom");
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-200"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-10 w-full dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={resetFilters}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Reset
            </Button>
          </div>
        </div>

        {/* Row 2: Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              label: "Customer",
              val: customerCode,
              set: setCustomerCode,
              opts: customers,
            },
            {
              label: "Salesman",
              val: salesmanId,
              set: setSalesmanId,
              opts: salesmen,
            },
            {
              label: "Status",
              val: status,
              set: setStatus,
              opts: [
                { value: "Pending", label: "Pending" },
                { value: "Received", label: "Received" },
              ],
              allLabel: "All",
            },
            {
              label: "Supplier",
              val: supplierName,
              set: setSupplierName,
              opts: suppliers.map((s) => ({ value: s.name, label: s.name })),
            },
            {
              label: "Return Type",
              val: returnCategory,
              set: setReturnCategory,
              opts: returnTypes.map((t) => ({
                value: t.type_name,
                label: t.type_name,
              })),
            },
          ].map((item, idx) => (
            <div key={idx}>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {item.label}
              </label>
              <Select
                value={item.val}
                onValueChange={(v) => {
                  item.set(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-200">
                  <SelectValue
                    placeholder={item.allLabel || `All ${item.label}s`}
                  />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                  <SelectItem value="All">
                    {item.allLabel || `All ${item.label}s`}
                  </SelectItem>
                  {item.opts.map((opt: any) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      {/* SUMMARY METRICS CARDS (unchanged) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 sm:p-4 flex flex-col justify-center">
          <span className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">
            Total Returns
          </span>
          <div className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">
            {loading ? "..." : report.summary.totalReturns}
          </div>
        </div>
        {/* Card 2 */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl p-3 sm:p-4 flex flex-col justify-center">
          <span className="text-[10px] sm:text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider truncate">
            Gross Amount
          </span>
          <div
            className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 truncate"
            title={`₱${report.summary.grossAmount.toLocaleString()}`}
          >
            {loading
              ? "..."
              : `₱${report.summary.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </div>
        </div>
        {/* Card 3 */}
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl p-3 sm:p-4 flex flex-col justify-center">
          <span className="text-[10px] sm:text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider truncate">
            Total Discount
          </span>
          <div
            className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 truncate"
            title={`₱${report.summary.totalDiscount.toLocaleString()}`}
          >
            {loading
              ? "..."
              : `₱${report.summary.totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </div>
        </div>
        {/* Card 4 */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl p-3 sm:p-4 flex flex-col justify-center">
          <span className="text-[10px] sm:text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider truncate">
            Net Amount
          </span>
          <div
            className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 truncate"
            title={`₱${report.summary.netAmount.toLocaleString()}`}
          >
            {loading
              ? "..."
              : `₱${report.summary.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </div>
        </div>
        {/* Card 5 */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-xl p-3 sm:p-4 flex flex-col justify-center">
          <span className="text-[10px] sm:text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider truncate">
            Pending Inv.
          </span>
          <div className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">
            {loading ? "..." : report.summary.pendingInventory}
          </div>
        </div>
        {/* Card 6 */}
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-xl p-3 sm:p-4 flex flex-col justify-center">
          <span className="text-[10px] sm:text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider truncate">
            Received Inv.
          </span>
          <div className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">
            {loading ? "..." : report.summary.receivedInventory}
          </div>
        </div>
      </div>

      {/* CHARTS (unchanged) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Status Pie */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">
            Return Status
          </div>
          <div className="h-[250px] sm:h-[300px] lg:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={report.charts.status}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  stroke="none"
                >
                  {report.charts.status.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Supplier Bar */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">
            Suppliers (line-item count)
          </div>
          <div className="h-[250px] sm:h-[300px] lg:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.charts.supplier} margin={{ bottom: 20 }}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 10,
                    fill: theme === "dark" ? "#94a3b8" : "#64748b",
                  }}
                  interval={0}
                />
                <YAxis
                  stroke={theme === "dark" ? "#94a3b8" : "#64748b"}
                  width={30}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {report.charts.supplier.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Showing top suppliers by returned line-items.
          </div>
        </div>

        {/* Category Bar Chart */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm md:col-span-2 lg:col-span-1">
          <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">
            Return Type (Net Amount)
          </div>
          <div className="h-[250px] sm:h-[300px] lg:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.charts.category} margin={{ bottom: 20 }}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 10,
                    fill: theme === "dark" ? "#94a3b8" : "#64748b",
                  }}
                  interval={0}
                />
                <YAxis
                  stroke={theme === "dark" ? "#94a3b8" : "#64748b"}
                  width={45}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `₱${value.toLocaleString()}`}
                  domain={[0, maxCategoryVal]}
                />
                <Tooltip content={<CustomTooltip prefix="₱" />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {report.charts.category.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Showing net return value by category.
          </div>
        </div>
      </div>

      {/* ✅ LIST TABLE (REVISED) */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div className="font-bold text-slate-800 dark:text-slate-200 text-lg">
            Sales Returns ({report.total})
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Rows per page:
            </span>
            <Select
              value={String(limit)}
              onValueChange={(val) => {
                setLimit(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full min-w-[1800px]">
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Return No
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Salesman
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Customer
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Supplier
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Brand
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Category
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Product Name
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap text-center">
                  Unit
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Return Type
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Reason
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap text-right">
                  Quantity
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap text-right">
                  Unit Price
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap text-right">
                  Gross Amount
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Discount Type
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap text-right">
                  Discount Amt
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap text-right">
                  Net Amount
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Applied to
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap text-center">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={18}
                    className="py-12 text-center text-slate-500 dark:text-slate-400 animate-pulse"
                  >
                    Loading data...
                  </TableCell>
                </TableRow>
              ) : report.rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={18}
                    className="py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    No results found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                report.rows.flatMap((r) =>
                  (r.items || []).map((item) => (
                    <TableRow
                      key={String(item.detailId)}
                      className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors border-slate-200 dark:border-slate-800"
                    >
                      {/* Header Info Repeated - Added align-top */}
                      <TableCell className="text-xs text-blue-600 dark:text-blue-400 font-medium px-3 py-2 align-top">
                        {r.returnNumber}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 px-3 py-2 align-top">
                        {r.salesmanName}
                      </TableCell>
                      <TableCell
                        className="text-xs text-slate-600 dark:text-slate-400 px-3 py-2 max-w-[150px] truncate align-top"
                        title={r.customerName}
                      >
                        {r.customerName}
                      </TableCell>

                      {/* Item Info */}
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 px-3 py-2 max-w-[120px] truncate align-top">
                        {item.supplierName || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 px-3 py-2 align-top">
                        {item.brandName || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 px-3 py-2 align-top">
                        {item.productCategory || "-"}
                      </TableCell>

                      {/* 🟢 3. REVISED PRODUCT NAME CELL: Enabled wrapping & align-top */}
                      <TableCell className="text-xs text-slate-700 dark:text-slate-200 font-medium px-3 py-2 w-[250px] whitespace-normal wrap-break-word align-top">
                        {item.productName}
                      </TableCell>

                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 px-3 py-2 text-center align-top">
                        {item.unit || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 px-3 py-2 align-top">
                        {item.returnCategory || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-500 px-3 py-2 italic max-w-[150px] truncate align-top">
                        {item.specificReason || "-"}
                      </TableCell>

                      {/* Metrics */}
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300 px-3 py-2 text-right align-top">
                        {Number(item.quantity).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300 px-3 py-2 text-right align-top">
                        {Number(item.unitPrice).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300 px-3 py-2 text-right align-top">
                        {Number(item.grossAmount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-500 px-3 py-2 text-right align-top">
                        {item.discountApplied || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-500 px-3 py-2 text-right align-top">
                        {Number(item.discountAmount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-blue-600 dark:text-blue-400 px-3 py-2 text-right align-top">
                        {Number(item.netAmount).toLocaleString()}
                      </TableCell>

                      {/* Footer Info / Status */}
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 px-3 py-2 align-top">
                        {item.invoiceNo || r.invoiceNo || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-center px-3 py-2 align-top">
                        <Badge
                          variant="outline"
                          className={getStatusBadge(r.returnStatus)}
                        >
                          {r.returnStatus === "Received"
                            ? "Approved"
                            : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )),
                )
              )}
            </TableBody>
          </Table>
        </div>

        {/* Enhanced Pagination Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between px-4 py-4 border-t border-slate-200 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-sm text-slate-500 dark:text-slate-400 text-center md:text-left">
            Showing <b>{(page - 1) * limit + 1}</b> to{" "}
            <b>{Math.min(page * limit, report.total)}</b> of{" "}
            <b>{report.total}</b> entries
          </div>
          <div className="flex items-center gap-1 justify-center">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 hidden sm:flex dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"
              onClick={() => setPage(1)}
              disabled={page === 1 || loading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 mx-2">
              {getPageNumbers().map((p, i) => (
                <Button
                  key={i}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className={`h-8 w-8 p-0 ${p === "..." ? "cursor-default border-none hover:bg-transparent dark:hover:bg-transparent dark:text-slate-400" : ""} ${p === page ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:text-white" : "dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"}`}
                  onClick={() => typeof p === "number" && setPage(p)}
                  disabled={p === "..." || loading}
                >
                  {p}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 hidden sm:flex dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages || loading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* HIDDEN PRINT COMPONENT */}
      <div style={{ display: "none" }}>
        {printData && (
          <SalesReturnPrintSlip ref={printComponentRef} data={printData} />
        )}
      </div>
    </div>
  );
}
