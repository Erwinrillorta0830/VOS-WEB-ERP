import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { SalesReturnProvider } from "../provider/api";
import {
  SummaryCustomerOption,
  SummarySalesmanOption,
  SummarySupplierOption,
  API_SalesReturnType,
  SummaryReturnHeader,
  SummaryFilters,
  SummaryMetricsData,
} from "../type";

// Define the Chart type locally
type ChartDatum = { name: string; value: number };

// --- Helpers ---
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

export const useSalesReturnReport = () => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dropdown Data
  const [options, setOptions] = useState({
    customers: [] as SummaryCustomerOption[],
    salesmen: [] as SummarySalesmanOption[],
    suppliers: [] as SummarySupplierOption[],
    returnTypes: [] as API_SalesReturnType[],
  });

  // Filters
  const [quickRange, setQuickRange] = useState("thismonth");
  const [dateRange, setDateRange] = useState({
    from: fmtDate(startOfMonth(new Date())),
    to: fmtDate(new Date()),
  });

  const [filters, setFilters] = useState({
    search: "",
    customerCode: "All",
    salesmanId: "All",
    status: "All",
    supplierName: "All",
    returnCategory: "All",
  });

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });

  // Report Data
  const [report, setReport] = useState({
    rows: [] as SummaryReturnHeader[], // Rows for the Table (Paginated)
    total: 0,
    summary: {
      totalReturns: 0,
      grossAmount: 0,
      totalDiscount: 0,
      netAmount: 0,
      pendingInventory: 0,
      receivedInventory: 0,
    } as SummaryMetricsData,
    charts: {
      status: [] as ChartDatum[],
      supplier: [] as ChartDatum[],
      category: [] as ChartDatum[],
    },
  });

  // Printing
  const printComponentRef = useRef<HTMLDivElement>(null);
  const [printData, setPrintData] = useState<SummaryReturnHeader | null>(null);
  const handlePrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: `Return-Slip-${printData?.returnNumber || "Document"}`,
  });

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (printData) handlePrint();
  }, [printData]);

  // Initial Data Load (Dropdowns)
  useEffect(() => {
    (async () => {
      try {
        const [c, s, sup, rt] = await Promise.all([
          SalesReturnProvider.getCustomersList(),
          SalesReturnProvider.getSalesmenList(),
          SalesReturnProvider.getSuppliers(),
          SalesReturnProvider.getSalesReturnTypes(),
        ]);
        setOptions({
          customers: c,
          salesmen: s,
          suppliers: sup,
          returnTypes: rt,
        });
      } catch (error) {
        console.error("Failed to load options", error);
      }
    })();
  }, []);

  // Quick Range Logic
  useEffect(() => {
    const now = new Date();
    if (quickRange === "custom") return;

    let from = now;
    const to = now;

    if (quickRange === "lastday") {
      from = new Date(now);
      from.setDate(from.getDate() - 1);
    } else if (quickRange === "thisweek") {
      from = startOfWeek(now);
    } else if (quickRange === "thismonth") {
      from = startOfMonth(now);
    } else if (quickRange === "thisyear") {
      from = startOfYear(now);
    }

    setDateRange({ from: fmtDate(from), to: fmtDate(to) });
  }, [quickRange]);

  // --- 🟢 UPDATED: Main Fetch Logic (Parallel Fetching) ---
  useEffect(() => {
    const apiFilters: SummaryFilters = {
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      status: filters.status,
      customerCode: filters.customerCode,
      salesmanId: filters.salesmanId,
      supplierName: filters.supplierName,
      returnCategory: filters.returnCategory,
    };

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // We run two queries in parallel:
        // 1. tableReq: Gets paginated data specifically for the Table view.
        // 2. chartReq: Gets ALL matching data (limit: -1) for accurate Charts & Metrics.
        const [tableReq, chartReq] = await Promise.all([
          SalesReturnProvider.getSalesReturnSummaryReport({
            page: pagination.page,
            limit: pagination.limit,
            search: filters.search,
            filters: apiFilters,
          }),
          SalesReturnProvider.getSalesReturnSummaryReport({
            page: 1,
            limit: -1, // Fetch ALL rows matching criteria
            search: filters.search,
            filters: apiFilters,
          }),
        ]);

        // 1. Process Table Data (Only current page)
        const tableRows = tableReq.data || [];

        // 2. Process Chart/Metrics Data (All matching data)
        const allRows = chartReq.data || [];

        let gross = 0,
          discount = 0,
          net = 0,
          pending = 0,
          received = 0;

        const statusCount = new Map<string, number>();
        const supplierCount = new Map<string, number>();
        const categoryCount = new Map<string, number>();

        // 🟢 Optimization: Iterate over 'allRows' for Metrics/Charts
        for (const r of allRows) {
          const st = (r.returnStatus || "").toLowerCase();
          if (st === "pending") pending++;
          if (st === "received") received++;
          net += Number(r.netTotal || 0);

          const stKey = r.returnStatus || "Unknown";
          statusCount.set(stKey, (statusCount.get(stKey) || 0) + 1);

          if (r.items) {
            for (const item of r.items) {
              gross += Number(item.grossAmount || 0);
              discount += Number(item.discountAmount || 0);

              // Chart Aggregation
              const supStr = (item.supplierName || "").trim();
              const sups = supStr
                ? supStr
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)
                : ["No Supplier"];
              sups.forEach((s) =>
                supplierCount.set(s, (supplierCount.get(s) || 0) + 1),
              );

              const cat = item.returnCategory || "Uncategorized";
              categoryCount.set(
                cat,
                (categoryCount.get(cat) || 0) + Number(item.netAmount || 0),
              );
            }
          }
        }

        const toChart = (m: Map<string, number>) =>
          Array.from(m.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        setReport({
          rows: tableRows, // 🟢 Table gets paginated rows
          total: tableReq.total || 0, // 🟢 Pagination count relies on table request
          summary: {
            totalReturns: chartReq.total || 0, // 🟢 Total count relies on all matching
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
      } finally {
        setLoading(false);
      }
    }, 300); // Slight increase in debounce for parallel reqs
    return () => clearTimeout(timer);
  }, [pagination, filters.search, filters, dateRange]);

  return {
    mounted,
    options,
    quickRange,
    setQuickRange,
    dateRange,
    setDateRange,
    filters,
    setFilters,
    pagination,
    setPagination,
    report,
    loading,
    printComponentRef,
    printData,
    setPrintData,
  };
};
