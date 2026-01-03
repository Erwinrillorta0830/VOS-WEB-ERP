import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Package, ChevronLeft, ChevronRight, Layers, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- View Model Types ---

interface ApiSalesOrder {
  order_id: number;
  order_no: string;
  customer_code: string;
  order_status: string;
  total_amount: number;
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

// Final Flattened Row for Table
interface TableRow {
  uniqueId: string;
  clusterName: string;
  customerName: string;
  salesmanName: string;
  clusterRowSpan: number;
  customerRowSpan: number;
  orderDate: string;
  status: string;
  amount: number;
  approval: number;
  consolidation: number;
  picking: number;
  invoicing: number;
  loading: number;
  shipping: number;
  clusterTotal: number;
}

type DateRange = 'yesterday' | 'today' | 'this-week' | 'this-month' | 'this-year' | 'custom';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: keyof TableRow;
  direction: SortDirection;
}

export function PendingDeliveries() {
  // --- State ---
  const [rawGroups, setRawGroups] = useState<ClusterGroupRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState<string>('All');
  const [clusterFilter, setClusterFilter] = useState<string>('All');
  
  // Date Range
  const [dateRange, setDateRange] = useState<DateRange>('this-month');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); 

  // Sorting
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // --- Helpers ---

  // For HTML Display (With Peso Sign)
  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatTotalCurrency = (amount: number) => {
    return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // For PDF Display (NO Symbol)
  const formatNumberForPDF = (amount: number) => {
    if (amount === 0) return '-';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getReadableDateLabel = () => {
    const now = new Date();
    
    if (dateRange === 'this-month') {
        return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    }
    if (dateRange === 'this-year') {
        return now.getFullYear().toString();
    }
    if (dateRange === 'today') {
        return now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    }
    if (dateRange === 'yesterday') {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        return yest.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    }
    if (dateRange === 'this-week') {
        return "THIS WEEK";
    }
    if (dateRange === 'custom') {
        return `${customDateFrom} TO ${customDateTo}`;
    }
    return "ALL TIME";
  };

  const isDateInRange = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (dateRange === 'custom') {
      if (!customDateFrom || !customDateTo) return true;
      const from = new Date(customDateFrom);
      const to = new Date(customDateTo);
      return date >= from && date <= to;
    }

    if (dateRange === 'today') return targetDate.getTime() === startOfToday.getTime();
    
    if (dateRange === 'yesterday') {
        const yesterday = new Date(startOfToday);
        yesterday.setDate(yesterday.getDate() - 1);
        return targetDate.getTime() === yesterday.getTime();
    }

    if (dateRange === 'this-week') {
      const dayOfWeek = startOfToday.getDay(); 
      const diff = startOfToday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(diff);
      return date >= startOfWeek;
    }

    if (dateRange === 'this-month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    if (dateRange === 'this-year') return date.getFullYear() === now.getFullYear();

    return true;
  };

  const handleSort = (key: keyof TableRow) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/pending-deliveries');
        
        if (!res.ok) {
            throw new Error('Failed to fetch data');
        }

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

  // --- Flattening Logic ---
  const tableRows = useMemo(() => {
    const rows: TableRow[] = [];
    const searchLower = searchTerm.toLowerCase();

    rawGroups.forEach(group => {
        if (clusterFilter !== 'All' && group.clusterName !== clusterFilter) return;

        let clusterTotal = 0;
        const groupRows: TableRow[] = [];

        group.customers.forEach(customer => {
            const filteredOrders = customer.orders.filter(o => {
                const dateValid = isDateInRange(o.order_date);
                if (!dateValid) return false;

                const matchesSalesman = salesmanFilter === 'All' || customer.salesmanName === salesmanFilter;
                if (!matchesSalesman) return false;

                const matchesSearch = 
                    customer.customerName.toLowerCase().includes(searchLower) ||
                    customer.salesmanName.toLowerCase().includes(searchLower);
                
                return matchesSearch;
            });

            if (filteredOrders.length === 0) return;

            filteredOrders.forEach((order) => {
                const status = (order.order_status || '').toLowerCase();
                const amt = order.total_amount;
                clusterTotal += amt;

                const rowData: TableRow = {
                    uniqueId: order.order_no,
                    clusterName: group.clusterName,
                    customerName: customer.customerName,
                    salesmanName: customer.salesmanName,
                    clusterRowSpan: 0, 
                    customerRowSpan: 0,
                    orderDate: order.order_date,
                    status: order.order_status,
                    amount: amt,
                    approval: status.includes('approval') ? amt : 0,
                    consolidation: status.includes('consolidation') ? amt : 0,
                    picking: status.includes('picking') ? amt : 0,
                    invoicing: status.includes('invoicing') ? amt : 0,
                    loading: status.includes('loading') ? amt : 0,
                    shipping: status.includes('shipping') ? amt : 0,
                    clusterTotal: 0 
                };
                groupRows.push(rowData);
            });
        });

        groupRows.forEach(r => r.clusterTotal = clusterTotal);
        rows.push(...groupRows);
    });

    return rows;
  }, [rawGroups, searchTerm, salesmanFilter, clusterFilter, dateRange, customDateFrom, customDateTo]);

  // --- Sorting Logic ---
  const sortedRows = useMemo(() => {
    const sortableItems = [...tableRows];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        return 0;
      });
    }
    return sortableItems;
  }, [tableRows, sortConfig]);

  // --- Stats Calculation (Global for PDF) ---
  const grandTotal = tableRows.reduce((sum, r) => sum + r.amount, 0);
  const totalOrders = tableRows.length;
  const uniqueClusters = new Set(tableRows.map(r => r.clusterName)).size;

  // --- PDF GENERATION (Updated with Cards) ---
  const handlePrintPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

    // 1. Add Header Info
    const today = new Date().toLocaleDateString();
    const dateLabel = getReadableDateLabel();

    doc.setFontSize(14);
    doc.text("Delivery Monitor Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${dateLabel}`, 14, 22); 
    doc.text(`Generated: ${today}`, 14, 27);

    // --- 2. DRAW SUMMARY CARDS ---
    const startX = 80; // Start drawing cards from here
    const startY = 10;
    const cardWidth = 65;
    const cardHeight = 22;
    const gap = 5;

    // Helper to draw a single card
    const drawCard = (x: number, title: string, value: string, iconColor: [number, number, number]) => {
        // Draw Box
        doc.setDrawColor(220, 220, 220); // Light gray border
        doc.setFillColor(255, 255, 255); // White background
        doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'FD');

        // Draw Title
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100); // Gray text
        doc.text(title, x + 4, startY + 7);

        // Draw Value
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0); // Black text
        doc.setFont("helvetica", "bold");
        doc.text(value, x + 4, startY + 17);
        doc.setFont("helvetica", "normal");

        // Small colored indicator circle (mimicking icon)
        doc.setFillColor(...iconColor);
        doc.circle(x + cardWidth - 8, startY + 11, 4, 'F');
    };

    // Card 1: Active Clusters (Blue ish)
    drawCard(startX, "Active Clusters", uniqueClusters.toString(), [219, 234, 254]);

    // Card 2: Pending Orders (Purple ish)
    drawCard(startX + cardWidth + gap, "Pending Orders", totalOrders.toString(), [243, 232, 255]);

    // Card 3: Total Pending Amount (Green ish)
    drawCard(startX + (cardWidth + gap) * 2, "Total Pending Amount", `P ${formatNumberForPDF(grandTotal)}`, [220, 252, 231]);

    // --- END SUMMARY CARDS ---

    // 3. Prepare Main Table Data
    const tableColumn = [
        "Cluster", "Customer", "Salesman", "Date", "Approval", "Conso", 
        "Picking", "Invoicing", "Loading", "Shipping", "Total"
    ];

    const tableRowsData = sortedRows.map(row => [
        row.clusterName,
        row.customerName,
        row.salesmanName,
        formatDate(row.orderDate),
        formatNumberForPDF(row.approval),
        formatNumberForPDF(row.consolidation),
        formatNumberForPDF(row.picking),
        formatNumberForPDF(row.invoicing),
        formatNumberForPDF(row.loading),
        formatNumberForPDF(row.shipping),
        formatNumberForPDF(row.amount)
    ]);

    // 4. Generate Main Table (Pushed down to accommodate cards)
    autoTable(doc, {
        head: [tableColumn],
        body: tableRowsData,
        startY: 40, // Pushed down
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1, halign: 'left' },
        headStyles: { fillColor: [243, 244, 246], textColor: [20, 20, 20], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 25 },
            3: { cellWidth: 15, halign: 'center' },
            4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' },
            7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' },
            10: { halign: 'right', fontStyle: 'bold' }
        }
    });

    // 5. Calculate Cluster Summary
    const clusterTotals: Record<string, number> = {};
    sortedRows.forEach(row => {
        if (!clusterTotals[row.clusterName]) clusterTotals[row.clusterName] = 0;
        clusterTotals[row.clusterName] += row.amount;
    });

    const summaryData = Object.entries(clusterTotals).sort((a, b) => a[0].localeCompare(b[0])).map(([name, total]) => [
        name, formatNumberForPDF(total)
    ]);

    const grandTotalSum = Object.values(clusterTotals).reduce((a, b) => a + b, 0);

    // 6. Generate Footer Tables
    // Get Y position after main table
    let finalY = (doc as any).lastAutoTable.finalY || 50; 
    
    // Check if we need a new page for the title
    if (finalY > 170) { // A4 landscape height is 210mm, leaving some buffer
        doc.addPage();
        finalY = 20;
    } else {
        finalY += 10;
    }

    const summaryStartY = finalY;

    doc.setFontSize(10);
    doc.setTextColor(0,0,0);
    doc.text("Cluster Summary", 14, summaryStartY);

    // Table A: List of Clusters
    autoTable(doc, {
        head: [['Cluster Name', 'Total Amount']],
        body: summaryData,
        startY: summaryStartY + 5,
        theme: 'grid',
        tableWidth: 90,
        margin: { left: 14 },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } },
        // This hook runs after every page of this specific table is drawn
        didDrawPage: (data) => {
            // Check if we are on the last page of the cluster summary table
            if (data.pageCount === data.pageNumber) {
                // Get the Y position after the last row on this page
                const grandTotalStartY = data.cursor.y + 5;

                // Draw the Grand Total Box
                autoTable(doc, {
                    body: [['GRAND TOTAL', formatNumberForPDF(grandTotalSum)]],
                    startY: grandTotalStartY,
                    theme: 'grid',
                    tableWidth: 80,
                    margin: { left: 120 }, // Position it to the right of the summary table
                    styles: { fontSize: 10, cellPadding: 3, fontStyle: 'bold', valign: 'middle' },
                    columnStyles: {
                        0: { fillColor: [229, 231, 235], cellWidth: 40 }, 
                        1: { halign: 'right', cellWidth: 40 }
                    }
                });
            }
        }
    });

    doc.save(`delivery_monitor_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // --- Pagination & Spans per Page ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const totalPages = Math.ceil(sortedRows.length / itemsPerPage);

  const currentRows = useMemo(() => {
      const rawCurrentRows = sortedRows.slice(indexOfFirstItem, indexOfLastItem);
      const rows = rawCurrentRows.map(r => ({...r})); 
      for (let i = 0; i < rows.length; i++) {
          const current = rows[i];
          const prev = rows[i - 1];
          if (i === 0 || current.clusterName !== prev.clusterName) {
              let span = 1;
              for (let j = i + 1; j < rows.length; j++) {
                  if (rows[j].clusterName === current.clusterName) span++; else break;
              }
              current.clusterRowSpan = span;
          } else { current.clusterRowSpan = 0; }

          if (i === 0 || current.customerName !== prev.customerName || current.clusterName !== prev.clusterName) {
              let span = 1;
              for (let j = i + 1; j < rows.length; j++) {
                  if (rows[j].customerName === current.customerName && rows[j].clusterName === current.clusterName) span++; else break;
              }
              current.customerRowSpan = span;
          } else { current.customerRowSpan = 0; }
      }
      return rows;
  }, [sortedRows, indexOfFirstItem, indexOfLastItem]);

  const availableSalesmen = useMemo(() => {
      const salesmen = new Set<string>();
      rawGroups.forEach(group => group.customers.forEach(c => salesmen.add(c.salesmanName)));
      return Array.from(salesmen).sort();
  }, [rawGroups]);

  const availableClusters = useMemo(() => {
      const clusters = new Set<string>();
      rawGroups.forEach(group => clusters.add(group.clusterName));
      return Array.from(clusters).sort();
  }, [rawGroups]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, dateRange, salesmanFilter, clusterFilter]);
  const handlePageChange = (newPage: number) => { if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage); };

  const SortableHeader = ({ label, sortKey, align = 'left' }: { label: string, sortKey: keyof TableRow, align?: 'left' | 'center' | 'right' }) => (
    <th className={`px-4 py-3 text-${align} bg-gray-100 border-r border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors group`} onClick={() => handleSort(sortKey)}>
        <div className={`flex items-center ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'} gap-1`}>
            {label}
            <span className="text-gray-400 group-hover:text-gray-600">
                {sortConfig?.key === sortKey ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : (<ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />)}
            </span>
        </div>
    </th>
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-gray-900 text-2xl font-bold mb-1">Delivery Monitor</h1><p className="text-gray-600">Pending deliveries matrix</p></div>
        <button onClick={handlePrintPDF} className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-colors font-medium text-sm">
            <Printer className="w-4 h-4 mr-2" /> Print PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
            <div><label className="block text-sm text-gray-700 mb-2">Search</label><div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="text" placeholder="Customer, Salesman..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div></div>
            <div><label className="block text-sm text-gray-700 mb-2">Cluster</label><div className="relative"><Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /><select value={clusterFilter} onChange={(e) => setClusterFilter(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"><option value="All">All Clusters</option>{availableClusters.map(cluster => (<option key={cluster} value={cluster}>{cluster}</option>))}</select></div></div>
            <div><label className="block text-sm text-gray-700 mb-2">Salesman</label><div className="relative"><Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /><select value={salesmanFilter} onChange={(e) => setSalesmanFilter(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"><option value="All">All Salesmen</option>{availableSalesmen.map(salesman => (<option key={salesman} value={salesman}>{salesman}</option>))}</select></div></div>
          </div>
          <div className="xl:w-auto"><label className="block text-sm text-gray-700 mb-2">Quick Range</label><div className="flex gap-2 flex-wrap">{(['yesterday', 'today', 'this-week', 'this-month', 'this-year', 'custom'] as DateRange[]).map((range) => (<button key={range} onClick={() => setDateRange(range)} className={`px-4 py-2 rounded-lg text-sm transition-colors capitalize ${dateRange === range ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{range.replace('-', ' ')}</button>))}</div></div>
        </div>
        {dateRange === 'custom' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200"><div><label className="block text-sm text-gray-700 mb-2">From</label><input type="date" value={customDateFrom} onChange={(e) => setCustomDateFrom(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div><div><label className="block text-sm text-gray-700 mb-2">To</label><input type="date" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div></div>)}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
         <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Active Clusters</p><p className="text-2xl font-bold text-gray-900 mt-1">{loading ? <span className="animate-pulse bg-gray-200 rounded h-8 w-12 inline-block"></span> : uniqueClusters}</p></div><div className="p-3 bg-blue-50 rounded-full text-blue-600"><Layers className="w-6 h-6" /></div></div>
         <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Pending Orders</p><p className="text-2xl font-bold text-gray-900 mt-1">{loading ? <span className="animate-pulse bg-gray-200 rounded h-8 w-12 inline-block"></span> : totalOrders}</p></div><div className="p-3 bg-purple-50 rounded-full text-purple-600"><Package className="w-6 h-6" /></div></div>
         <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Total Pending Amount</p><p className="text-2xl font-bold text-gray-900 mt-1">{loading ? <span className="animate-pulse bg-gray-200 rounded h-8 w-24 inline-block"></span> : formatTotalCurrency(grandTotal)}</p></div><div className="p-3 bg-green-50 rounded-full text-green-600"><span className="font-bold text-xl">₱</span></div></div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <SortableHeader label="Cluster" sortKey="clusterName" />
                <SortableHeader label="Customer" sortKey="customerName" />
                <SortableHeader label="Salesman" sortKey="salesmanName" />
                <SortableHeader label="Date" sortKey="orderDate" align="center" />
                <th className="px-4 py-3 text-right text-purple-700 bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors group" onClick={() => handleSort('approval')}><div className="flex items-center justify-end gap-1">For Approval {sortConfig?.key === 'approval' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50"/>}</div></th>
                <th className="px-4 py-3 text-right text-blue-700 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors group" onClick={() => handleSort('consolidation')}><div className="flex items-center justify-end gap-1">For Conso {sortConfig?.key === 'consolidation' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50"/>}</div></th>
                <th className="px-4 py-3 text-right text-cyan-700 bg-cyan-50 cursor-pointer hover:bg-cyan-100 transition-colors group" onClick={() => handleSort('picking')}><div className="flex items-center justify-end gap-1">For Picking {sortConfig?.key === 'picking' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50"/>}</div></th>
                <th className="px-4 py-3 text-right text-yellow-700 bg-yellow-50 cursor-pointer hover:bg-yellow-100 transition-colors group" onClick={() => handleSort('invoicing')}><div className="flex items-center justify-end gap-1">For Invoicing {sortConfig?.key === 'invoicing' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50"/>}</div></th>
                <th className="px-4 py-3 text-right text-orange-700 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors group" onClick={() => handleSort('loading')}><div className="flex items-center justify-end gap-1">For Loading {sortConfig?.key === 'loading' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50"/>}</div></th>
                <th className="px-4 py-3 text-right text-green-700 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors group" onClick={() => handleSort('shipping')}><div className="flex items-center justify-end gap-1">For Shipping {sortConfig?.key === 'shipping' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50"/>}</div></th>
                <SortableHeader label="Total" sortKey="amount" align="right" />
                <SortableHeader label="Cluster Total" sortKey="clusterTotal" align="right" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {loading ? (<tr><td colSpan={13} className="px-6 py-20 text-center"><div className="flex flex-col items-center justify-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" /><p>Loading delivery data...</p></div></td></tr>) : error ? (<tr><td colSpan={13} className="px-6 py-12 text-center text-red-500">{error}</td></tr>) : sortedRows.length === 0 ? (<tr><td colSpan={13} className="px-6 py-12 text-center text-gray-500">No pending deliveries found.</td></tr>) : (
                currentRows.map((row) => (
                    <tr key={row.uniqueId} className="hover:bg-gray-50">
                        {row.clusterRowSpan > 0 && (<td rowSpan={row.clusterRowSpan} className="px-4 py-4 align-top border-r border-gray-200 bg-gray-50 font-medium text-gray-900">{row.clusterName}</td>)}
                        {row.customerRowSpan > 0 && (<td rowSpan={row.customerRowSpan} className="px-4 py-4 align-top bg-white border-r border-gray-100 whitespace-nowrap text-gray-900">{row.customerName}</td>)}
                        <td className="px-4 py-4 whitespace-nowrap text-gray-600 text-xs">{row.salesmanName}</td>
                        <td className="px-4 py-4 text-center whitespace-nowrap text-gray-500 font-mono text-xs">{formatDate(row.orderDate)}</td>
                        <td className="px-4 py-4 text-right font-mono text-purple-700">{formatCurrency(row.approval)}</td>
                        <td className="px-4 py-4 text-right font-mono text-blue-700">{formatCurrency(row.consolidation)}</td>
                        <td className="px-4 py-4 text-right font-mono text-cyan-700">{formatCurrency(row.picking)}</td>
                        <td className="px-4 py-4 text-right font-mono text-yellow-700">{formatCurrency(row.invoicing)}</td>
                        <td className="px-4 py-4 text-right font-mono text-orange-700">{formatCurrency(row.loading)}</td>
                        <td className="px-4 py-4 text-right font-mono text-green-700">{formatCurrency(row.shipping)}</td>
                        <td className="px-4 py-4 text-right font-bold text-gray-900 border-l border-gray-200">{formatTotalCurrency(row.amount)}</td>
                        {row.clusterRowSpan > 0 && (<td rowSpan={row.clusterRowSpan} className="px-4 py-4 align-middle text-right font-bold text-gray-900 border-l border-gray-200 bg-gray-100">{formatTotalCurrency(row.clusterTotal)}</td>)}
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between items-center">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || loading} className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'}`}><ChevronLeft className="w-4 h-4 mr-1" /> Previous</button>
            <span className="text-sm font-medium text-gray-700">Page {currentPage} of {totalPages || 1}</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0 || loading} className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === totalPages || totalPages === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Next <ChevronRight className="w-4 h-4 ml-1" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}