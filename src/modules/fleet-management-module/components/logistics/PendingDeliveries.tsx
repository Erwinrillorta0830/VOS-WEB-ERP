// src/modules/fleet-management-module/components/logistics/PendingDeliveries.tsx

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  Package,
  ChevronLeft,
  ChevronRight,
  Layers,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- View Model Types ---

interface ApiSalesOrder {
  order_id: number;
  order_no: string;
  customer_code: string;
  order_status: string;

  // ✅ NEW: per-status computations use this
  allocated_amount?: number;

  // ✅ fallback (in case upstream still returns total_amount)
  total_amount?: number;

  order_date: string;
  salesman_id: number;
}

interface CustomerGroupRaw {
  id: string;
  customerName: string;
  salesmanName: string;
  orders: ApiSalesOrder[];
}

interface ClusterGroupRaw {
  clusterId: string;
  clusterName: string;
  customers: CustomerGroupRaw[];
}

// Final Flattened Row for Table (GROUPED)
interface TableRow {
  uniqueId: string;
  clusterName: string;
  customerName: string;
  salesmanName: string;

  clusterRowSpan: number;
  customerRowSpan: number;

  // Store the "day" key (YYYY-MM-DD) to guarantee grouping by date only.
  orderDate: string; // YYYY-MM-DD day key
  status: string; // informational: e.g. "Mixed" or dominant, not used for columns
  amount: number;

  approval: number;
  consolidation: number;
  picking: number;
  invoicing: number;
  loading: number;
  shipping: number;

  clusterTotal: number;
}

type DateRange =
  | "yesterday"
  | "today"
  | "this-week"
  | "this-month"
  | "this-year"
  | "custom";

type SortDirection = "asc" | "desc";

interface SortConfig {
  key: keyof TableRow;
  direction: SortDirection;
}

// --- Print Configuration Interface ---
interface PrintConfig {
  cluster: string;
  salesman: string;
  status: string; // 'All', 'For Approval', 'For Picking', etc.
}

