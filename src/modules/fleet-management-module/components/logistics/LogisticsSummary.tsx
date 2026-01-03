import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, ArrowUpDown, Printer, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Interfaces ---
interface DeliveryDetail {
  clusterName: string;
  customerName: string;
  fulfilled: number;
  notFulfilled: number;
  fulfilledWithReturns: number;
  fulfilledWithConcerns: number;
}

interface LogisticsRecord {
  id: string;
  truckPlate: string;
  driver: string;
  deliveries: DeliveryDetail[];
}

type DateRange = 'yesterday' | 'today' | 'tomorrow' | 'this-week' | 'this-month' | 'this-year' | 'custom';
type SortDirection = 'asc' | 'desc';
type SortKey = 'truckPlate' | 'driver' | 'clusterName' | 'customerName' | 'total' | 'fulfilled' | 'notFulfilled' | 'fulfilledWithReturns' | 'fulfilledWithConcerns';

// Print Specific Types
type PrintStatus = 'all' | 'fulfilled' | 'notFulfilled' | 'returns' | 'concerns';
type PrintDateRange = 'today' | 'this-week' | 'this-month' | 'custom';

export function LogisticsSummary() {
  const [data, setData] = useState<LogisticsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // --- Main View Filters ---
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('this-month');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  
  // --- Sorting ---
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'clusterName', direction: 'asc' });

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // --- Print Modal State ---
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printFilters, setPrintFilters] = useState({
    cluster: 'All Clusters',
    customer: 'All Customers',
    driver: 'All Drivers',
    status: 'all' as PrintStatus,
    dateRange: 'this-month' as PrintDateRange,
    customFrom: '',
    customTo: ''
  });

  // State to hold ALL unique options for filters (not just current page)
  const [filterOptions, setFilterOptions] = useState({
    clusters: [] as string[],
    customers: [] as string[],
    drivers: [] as string[]
  });

  // --- Date Calculation Helper ---
  const getDateFilterString = () => {
    const now = new Date();
    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    let start = new Date();
    let end = new Date();

    const T_START = 'T00:00:00';
    const T_END = 'T23:59:59';

    if (dateRange === 'today') {
        const todayStr = formatDate(now);
        return `${todayStr}${T_START},${todayStr}${T_END}`;
    }
    if (dateRange === 'yesterday') {
        start.setDate(now.getDate() - 1);
        const yestStr = formatDate(start);
        return `${yestStr}${T_START},${yestStr}${T_END}`;
    }
    if (dateRange === 'tomorrow') {
        start.setDate(now.getDate() + 1);
        const tomStr = formatDate(start);
        return `${tomStr}${T_START},${tomStr}${T_END}`;
    }
    if (dateRange === 'this-week') {
      const day = now.getDay(); 
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
      start.setDate(diff);
      end.setDate(start.getDate() + 6);
    } 
    else if (dateRange === 'this-month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } 
    else if (dateRange === 'this-year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } 
    else if (dateRange === 'custom') {
      if (!customDateFrom || !customDateTo) return '';
      return `${customDateFrom}${T_START},${customDateTo}${T_END}`;
    }

    return `${formatDate(start)}${T_START},${formatDate(end)}${T_END}`;
  };

  // --- API Fetching (Main View) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const dateFilter = getDateFilterString();
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        if (searchTerm) params.append('search', searchTerm);
        if (dateFilter) params.append('dateFilter', dateFilter);

        const res = await fetch(`/api/logistics-summary?${params.toString()}`);

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to fetch data');
        }

        const result = await res.json();
        setData(result.data || []);

        if (result.meta?.filter_count) {
          setTotalPages(Math.ceil(result.meta.filter_count / ITEMS_PER_PAGE));
        } else {
          setTotalPages(result.data.length > 0 ? 1 : 0);
        }

      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message || 'An error occurred');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
        fetchData();
    }, 300);

    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, dateRange, customDateFrom, customDateTo]);


  // --- Fetch ALL Filter Options (Run once or when date changes to keep filters fresh) ---
  useEffect(() => {
    const fetchAllFilterOptions = async () => {
        try {
            // We reuse the current date filter context to get relevant dropdown options
            const dateFilter = getDateFilterString();
            const params = new URLSearchParams();
            if (dateFilter) params.append('dateFilter', dateFilter);
            params.append('limit', '10000'); // Fetch all to get unique values

            const res = await fetch(`/api/logistics-summary?${params.toString()}`);
            if (!res.ok) return;

            const result = await res.json();
            const allRecords: LogisticsRecord[] = result.data || [];

            const clusters = new Set<string>();
            const customers = new Set<string>();
            const drivers = new Set<string>();

            allRecords.forEach(record => {
                drivers.add(record.driver);
                record.deliveries.forEach(d => {
                    clusters.add(d.clusterName);
                    customers.add(d.customerName);
                });
            });

            setFilterOptions({
                clusters: Array.from(clusters).sort(),
                customers: Array.from(customers).sort(),
                drivers: Array.from(drivers).sort()
            });

        } catch (error) {
            console.error("Failed to fetch filter options", error);
        }
    };

    // Debounce this fetch slightly less aggressively or run it in parallel
    const timer = setTimeout(() => {
        fetchAllFilterOptions();
    }, 500);

    return () => clearTimeout(timer);
  }, [dateRange, customDateFrom, customDateTo]); // Re-fetch filters if the main date range changes


  // --- Handlers ---
  const handleRangeChange = (range: DateRange) => { setDateRange(range); setCurrentPage(1); };
  const handlePageChange = (newPage: number) => { if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage); };
  
  const formatCurrency = (amount: number) => 
    `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // --- Table Data Preparation (Flattening & Sorting) ---
  const flattenedData = useMemo(() => {
    const rows = data.flatMap(record => 
        record.deliveries.map(delivery => ({
            ...delivery,
            truckPlate: record.truckPlate,
            driver: record.driver,
            rowTotal: delivery.fulfilled + delivery.notFulfilled + delivery.fulfilledWithReturns + delivery.fulfilledWithConcerns
        }))
    );

    if (!sortConfig) return rows;

    const { key, direction } = sortConfig;
    const modifier = direction === 'asc' ? 1 : -1;

    rows.sort((a, b) => {
        if (key === 'clusterName') return a.clusterName.localeCompare(b.clusterName) * modifier;
        if (key === 'customerName') return a.customerName.localeCompare(b.customerName) * modifier;
        if (key === 'driver') return a.driver.localeCompare(b.driver) * modifier;
        if (key === 'truckPlate') return a.truckPlate.localeCompare(b.truckPlate) * modifier;
        if (key === 'fulfilled') return (a.fulfilled - b.fulfilled) * modifier;
        if (key === 'notFulfilled') return (a.notFulfilled - b.notFulfilled) * modifier;
        if (key === 'fulfilledWithReturns') return (a.fulfilledWithReturns - b.fulfilledWithReturns) * modifier;
        if (key === 'fulfilledWithConcerns') return (a.fulfilledWithConcerns - b.fulfilledWithConcerns) * modifier;
        if (key === 'total') return (a.rowTotal - b.rowTotal) * modifier;
        return 0;
    });

    return rows;
  }, [data, sortConfig]);

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // --- Generate PDF Logic ---
  const generatePDF = async () => {
    setIsPrinting(true);
    
    try {
        // 1. Fetch ALL Data (Bypassing Pagination)
        const dateFilter = getDateFilterString();
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (dateFilter) params.append('dateFilter', dateFilter);
        params.append('limit', '10000'); 

        const res = await fetch(`/api/logistics-summary?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch full report data");
        
        const result = await res.json();
        const allRecords: LogisticsRecord[] = result.data || [];

        // 2. Flatten Fetched Data
        let allDeliveries = allRecords.flatMap(record => 
            record.deliveries.map(d => ({ 
                ...d, 
                driver: record.driver, 
                truckPlate: record.truckPlate,
                rowTotal: d.fulfilled + d.notFulfilled + d.fulfilledWithReturns + d.fulfilledWithConcerns
            }))
        );

        // 3. Filter Rows based on Modal Selections
        const filteredRows = allDeliveries.filter(row => {
            if (printFilters.cluster !== 'All Clusters' && row.clusterName !== printFilters.cluster) return false;
            if (printFilters.customer !== 'All Customers' && row.customerName !== printFilters.customer) return false;
            if (printFilters.driver !== 'All Drivers' && row.driver !== printFilters.driver) return false;
            return true;
        });

        // 4. PDF Generation
        const doc = new jsPDF('l', 'mm', 'a4');
        const today = new Date();
        const todayStr = today.toLocaleDateString();
        const formatCurrencyPdf = (amount: number) => 
            amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const formatPrintPeriodLabel = () => {
            const now = new Date();
            const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
            if (printFilters.dateRange === 'this-month') return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
            if (printFilters.dateRange === 'today') return `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
            if (printFilters.dateRange === 'custom') return `${printFilters.customFrom || '...'} TO ${printFilters.customTo || '...'}`;
            return printFilters.dateRange.replace('-', ' ').toUpperCase();
        };

        // --- Metrics & Summary Calculation ---
        let grandTotalAmount = 0;
        const activeClusters = new Set<string>();
        const clusterSummary: Record<string, number> = {};

        filteredRows.forEach(row => {
            const rowTotal = row.fulfilled + row.notFulfilled + row.fulfilledWithReturns + row.fulfilledWithConcerns;
            grandTotalAmount += rowTotal;
            activeClusters.add(row.clusterName);

            // Calculate metric for summary table based on Selected Status
            let valToSum = 0;
            if (printFilters.status === 'all') valToSum = rowTotal;
            else if (printFilters.status === 'fulfilled') valToSum = row.fulfilled;
            else if (printFilters.status === 'notFulfilled') valToSum = row.notFulfilled;
            else if (printFilters.status === 'returns') valToSum = row.fulfilledWithReturns;
            else if (printFilters.status === 'concerns') valToSum = row.fulfilledWithConcerns;

            if (!clusterSummary[row.clusterName]) clusterSummary[row.clusterName] = 0;
            clusterSummary[row.clusterName] += valToSum;
        });

        // --- Header ---
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text("Logistics Summary Report", 14, 15); 
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Period: ${formatPrintPeriodLabel()}`, 14, 22); doc.text(`Generated: ${todayStr}`, 14, 27);

        // --- Summary Cards ---
        const drawCard = (label: string, value: string, x: number) => {
            doc.setDrawColor(220, 220, 220); doc.roundedRect(x, 10, 50, 20, 2, 2, 'S');
            doc.setFontSize(8); doc.setTextColor(100); doc.text(label, x + 4, 15);
            doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.text(value, x + 4, 24);
            doc.setFont("helvetica", "normal");
        };
        drawCard("Active Clusters", activeClusters.size.toString(), 120);
        drawCard("Total Deliveries", filteredRows.length.toString(), 175);
        drawCard("Total Amount", formatCurrencyPdf(grandTotalAmount), 230);

        // --- Main Table (Detailed) ---
        const baseColumns = ["Cluster", "Customer", "Driver", "Truck"];
        let statusColumns: string[] = [];
        if (printFilters.status === 'all') statusColumns = ["Fulfilled", "Not Fulfilled", "Returns", "Concerns"];
        else if (printFilters.status === 'fulfilled') statusColumns = ["Fulfilled"];
        else if (printFilters.status === 'notFulfilled') statusColumns = ["Not Fulfilled"];
        else if (printFilters.status === 'returns') statusColumns = ["Returns"];
        else if (printFilters.status === 'concerns') statusColumns = ["Concerns"];

        // NO Total Column Here
        const tableColumn = [...baseColumns, ...statusColumns];
        
        const tableRows = filteredRows.map(row => {
            const baseData = [row.clusterName, row.customerName, row.driver, row.truckPlate];
            let statusData: string[] = [];
            if (printFilters.status === 'all') statusData = [
                row.fulfilled > 0 ? formatCurrencyPdf(row.fulfilled) : '-',
                row.notFulfilled > 0 ? formatCurrencyPdf(row.notFulfilled) : '-',
                row.fulfilledWithReturns > 0 ? formatCurrencyPdf(row.fulfilledWithReturns) : '-',
                row.fulfilledWithConcerns > 0 ? formatCurrencyPdf(row.fulfilledWithConcerns) : '-'
            ];
            else if (printFilters.status === 'fulfilled') statusData = [row.fulfilled > 0 ? formatCurrencyPdf(row.fulfilled) : '-'];
            else if (printFilters.status === 'notFulfilled') statusData = [row.notFulfilled > 0 ? formatCurrencyPdf(row.notFulfilled) : '-'];
            else if (printFilters.status === 'returns') statusData = [row.fulfilledWithReturns > 0 ? formatCurrencyPdf(row.fulfilledWithReturns) : '-'];
            else if (printFilters.status === 'concerns') statusData = [row.fulfilledWithConcerns > 0 ? formatCurrencyPdf(row.fulfilledWithConcerns) : '-'];

            return [...baseData, ...statusData];
        });

        // Right Align numeric columns
        const numericStartIdx = 4;
        const numericEndIdx = tableColumn.length - 1;
        const colStyles: any = {};
        for(let i = numericStartIdx; i <= numericEndIdx; i++) {
            colStyles[i] = { halign: 'right' };
        }

        autoTable(doc, {
            head: [tableColumn], body: tableRows, startY: 35, theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [245, 247, 250], textColor: [80, 80, 80], fontStyle: 'bold', lineWidth: 0.1, lineColor: [200, 200, 200] },
            columnStyles: colStyles
        });

        // --- Bottom Summary Table (Cluster Totals) ---
        const summaryRows = Object.entries(clusterSummary)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([cluster, total]) => [cluster, formatCurrencyPdf(total)]);

        const summaryTotal = Object.values(clusterSummary).reduce((acc, curr) => acc + curr, 0);
        summaryRows.push(["GRAND TOTAL", formatCurrencyPdf(summaryTotal)]);

        let statusLabel = "Total Amount";
        if (printFilters.status === 'fulfilled') statusLabel = "Total Fulfilled";
        else if (printFilters.status === 'notFulfilled') statusLabel = "Total Not Fulfilled";
        else if (printFilters.status === 'returns') statusLabel = "Total Returns";
        else if (printFilters.status === 'concerns') statusLabel = "Total Concerns";

        // @ts-ignore
        const finalY = doc.lastAutoTable?.finalY || 150; 

        autoTable(doc, {
            startY: finalY + 10,
            head: [['Cluster', statusLabel]],
            body: summaryRows,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
            columnStyles: {
                1: { halign: 'right', fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                if (data.row.index === summaryRows.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [240, 240, 240];
                }
            }
        });

        doc.save(`logistics summary report - ${todayStr.replace(/\//g, '-')}.pdf`);
        setIsPrintModalOpen(false);

    } catch (err) {
        console.error("Print Error:", err);
        alert("Error generating full report. Please check your connection.");
    } finally {
        setIsPrinting(false);
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => (
    <div className={`inline-block ml-2 ${sortConfig?.key === columnKey ? 'text-blue-600' : 'text-gray-300'}`}>
      <ArrowUpDown className="w-4 h-4" />
    </div>
  );

  const ThSortable = ({ label, columnKey, align = 'left', className = '' }: { label: string, columnKey: SortKey, align?: 'left' | 'right', className?: string }) => (
    <th 
      className={`px-6 py-3 text-${align} text-xs text-gray-500 uppercase border-r border-gray-200 cursor-pointer hover:bg-gray-100 select-none ${className}`}
      onClick={() => handleSort(columnKey)}
    >
      <div className={`flex items-center ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {label}
        <SortIcon columnKey={columnKey} />
      </div>
    </th>
  );

  return (
    <div className="p-8 relative">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-semibold">Logistics Summary</h1>
          <p className="text-gray-600">Comprehensive delivery tracking and performance overview</p>
        </div>
        
        {/* Open Print Modal Button */}
        <button 
          onClick={() => setIsPrintModalOpen(true)}
          disabled={loading || flattenedData.length === 0}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="w-4 h-4" />
          Print PDF
        </button>
      </div>

      {/* --- Print Modal --- */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">What needs to be printed?</h3>
                <button onClick={() => setIsPrintModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
                
                {/* Row 1: Cluster & Customer */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cluster</label>
                        <select 
                            value={printFilters.cluster}
                            onChange={(e) => setPrintFilters(prev => ({ ...prev, cluster: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option>All Clusters</option>
                            {/* USE filterOptions.clusters instead of uniqueClusters */}
                            {filterOptions.clusters.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer</label>
                        <select 
                             value={printFilters.customer}
                             onChange={(e) => setPrintFilters(prev => ({ ...prev, customer: e.target.value }))}
                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option>All Customers</option>
                            {/* USE filterOptions.customers instead of uniqueCustomers */}
                            {filterOptions.customers.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                 {/* Row 2: Driver */}
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Driver</label>
                    <select 
                         value={printFilters.driver}
                         onChange={(e) => setPrintFilters(prev => ({ ...prev, driver: e.target.value }))}
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option>All Drivers</option>
                        {/* USE filterOptions.drivers instead of uniqueDrivers */}
                        {filterOptions.drivers.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                {/* Row 3: Status */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                    <select 
                         value={printFilters.status}
                         onChange={(e) => setPrintFilters(prev => ({ ...prev, status: e.target.value as PrintStatus }))}
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="all">All Statuses (Full Matrix)</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="notFulfilled">Not Fulfilled</option>
                        <option value="returns">With Returns</option>
                        <option value="concerns">With Concerns</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">If a specific status is selected, only that column will be printed.</p>
                </div>

                {/* Row 4: Date Range */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date Range</label>
                    <div className="flex gap-2">
                        {(['today', 'this-week', 'this-month', 'custom'] as PrintDateRange[]).map((range) => (
                             <button
                                key={range}
                                onClick={() => setPrintFilters(prev => ({ ...prev, dateRange: range }))}
                                className={`flex-1 py-2 text-sm rounded-md border transition-colors ${
                                    printFilters.dateRange === range 
                                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' 
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                             >
                                {range.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                             </button>
                        ))}
                    </div>
                </div>

                {/* Row 5: Custom Date Inputs (Conditional) */}
                {printFilters.dateRange === 'custom' && (
                     <div className="grid grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-2">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">From</label>
                            <input 
                                type="date" 
                                value={printFilters.customFrom}
                                onChange={(e) => setPrintFilters(prev => ({ ...prev, customFrom: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">To</label>
                            <input 
                                type="date" 
                                value={printFilters.customTo}
                                onChange={(e) => setPrintFilters(prev => ({ ...prev, customTo: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                     </div>
                )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
                <button 
                    onClick={() => setIsPrintModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                    disabled={isPrinting}
                >
                    Cancel
                </button>
                <button 
                    onClick={generatePDF}
                    disabled={isPrinting}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                    {isPrinting ? 'Preparing...' : 'Print Report'}
                </button>
            </div>
          </div>
        </div>
      )}


      {/* Filters Section (Main View) */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search Truck Plate..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-2">Quick Range</label>
            <div className="flex gap-2 flex-wrap">
              {(['yesterday', 'today', 'tomorrow', 'this-week', 'this-month', 'this-year', 'custom'] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => handleRangeChange(range)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors capitalize ${dateRange === range ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {range.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
        {dateRange === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm text-gray-700 mb-2">From Date</label>
              <input type="date" value={customDateFrom} onChange={(e) => { setCustomDateFrom(e.target.value); setCurrentPage(1); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">To Date</label>
              <input type="date" value={customDateTo} onChange={(e) => { setCustomDateTo(e.target.value); setCurrentPage(1); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full divide-y divide-gray-200 border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <ThSortable label="Cluster" columnKey="clusterName" className="min-w-[180px]" />
                <ThSortable label="Customer Name" columnKey="customerName" className="min-w-[250px]" />
                <ThSortable label="Driver" columnKey="driver" className="min-w-[200px]" />
                <ThSortable label="Truck Plate" columnKey="truckPlate" className="min-w-[150px]" />
                <ThSortable label="Fulfilled" columnKey="fulfilled" align="right" className="min-w-[120px]" />
                <ThSortable label="Not Fulfilled" columnKey="notFulfilled" align="right" className="min-w-[120px]" />
                <ThSortable label="W/ Returns" columnKey="fulfilledWithReturns" align="right" className="min-w-[120px]" />
                <ThSortable label="W/ Concerns" columnKey="fulfilledWithConcerns" align="right" className="min-w-[120px]" />
                <ThSortable label="Total" columnKey="total" align="right" className="min-w-[120px]" />
              </tr>
            </thead>
            
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                 Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                     <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                     <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                     <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                     <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                     <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                     <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                     <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                     <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                     <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                  </tr>
                 ))
              ) : error ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-red-500">{error}</td></tr>
              ) : flattenedData.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-500">No records found.</td></tr>
              ) : (
                flattenedData.map((row, index) => {
                  // Rowspan Logic for Cluster
                  const isFirstRowOfCluster = index === 0 || row.clusterName !== flattenedData[index - 1].clusterName;
                  let clusterRowSpan = 0;
                  if (isFirstRowOfCluster) {
                      for (let j = index; j < flattenedData.length; j++) {
                          if (flattenedData[j].clusterName === row.clusterName) {
                              clusterRowSpan++;
                          } else {
                              break;
                          }
                      }
                  }

                  return (
                    <tr key={`${row.truckPlate}-${index}`} className="hover:bg-gray-50">
                      {isFirstRowOfCluster && (
                        <td rowSpan={clusterRowSpan} className="px-6 py-4 align-top bg-white border-r border-gray-200">
                          <div className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            {row.clusterName}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="text-sm text-gray-900 whitespace-nowrap">
                          {row.customerName}
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="text-sm text-gray-900 whitespace-nowrap">
                          {row.driver}
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="text-sm font-medium text-gray-900 whitespace-nowrap">
                          {row.truckPlate}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right border-r border-gray-200 text-sm text-green-700 whitespace-nowrap">
                        {row.fulfilled > 0 ? formatCurrency(row.fulfilled) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right border-r border-gray-200 text-sm text-red-700 whitespace-nowrap">
                        {row.notFulfilled > 0 ? formatCurrency(row.notFulfilled) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right border-r border-gray-200 text-sm text-orange-700 whitespace-nowrap">
                        {row.fulfilledWithReturns > 0 ? formatCurrency(row.fulfilledWithReturns) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right border-r border-gray-200 text-sm text-yellow-700 whitespace-nowrap">
                        {row.fulfilledWithConcerns > 0 ? formatCurrency(row.fulfilledWithConcerns) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 whitespace-nowrap">
                        {formatCurrency(row.rowTotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between items-center">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={loading || currentPage === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md disabled:opacity-50 bg-white hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </button>
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
               {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
               Page {currentPage} of {totalPages || 1}
            </span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={loading || currentPage === totalPages || totalPages === 0} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md disabled:opacity-50 bg-white hover:bg-gray-50">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}