export function PendingDeliveries() {
  // --- State ---
  const [rawGroups, setRawGroups] = useState<ClusterGroupRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dashboard Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState<string>("All");
  const [clusterFilter, setClusterFilter] = useState<string>("All");
  const [dateRange, setDateRange] = useState<DateRange>("this-month");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    cluster: "All",
    salesman: "All",
    status: "All",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  // Sorting
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // --- Helpers ---

  const formatCurrency = (amount: number) => {
    if (amount === 0) return "-";
    return `₱${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatTotalCurrency = (amount: number) => {
    return `₱${amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatCardCurrency = (amount: number) => {
    if (amount === 0) return "₱ -";
    return `₱${amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatNumberForPDF = (amount: number) => {
    if (amount === 0) return "-";
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatTotalForPDF = (amount: number) => {
    if (amount === 0) return "-";
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatDatePrinted = (d: Date) => {
    // Example: Jan 27, 2026, 4:15 PM
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const toLocalDayKey = (dateString: string) => {
    // Converts any ISO/timestamp into YYYY-MM-DD based on local time (prevents grouping by time)
    if (!dateString) return "";
    const d = new Date(dateString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const formatDate = (dateString: string) => {
    // dateString here is YYYY-MM-DD (day key)
    if (!dateString) return "-";
    const [y, m, d] = dateString.split("-").map((x) => Number(x));
    const local = new Date(y, (m || 1) - 1, d || 1);
    return local.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Generic Date Logic (Used by dashboard filters)
  const checkDateRange = (dateString: string, range: DateRange, customFrom?: string, customTo?: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (range === "custom") {
      // ✅ If custom bounds not provided, treat as ALL dates
      if (!customFrom || !customTo) return true;
      const from = new Date(customFrom);
      const to = new Date(customTo);
      return date >= from && date <= to;
    }

    if (range === "today") return targetDate.getTime() === startOfToday.getTime();

    if (range === "yesterday") {
      const yesterday = new Date(startOfToday);
      yesterday.setDate(yesterday.getDate() - 1);
      return targetDate.getTime() === yesterday.getTime();
    }

    if (range === "this-week") {
      const dayOfWeek = startOfToday.getDay();
      const diff = startOfToday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(diff);
      return date >= startOfWeek;
    }

    if (range === "this-month")
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

    if (range === "this-year") return date.getFullYear() === now.getFullYear();

    return true;
  };

  const statusToBucket = (statusRaw: string) => {
    const s = (statusRaw || "").toLowerCase();
    return {
      approval: s.includes("approval"),
      consolidation: s.includes("conso") || s.includes("consolidation"),
      picking: s.includes("picking"),
      invoicing: s.includes("invoicing"),
      loading: s.includes("loading"),
      shipping: s.includes("shipping"),
    };
  };

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/pending-deliveries");
        if (!res.ok) throw new Error("Failed to fetch data");
        const result = await res.json();
        setRawGroups(result.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Counts RAW orders (not grouped) but respects the same filters/date/search logic.
  const countFilteredOrders = (
    data: ClusterGroupRaw[],
    filters: { cluster: string; salesman: string; search?: string; status?: string },
    dateSettings: { range: DateRange; from: string; to: string }
  ) => {
    const searchLower = (filters.search || "").toLowerCase();
    let count = 0;

    data.forEach((group) => {
      if (filters.cluster !== "All" && group.clusterName !== filters.cluster) return;

      group.customers.forEach((customer) => {
        customer.orders.forEach((o) => {
          if (!checkDateRange(o.order_date, dateSettings.range, dateSettings.from, dateSettings.to)) return;
          if (filters.salesman !== "All" && customer.salesmanName !== filters.salesman) return;

          if (filters.status && filters.status !== "All") {
            const orderStatusLower = (o.order_status || "").toLowerCase();
            const target = filters.status.toLowerCase().replace("for ", "");
            if (!orderStatusLower.includes(target)) return;
          }

          if (filters.search) {
            const hit =
              customer.customerName.toLowerCase().includes(searchLower) ||
              customer.salesmanName.toLowerCase().includes(searchLower);
            if (!hit) return;
          }

          count++;
        });
      });
    });

    return count;
  };

  // --- Grouping + Flattening Logic (Reusable) ---
  const getGroupedRows = (
    data: ClusterGroupRaw[],
    filters: { cluster: string; salesman: string; search?: string; status?: string },
    dateSettings: { range: DateRange; from: string; to: string }
  ) => {
    const rows: TableRow[] = [];
    const searchLower = (filters.search || "").toLowerCase();

    data.forEach((group) => {
      if (filters.cluster !== "All" && group.clusterName !== filters.cluster) return;

      const agg = new Map<string, TableRow>();

      group.customers.forEach((customer) => {
        customer.orders.forEach((o) => {
          if (!checkDateRange(o.order_date, dateSettings.range, dateSettings.from, dateSettings.to)) return;
          if (filters.salesman !== "All" && customer.salesmanName !== filters.salesman) return;

          if (filters.status && filters.status !== "All") {
            const orderStatusLower = (o.order_status || "").toLowerCase();
            const target = filters.status.toLowerCase().replace("for ", "");
            if (!orderStatusLower.includes(target)) return;
          }

          if (filters.search) {
            const hit =
              customer.customerName.toLowerCase().includes(searchLower) ||
              customer.salesmanName.toLowerCase().includes(searchLower);
            if (!hit) return;
          }

          const dateKey = toLocalDayKey(o.order_date);
          const key = `${customer.customerName}||${customer.salesmanName}||${dateKey}`;

          // ✅ IMPORTANT: per-status + totals now use allocated_amount
          const amt = Number((o.allocated_amount ?? o.total_amount ?? 0) as any);

          const bucket = statusToBucket(o.order_status);

          if (!agg.has(key)) {
            agg.set(key, {
              uniqueId: `${group.clusterName}__${customer.customerName}__${customer.salesmanName}__${dateKey}`,
              clusterName: group.clusterName,
              customerName: customer.customerName,
              salesmanName: customer.salesmanName,
              clusterRowSpan: 0,
              customerRowSpan: 0,
              orderDate: dateKey,
              status: "Mixed",
              amount: 0,
              approval: 0,
              consolidation: 0,
              picking: 0,
              invoicing: 0,
              loading: 0,
              shipping: 0,
              clusterTotal: 0,
            });
          }

          const r = agg.get(key)!;
          r.amount += amt;
          if (bucket.approval) r.approval += amt;
          if (bucket.consolidation) r.consolidation += amt;
          if (bucket.picking) r.picking += amt;
          if (bucket.invoicing) r.invoicing += amt;
          if (bucket.loading) r.loading += amt;
          if (bucket.shipping) r.shipping += amt;
        });
      });

      const groupRows = Array.from(agg.values());

      const clusterTotal = groupRows.reduce((sum, r) => sum + r.amount, 0);
      groupRows.forEach((r) => (r.clusterTotal = clusterTotal));

      rows.push(...groupRows);
    });

    return rows;
  };

  const tableRows = useMemo(() => {
    return getGroupedRows(
      rawGroups,
      { cluster: clusterFilter, salesman: salesmanFilter, search: searchTerm },
      { range: dateRange, from: customDateFrom, to: customDateTo }
    );
  }, [rawGroups, searchTerm, salesmanFilter, clusterFilter, dateRange, customDateFrom, customDateTo]);

  const pendingOrdersCount = useMemo(() => {
    return countFilteredOrders(
      rawGroups,
      { cluster: clusterFilter, salesman: salesmanFilter, search: searchTerm },
      { range: dateRange, from: customDateFrom, to: customDateTo }
    );
  }, [rawGroups, searchTerm, salesmanFilter, clusterFilter, dateRange, customDateFrom, customDateTo]);

  const statusTotals = useMemo(() => {
    return tableRows.reduce(
      (acc, r) => {
        acc.approval += r.approval;
        acc.consolidation += r.consolidation;
        acc.picking += r.picking;
        acc.invoicing += r.invoicing;
        acc.loading += r.loading;
        acc.shipping += r.shipping;
        return acc;
      },
      { approval: 0, consolidation: 0, picking: 0, invoicing: 0, loading: 0, shipping: 0 }
    );
  }, [tableRows]);

  const sortedRows = useMemo(() => {
    const base = [...tableRows].sort((a, b) => {
      const c = a.clusterName.localeCompare(b.clusterName);
      if (c !== 0) return c;
      const cu = a.customerName.localeCompare(b.customerName);
      if (cu !== 0) return cu;
      const s = a.salesmanName.localeCompare(b.salesmanName);
      if (s !== 0) return s;
      return a.orderDate.localeCompare(b.orderDate);
    });

    if (!sortConfig) return base;

    const blocks = new Map<string, TableRow[]>();
    for (const r of base) {
      const k = `${r.clusterName}||${r.customerName}`;
      if (!blocks.has(k)) blocks.set(k, []);
      blocks.get(k)!.push(r);
    }

    const compare = (a: TableRow, b: TableRow) => {
      const av = a[sortConfig.key];
      const bv = b[sortConfig.key];

      if (typeof av === "number" && typeof bv === "number") {
        return sortConfig.direction === "asc" ? av - bv : bv - av;
      }
      if (typeof av === "string" && typeof bv === "string") {
        return sortConfig.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return 0;
    };

    const out: TableRow[] = [];
    const seen = new Set<string>();
    for (const r of base) {
      const k = `${r.clusterName}||${r.customerName}`;
      if (seen.has(k)) continue;
      seen.add(k);

      const block = blocks.get(k)!;
      block.sort(compare);
      out.push(...block);
    }

    return out;
  }, [tableRows, sortConfig]);

  // ===========================
  // PDF (PRINT ALWAYS ALL DATES)
  // ===========================
  const executePrint = () => {
    // ✅ Always print ALL dates regardless of dashboard date filter
    const printDateSettings = { range: "custom" as DateRange, from: "", to: "" };

    // ✅ Main printed table honors selected cluster (and salesman/status)
    const printRows = getGroupedRows(
      rawGroups,
      { cluster: printConfig.cluster, salesman: printConfig.salesman, status: printConfig.status },
      printDateSettings
    );

    const pdfPendingOrders = countFilteredOrders(
      rawGroups,
      { cluster: printConfig.cluster, salesman: printConfig.salesman, status: printConfig.status },
      printDateSettings
    );

    printRows.sort((a, b) => {
      const c = a.clusterName.localeCompare(b.clusterName);
      if (c !== 0) return c;
      const cu = a.customerName.localeCompare(b.customerName);
      if (cu !== 0) return cu;
      const s = a.salesmanName.localeCompare(b.salesmanName);
      if (s !== 0) return s;
      return a.orderDate.localeCompare(b.orderDate);
    });

    const doc = new jsPDF("l", "mm", "a4");

    // ✅ Replace "Period" with "Date Printed"
    const printedAt = formatDatePrinted(new Date());
    const filterText = `Cluster: ${printConfig.cluster} | Salesman: ${printConfig.salesman} | Status: ${printConfig.status}`;

    const grandTotalPrinted = printRows.reduce((sum, r) => sum + r.amount, 0);
    const uniqueClustersPrinted = new Set(printRows.map((r) => r.clusterName)).size;

    const pdfStatusTotals = printRows.reduce(
      (acc, r) => {
        acc.approval += r.approval;
        acc.consolidation += r.consolidation;
        acc.picking += r.picking;
        acc.invoicing += r.invoicing;
        acc.loading += r.loading;
        acc.shipping += r.shipping;
        return acc;
      },
      { approval: 0, consolidation: 0, picking: 0, invoicing: 0, loading: 0, shipping: 0 }
    );

    const moneyTotalCard = (amount: number) => (amount === 0 ? "P -" : `P ${formatTotalForPDF(amount)}`);

    // =========================
    // LAYOUT CONSTANTS (TIGHT)
    // =========================
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const leftX = 14;
    const rightMargin = 14;

    // top cards
    const cardWidth = 58;
    const cardHeight = 18;
    const gap = 4;

    const cardsTotalWidth = cardWidth * 3 + gap * 2;
    const startX = pageWidth - rightMargin - cardsTotalWidth;

    const cardsY = 10;

    // Header text can only occupy left column (prevents overlap)
    const leftMaxWidth = Math.max(40, startX - leftX - 6);

    // =========================
    // HEADER TEXT (WRAPPED LEFT)
    // =========================
    doc.setFontSize(14);
    doc.text("Delivery Monitor Report", leftX, 15);

    doc.setFontSize(10);
    const printedLines = doc.splitTextToSize(`Date Printed: ${printedAt}`, leftMaxWidth);
    doc.text(printedLines, leftX, 22);

    const lineH10 = 4.5;
    const afterPrintedY = 22 + (printedLines.length - 1) * lineH10;

    doc.setFontSize(8);
    doc.setTextColor(100);
    const filterLines = doc.splitTextToSize(filterText, leftMaxWidth);
    doc.text(filterLines, leftX, afterPrintedY + 5);
    doc.setTextColor(0);

    const lineH8 = 3.8;
    const headerBottomY = afterPrintedY + 5 + (filterLines.length - 1) * lineH8;

    // =========================
    // CARDS (TOP RIGHT)
    // =========================
    const drawCard = (x: number, title: string, value: string, iconColor: [number, number, number]) => {
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, cardsY, cardWidth, cardHeight, 2, 2, "FD");

      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(title, x + 4, cardsY + 6);

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(value, x + 4, cardsY + 14);
      doc.setFont("helvetica", "normal");

      doc.setFillColor(...iconColor);
      doc.circle(x + cardWidth - 7, cardsY + 9, 3.5, "F");
    };

    drawCard(startX, "Active Clusters", uniqueClustersPrinted.toString(), [219, 234, 254]);
    drawCard(startX + cardWidth + gap, "Pending Orders", pdfPendingOrders.toString(), [243, 232, 255]);
    drawCard(startX + (cardWidth + gap) * 2, "Total Pending Amount", moneyTotalCard(grandTotalPrinted), [220, 252, 231]);

    // =========================
    // STATUS CARDS (ONE ROW, BELOW TITLES/DETAILS)
    // =========================
    const statusY = Math.max(cardsY + cardHeight + 4, headerBottomY + 8);
    const statusCardH = 14;
    const statusGap = 3;
    const usableW = pageWidth - leftX - rightMargin;
    const statusCardW = (usableW - statusGap * 5) / 6;

    const drawStatusCard = (
      x: number,
      title: string,
      value: string,
      dot: [number, number, number]
    ) => {
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, statusY, statusCardW, statusCardH, 2, 2, "FD");

      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(title, x + 3, statusY + 5);

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text(value, x + 3, statusY + 11);
      doc.setFont("helvetica", "normal");

      doc.setFillColor(...dot);
      doc.circle(x + statusCardW - 5.5, statusY + 7, 3, "F");
    };

    const statusCards = [
      { label: "For Approval", value: moneyTotalCard(pdfStatusTotals.approval), dot: [243, 232, 255] as [number, number, number] },
      { label: "For Conso", value: moneyTotalCard(pdfStatusTotals.consolidation), dot: [219, 234, 254] as [number, number, number] },
      { label: "For Picking", value: moneyTotalCard(pdfStatusTotals.picking), dot: [207, 250, 254] as [number, number, number] },
      { label: "For Invoicing", value: moneyTotalCard(pdfStatusTotals.invoicing), dot: [254, 249, 195] as [number, number, number] },
      { label: "For Loading", value: moneyTotalCard(pdfStatusTotals.loading), dot: [255, 237, 213] as [number, number, number] },
      { label: "For Shipping", value: moneyTotalCard(pdfStatusTotals.shipping), dot: [220, 252, 231] as [number, number, number] },
    ];

    let x = leftX;
    statusCards.forEach((c, i) => {
      drawStatusCard(x, c.label, c.value, c.dot);
      x += statusCardW + (i < 5 ? statusGap : 0);
    });

    // ✅ Table starts after status cards
    const tableStartY = statusY + statusCardH + 8;

    // =========================
    // PDF TABLE (NO CLUSTER TOTAL)
    // =========================
    let tableHeader = ["Cluster", "Customer", "Salesman", "Date"];

    const statusMap = [
      { label: "For Approval", key: "approval" as keyof TableRow },
      { label: "For Conso", key: "consolidation" as keyof TableRow },
      { label: "For Picking", key: "picking" as keyof TableRow },
      { label: "For Invoicing", key: "invoicing" as keyof TableRow },
      { label: "For Loading", key: "loading" as keyof TableRow },
      { label: "For Shipping", key: "shipping" as keyof TableRow },
    ];

    let activeStatusKeys: (keyof TableRow)[] = [];

    if (printConfig.status === "All") {
      tableHeader.push(...statusMap.map((s) => s.label));
      activeStatusKeys = statusMap.map((s) => s.key);
    } else {
      const selectedLabel = printConfig.status.replace("For ", "");
      const found = statusMap.find(
        (s) =>
          s.label.toLowerCase() === selectedLabel.toLowerCase() ||
          s.label.toLowerCase().includes(selectedLabel.toLowerCase())
      );
      if (found) {
        tableHeader.push(found.label);
        activeStatusKeys = [found.key];
      } else {
        tableHeader.push(...statusMap.map((s) => s.label));
        activeStatusKeys = statusMap.map((s) => s.key);
      }
    }

    tableHeader.push("Total");

    const tableRowsData = printRows.map((row) => {
      const rowData: any[] = [row.clusterName, row.customerName, row.salesmanName, formatDate(row.orderDate)];
      activeStatusKeys.forEach((key) => rowData.push(formatNumberForPDF(row[key] as number)));
      rowData.push(formatNumberForPDF(row.amount));
      return rowData;
    });

    const baseColStyles: any = {
      0: { cellWidth: 25 },
      3: { cellWidth: 15, halign: "center" },
    };

    let colIndex = 4;
    activeStatusKeys.forEach(() => {
      baseColStyles[colIndex] = { halign: "right" };
      colIndex++;
    });
    baseColStyles[colIndex] = { halign: "right", fontStyle: "bold" };

    autoTable(doc, {
      head: [tableHeader],
      body: tableRowsData,
      startY: tableStartY,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1, halign: "left" },
      headStyles: { fillColor: [243, 244, 246], textColor: [20, 20, 20], fontStyle: "bold" },
      columnStyles: baseColStyles,
      margin: { bottom: 12 }, // ✅ leave room for page number
    });

    // =========================
    // CLUSTER SUMMARY (ALWAYS ALL CLUSTERS)
    // =========================
    // ✅ Ignore printConfig.cluster here; still respect salesman/status + all dates
    const summaryAllClustersRows = getGroupedRows(
      rawGroups,
      { cluster: "All", salesman: printConfig.salesman, status: printConfig.status },
      printDateSettings
    );

    const summaryMap = new Map<string, number>();
    summaryAllClustersRows.forEach((r) => {
      summaryMap.set(r.clusterName, (summaryMap.get(r.clusterName) || 0) + r.amount);
    });

    const summaryData = Array.from(summaryMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, total]) => [name, formatNumberForPDF(total)]);

    let finalY = (doc as any).lastAutoTable?.finalY || 50;
    if (finalY > 160) {
      doc.addPage();
      finalY = 20;
    } else {
      finalY += 10;
    }

    doc.setFontSize(10);
    doc.text("Cluster Summary", 14, finalY);

    autoTable(doc, {
      head: [["Cluster Name", "Total Amount"]],
      body: summaryData,
      startY: finalY + 5,
      theme: "grid",
      tableWidth: 90,
      margin: { left: 14, bottom: 12 }, // ✅ leave room for page number
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" } },
      didDrawPage: (data) => {
        if (data.pageCount === data.pageNumber) {
          const grandTotalStartY = data.cursor.y + 5;
          autoTable(doc, {
            // ✅ Keep this as the printed table total (respects selected cluster)
            body: [["GRAND TOTAL (Printed)", formatNumberForPDF(grandTotalPrinted)]],
            startY: grandTotalStartY,
            theme: "grid",
            tableWidth: 90,
            margin: { left: 120, bottom: 12 }, // ✅ leave room for page number
            styles: { fontSize: 10, cellPadding: 3, fontStyle: "bold", valign: "middle" },
            columnStyles: {
              0: { fillColor: [229, 231, 235], cellWidth: 55 },
              1: { halign: "right", cellWidth: 35 },
            },
          });
        }
      },
    });

    // =========================
    // ✅ PAGE NUMBER FOOTER
    // =========================
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 6, { align: "center" });
      doc.setTextColor(0);
    }

    doc.save(`delivery_monitor_print.pdf`);
    setIsPrintModalOpen(false);
  };

  // --- Pagination & Spans ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const totalPages = Math.ceil(sortedRows.length / itemsPerPage);

  const currentRows = useMemo(() => {
    const currentSlice = sortedRows.slice(indexOfFirstItem, indexOfLastItem);
    const rows = currentSlice.map((r) => ({ ...r }));

    for (let i = 0; i < rows.length; i++) {
      const current = rows[i];
      const prev = rows[i - 1];

      if (i === 0 || current.clusterName !== prev.clusterName) {
        let span = 1;
        for (let j = i + 1; j < rows.length; j++) {
          if (rows[j].clusterName === current.clusterName) span++;
          else break;
        }
        current.clusterRowSpan = span;
      } else {
        current.clusterRowSpan = 0;
      }

      if (i === 0 || current.customerName !== prev.customerName || current.clusterName !== prev.clusterName) {
        let span = 1;
        for (let j = i + 1; j < rows.length; j++) {
          if (rows[j].customerName === current.customerName && rows[j].clusterName === current.clusterName) span++;
          else break;
        }
        current.customerRowSpan = span;
      } else {
        current.customerRowSpan = 0;
      }
    }

    return rows;
  }, [sortedRows, indexOfFirstItem, indexOfLastItem]);

  const availableSalesmen = useMemo(() => {
    const salesmen = new Set<string>();
    rawGroups.forEach((group) => group.customers.forEach((c) => salesmen.add(c.salesmanName)));
    return Array.from(salesmen).sort();
  }, [rawGroups]);

  const availableClusters = useMemo(() => {
    const clusters = new Set<string>();
    rawGroups.forEach((group) => clusters.add(group.clusterName));
    return Array.from(clusters).sort();
  }, [rawGroups]);

  const availableStatuses = ["For Approval", "For Conso", "For Picking", "For Invoicing", "For Loading", "For Shipping"];

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange, salesmanFilter, clusterFilter]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const handleSort = (key: keyof TableRow) => {
    let direction: SortDirection = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const SortableHeader = ({
    label,
    sortKey,
    align = "left",
  }: {
    label: string;
    sortKey: keyof TableRow;
    align?: "left" | "center" | "right";
  }) => (
    <th
      className={`px-4 py-3 text-${align} bg-gray-100 border-r border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors group`}
      onClick={() => handleSort(sortKey)}
    >
      <div
        className={`flex items-center ${
          align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"
        } gap-1`}
      >
        {label}
        <span className="text-gray-400 group-hover:text-gray-600">
          {sortConfig?.key === sortKey ? (
            sortConfig.direction === "asc" ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
          )}
        </span>
      </div>
    </th>
  );

  return (
    <div className="p-8 relative">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-gray-900 text-2xl font-bold mb-1">Delivery Monitor</h1>
          <p className="text-gray-600">Pending deliveries matrix</p>
        </div>
        <button
          onClick={() => setIsPrintModalOpen(true)}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-colors font-medium text-sm"
        >
          <Printer className="w-4 h-4 mr-2" /> Print PDF
        </button>
      </div>

      {/* Dashboard Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search Customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Cluster</label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={clusterFilter}
                  onChange={(e) => setClusterFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="All">All Clusters</option>
                  {availableClusters.map((cluster) => (
                    <option key={cluster} value={cluster}>
                      {cluster}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Salesman</label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={salesmanFilter}
                  onChange={(e) => setSalesmanFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="All">All Salesmen</option>
                  {availableSalesmen.map((salesman) => (
                    <option key={salesman} value={salesman}>
                      {salesman}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="xl:w-auto">
            <label className="block text-sm text-gray-700 mb-2">Quick Range</label>
            <div className="flex gap-2 flex-wrap">
              {(["yesterday", "today", "this-week", "this-month", "this-year", "custom"] as DateRange[]).map(
                (range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors capitalize ${
                      dateRange === range ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {range.replace("-", " ")}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {dateRange === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm text-gray-700 mb-2">From</label>
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">To</label>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* Print Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">What needs to be printed?</h3>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cluster</label>
                  <select
                    value={printConfig.cluster}
                    onChange={(e) => setPrintConfig({ ...printConfig, cluster: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Clusters</option>
                    {availableClusters.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Salesman</label>
                  <select
                    value={printConfig.salesman}
                    onChange={(e) => setPrintConfig({ ...printConfig, salesman: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Salesmen</option>
                    {availableSalesmen.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={printConfig.status}
                  onChange={(e) => setPrintConfig({ ...printConfig, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Statuses (Full Matrix)</option>
                  {availableStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">If a specific status is selected, only that column will be printed.</p>
              </div>

              {/* ✅ Date Range removed from modal — printing always uses ALL dates */}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executePrint}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm flex items-center"
              >
                <Printer className="w-4 h-4 mr-2" /> Print Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Total per Status Cards (ABOVE MAIN 3 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">For Approval</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {loading ? <span className="animate-pulse bg-gray-200 rounded h-6 w-24 inline-block"></span> : formatCardCurrency(statusTotals.approval)}
            </p>
          </div>
          <div className="p-2 bg-purple-50 rounded-full text-purple-600">
            <span className="font-bold">₱</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">For Conso</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {loading ? <span className="animate-pulse bg-gray-200 rounded h-6 w-24 inline-block"></span> : formatCardCurrency(statusTotals.consolidation)}
            </p>
          </div>
          <div className="p-2 bg-blue-50 rounded-full text-blue-600">
            <span className="font-bold">₱</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">For Picking</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {loading ? <span className="animate-pulse bg-gray-200 rounded h-6 w-24 inline-block"></span> : formatCardCurrency(statusTotals.picking)}
            </p>
          </div>
          <div className="p-2 bg-cyan-50 rounded-full text-cyan-600">
            <span className="font-bold">₱</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">For Invoicing</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {loading ? <span className="animate-pulse bg-gray-200 rounded h-6 w-24 inline-block"></span> : formatCardCurrency(statusTotals.invoicing)}
            </p>
          </div>
          <div className="p-2 bg-yellow-50 rounded-full text-yellow-700">
            <span className="font-bold">₱</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">For Loading</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {loading ? <span className="animate-pulse bg-gray-200 rounded h-6 w-24 inline-block"></span> : formatCardCurrency(statusTotals.loading)}
            </p>
          </div>
          <div className="p-2 bg-orange-50 rounded-full text-orange-700">
            <span className="font-bold">₱</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">For Shipping</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {loading ? <span className="animate-pulse bg-gray-200 rounded h-6 w-24 inline-block"></span> : formatCardCurrency(statusTotals.shipping)}
            </p>
          </div>
          <div className="p-2 bg-green-50 rounded-full text-green-700">
            <span className="font-bold">₱</span>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Active Clusters</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {loading ? (
                <span className="animate-pulse bg-gray-200 rounded h-8 w-12 inline-block"></span>
              ) : (
                new Set(tableRows.map((r) => r.clusterName)).size
              )}
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-full text-blue-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Pending Orders</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {loading ? (
                <span className="animate-pulse bg-gray-200 rounded h-8 w-12 inline-block"></span>
              ) : (
                pendingOrdersCount
              )}
            </p>
          </div>
          <div className="p-3 bg-purple-50 rounded-full text-purple-600">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Pending Amount</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {loading ? (
                <span className="animate-pulse bg-gray-200 rounded h-8 w-24 inline-block"></span>
              ) : (
                formatTotalCurrency(tableRows.reduce((acc, r) => acc + r.amount, 0))
              )}
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded-full text-green-600">
            <span className="font-bold text-xl">₱</span>
          </div>
        </div>
      </div>

      {/* Table (UNCHANGED) */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <SortableHeader label="Cluster" sortKey="clusterName" />
                <SortableHeader label="Customer" sortKey="customerName" />
                <SortableHeader label="Salesman" sortKey="salesmanName" />
                <SortableHeader label="Date" sortKey="orderDate" align="center" />

                <th
                  className="px-4 py-3 text-right text-purple-700 bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors group"
                  onClick={() => handleSort("approval")}
                >
                  <div className="flex items-center justify-end gap-1">
                    For Approval{" "}
                    {sortConfig?.key === "approval" ? (
                      sortConfig.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                    )}
                  </div>
                </th>

                <th
                  className="px-4 py-3 text-right text-blue-700 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors group"
                  onClick={() => handleSort("consolidation")}
                >
                  <div className="flex items-center justify-end gap-1">
                    For Conso{" "}
                    {sortConfig?.key === "consolidation" ? (
                      sortConfig.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                    )}
                  </div>
                </th>

                <th
                  className="px-4 py-3 text-right text-cyan-700 bg-cyan-50 cursor-pointer hover:bg-cyan-100 transition-colors group"
                  onClick={() => handleSort("picking")}
                >
                  <div className="flex items-center justify-end gap-1">
                    For Picking{" "}
                    {sortConfig?.key === "picking" ? (
                      sortConfig.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                    )}
                  </div>
                </th>

                <th
                  className="px-4 py-3 text-right text-yellow-700 bg-yellow-50 cursor-pointer hover:bg-yellow-100 transition-colors group"
                  onClick={() => handleSort("invoicing")}
                >
                  <div className="flex items-center justify-end gap-1">
                    For Invoicing{" "}
                    {sortConfig?.key === "invoicing" ? (
                      sortConfig.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                    )}
                  </div>
                </th>

                <th
                  className="px-4 py-3 text-right text-orange-700 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors group"
                  onClick={() => handleSort("loading")}
                >
                  <div className="flex items-center justify-end gap-1">
                    For Loading{" "}
                    {sortConfig?.key === "loading" ? (
                      sortConfig.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                    )}
                  </div>
                </th>

                <th
                  className="px-4 py-3 text-right text-green-700 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors group"
                  onClick={() => handleSort("shipping")}
                >
                  <div className="flex items-center justify-end gap-1">
                    For Shipping{" "}
                    {sortConfig?.key === "shipping" ? (
                      sortConfig.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                    )}
                  </div>
                </th>

                <SortableHeader label="Total" sortKey="amount" align="right" />
                <SortableHeader label="Cluster Total" sortKey="clusterTotal" align="right" />
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                      <p>Loading delivery data...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-gray-500">
                    No pending deliveries found.
                  </td>
                </tr>
              ) : (
                currentRows.map((row) => (
                  <tr key={row.uniqueId} className="hover:bg-gray-50">
                    {row.clusterRowSpan > 0 && (
                      <td
                        rowSpan={row.clusterRowSpan}
                        className="px-4 py-4 align-top border-r border-gray-200 bg-gray-50 font-medium text-gray-900"
                      >
                        {row.clusterName}
                      </td>
                    )}

                    {row.customerRowSpan > 0 && (
                      <td
                        rowSpan={row.customerRowSpan}
                        className="px-4 py-4 align-top bg-white border-r border-gray-100 whitespace-nowrap text-gray-900"
                      >
                        {row.customerName}
                      </td>
                    )}

                    <td className="px-4 py-4 whitespace-nowrap text-gray-600 text-xs">{row.salesmanName}</td>
                    <td className="px-4 py-4 text-center whitespace-nowrap text-gray-500 font-mono text-xs">
                      {formatDate(row.orderDate)}
                    </td>

                    <td className="px-4 py-4 text-right font-mono text-purple-700">{formatCurrency(row.approval)}</td>
                    <td className="px-4 py-4 text-right font-mono text-blue-700">{formatCurrency(row.consolidation)}</td>
                    <td className="px-4 py-4 text-right font-mono text-cyan-700">{formatCurrency(row.picking)}</td>
                    <td className="px-4 py-4 text-right font-mono text-yellow-700">{formatCurrency(row.invoicing)}</td>
                    <td className="px-4 py-4 text-right font-mono text-orange-700">{formatCurrency(row.loading)}</td>
                    <td className="px-4 py-4 text-right font-mono text-green-700">{formatCurrency(row.shipping)}</td>

                    <td className="px-4 py-4 text-right font-bold text-gray-900 border-l border-gray-200">
                      {formatTotalCurrency(row.amount)}
                    </td>

                    {row.clusterRowSpan > 0 && (
                      <td
                        rowSpan={row.clusterRowSpan}
                        className="px-4 py-4 align-middle text-right font-bold text-gray-900 border-l border-gray-200 bg-gray-100"
                      >
                        {formatTotalCurrency(row.clusterTotal)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                currentPage === 1 ? "bg-gray-100 text-gray-400" : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </button>

            <span className="text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0 || loading}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                currentPage === totalPages || totalPages === 0
                  ? "bg-gray-100 text-gray-400"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
