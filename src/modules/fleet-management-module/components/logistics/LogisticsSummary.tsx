import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, ArrowUpDown, Printer } from 'lucide-react';
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

export function LogisticsSummary() {
  const [data, setData] = useState<LogisticsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('this-month');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 50;

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

  // --- API Fetching ---
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

  // --- Handlers ---
  const handleRangeChange = (range: DateRange) => { setDateRange(range); setCurrentPage(1); };
  const handlePageChange = (newPage: number) => { if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage); };
  
  const calculateTotal = (deliveries: DeliveryDetail[]) => 
    deliveries.reduce((sum, d) => sum + d.fulfilled + d.notFulfilled + d.fulfilledWithReturns + d.fulfilledWithConcerns, 0);
  
  // Default formatter for UI (Web) - Keeps the ₱ symbol
  const formatCurrency = (amount: number) => 
    `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // --- Sorting Logic ---
  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    const { key, direction } = sortConfig;
    const sorted = [...data].map(record => ({ ...record, deliveries: [...record.deliveries] }));

    const modifier = direction === 'asc' ? 1 : -1;

    if (key === 'truckPlate' || key === 'driver' || key === 'total') {
        sorted.sort((a, b) => {
            if (key === 'truckPlate') return a.truckPlate.localeCompare(b.truckPlate) * modifier;
            if (key === 'driver') return a.driver.localeCompare(b.driver) * modifier;
            if (key === 'total') return (calculateTotal(a.deliveries) - calculateTotal(b.deliveries)) * modifier;
            return 0;
        });
    } 
    else {
        sorted.forEach(record => {
            record.deliveries.sort((a, b) => {
                if (key === 'clusterName') return a.clusterName.localeCompare(b.clusterName) * modifier;
                if (key === 'customerName') return a.customerName.localeCompare(b.customerName) * modifier;
                if (key === 'fulfilled') return (a.fulfilled - b.fulfilled) * modifier;
                if (key === 'notFulfilled') return (a.notFulfilled - b.notFulfilled) * modifier;
                if (key === 'fulfilledWithReturns') return (a.fulfilledWithReturns - b.fulfilledWithReturns) * modifier;
                if (key === 'fulfilledWithConcerns') return (a.fulfilledWithConcerns - b.fulfilledWithConcerns) * modifier;
                return 0;
            });
        });
    }

    return sorted;
  }, [data, sortConfig]);

  // --- PDF Generation Handler ---
  const handlePrintPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
    const today = new Date();
    const todayStr = today.toLocaleDateString();

    // ** PDF Specific Formatter **
    // Removes the symbol to avoid encoding errors (±) and save space
    const formatCurrencyPdf = (amount: number) => 
        amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Helper to format the period label
    const formatPeriodLabel = () => {
        const now = new Date();
        const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
          "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
        ];
        
        if (dateRange === 'this-month') {
            return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
        } else if (dateRange === 'this-year') {
            return `${now.getFullYear()}`;
        } else if (dateRange === 'yesterday') {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            return `${monthNames[yesterday.getMonth()]} ${yesterday.getDate()}, ${yesterday.getFullYear()}`;
        } else if (dateRange === 'today') {
            return `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
        } else if (dateRange === 'tomorrow') {
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            return `${monthNames[tomorrow.getMonth()]} ${tomorrow.getDate()}, ${tomorrow.getFullYear()}`;
        }
         else {
            return dateRange.replace('-', ' ').toUpperCase();
        }
    };

    // 1. Calculate Summary Stats for Header
    let grandTotalAmount = 0;
    let totalItems = 0;
    const uniqueClusters = new Set<string>();

    sortedData.forEach(record => {
      record.deliveries.forEach(d => {
        const rowTotal = d.fulfilled + d.notFulfilled + d.fulfilledWithReturns + d.fulfilledWithConcerns;
        grandTotalAmount += rowTotal;
        totalItems++;
        if (d.clusterName) uniqueClusters.add(d.clusterName);
      });
    });

    // 2. Draw Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Logistics Summary Report", 14, 15); 

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${formatPeriodLabel()}`, 14, 22);
    doc.text(`Generated: ${todayStr}`, 14, 27);

    // Summary Cards Representation (Simple boxes in PDF)
    const drawCard = (label: string, value: string, x: number) => {
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(x, 10, 50, 20, 2, 2, 'S');
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(label, x + 4, 15);
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text(value, x + 4, 24);
      doc.setFont("helvetica", "normal"); // Reset
    };

    // Draw stats at the top right
    drawCard("Active Clusters", uniqueClusters.size.toString(), 120);
    drawCard("Total Deliveries", totalItems.toString(), 175);
    // Use PDF specific formatter here
    drawCard("Total Amount", formatCurrencyPdf(grandTotalAmount), 230);

    // 3. Prepare Table Data
    const tableColumn = [
      "Cluster", 
      "Customer", 
      "Salesman / Driver", 
      "Truck",
      "Fulfilled", 
      "Not Fulfilled", 
      "Returns", 
      "Concerns",
      "Total"
    ];

    const tableRows: any[] = [];

    sortedData.forEach(record => {
      record.deliveries.forEach(d => {
        const rowTotal = d.fulfilled + d.notFulfilled + d.fulfilledWithReturns + d.fulfilledWithConcerns;
        
        // Use formatCurrencyPdf instead of formatCurrency
        const rowData = [
          d.clusterName,
          d.customerName,
          record.driver,
          record.truckPlate,
          d.fulfilled > 0 ? formatCurrencyPdf(d.fulfilled) : '-',
          d.notFulfilled > 0 ? formatCurrencyPdf(d.notFulfilled) : '-',
          d.fulfilledWithReturns > 0 ? formatCurrencyPdf(d.fulfilledWithReturns) : '-',
          d.fulfilledWithConcerns > 0 ? formatCurrencyPdf(d.fulfilledWithConcerns) : '-',
          formatCurrencyPdf(rowTotal)
        ];
        tableRows.push(rowData);
      });
    });

    // 4. Generate Table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [245, 247, 250], textColor: [80, 80, 80], fontStyle: 'bold', lineWidth: 0.1, lineColor: [200, 200, 200] },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right', fontStyle: 'bold' }
      },
    });

    doc.save(`logistics summary report - ${todayStr.replace(/\//g, '-')}.pdf`);
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
    <div className="p-8">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-semibold">Logistics Summary</h1>
          <p className="text-gray-600">Comprehensive delivery tracking and performance overview</p>
        </div>
        
        {/* Print PDF Button */}
        <button 
          onClick={handlePrintPdf}
          disabled={loading || sortedData.length === 0}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="w-4 h-4" />
          Print PDF
        </button>
      </div>

      {/* Filters Section */}
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
                <ThSortable label="Truck Plate" columnKey="truckPlate" className="min-w-[150px]" />
                <ThSortable label="Driver" columnKey="driver" className="min-w-[200px]" />
                <ThSortable label="Cluster" columnKey="clusterName" className="min-w-[180px]" />
                <ThSortable label="Customer Name" columnKey="customerName" className="min-w-[250px]" />
                <ThSortable label="Total" columnKey="total" align="right" className="min-w-[120px]" />
                <ThSortable label="Fulfilled" columnKey="fulfilled" align="right" className="min-w-[120px]" />
                <ThSortable label="Not Fulfilled" columnKey="notFulfilled" align="right" className="min-w-[120px]" />
                <ThSortable label="W/ Returns" columnKey="fulfilledWithReturns" align="right" className="min-w-[120px]" />
                <ThSortable label="W/ Concerns" columnKey="fulfilledWithConcerns" align="right" className="min-w-[120px]" />
              </tr>
            </thead>
            
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                 Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                    <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                    <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4 border-r"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                  </tr>
                 ))
              ) : error ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-red-500">{error}</td></tr>
              ) : sortedData.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-500">No records found.</td></tr>
              ) : (
                sortedData.map((record) => (
                  record.deliveries.map((delivery, index) => {
                    const isFirstRowOfTruck = index === 0;
                    
                    const isNewCluster = index === 0 || delivery.clusterName !== record.deliveries[index - 1].clusterName;
                    let clusterRowSpan = 0;
                    if (isNewCluster) {
                        for (let j = index; j < record.deliveries.length; j++) {
                            if (record.deliveries[j].clusterName === delivery.clusterName) {
                                clusterRowSpan++;
                            } else {
                                break;
                            }
                        }
                    }

                    return (
                      <tr key={`${record.id}-${index}`} className="hover:bg-gray-50">
                        {isFirstRowOfTruck && (
                          <td rowSpan={record.deliveries.length} className="px-6 py-4 align-top bg-gray-50/50 border-r border-gray-200">
                            <div className="font-medium text-gray-900 whitespace-nowrap">
                              {record.truckPlate}
                            </div>
                          </td>
                        )}
                        {isFirstRowOfTruck && (
                          <td rowSpan={record.deliveries.length} className="px-6 py-4 align-top bg-gray-50/50 border-r border-gray-200">
                            <div className="text-gray-900 whitespace-nowrap">
                              {record.driver}
                            </div>
                          </td>
                        )}
                        {isNewCluster && (
                          <td rowSpan={clusterRowSpan} className="px-6 py-4 align-top border-r border-gray-200 bg-white">
                            <div className="text-sm font-medium text-gray-700 whitespace-nowrap">
                              {delivery.clusterName}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="text-sm text-gray-900 whitespace-nowrap">
                            {delivery.customerName}
                          </div>
                        </td>
                        {isFirstRowOfTruck && (
                          <td rowSpan={record.deliveries.length} className="px-6 py-4 align-top text-right font-bold text-gray-900 border-r border-gray-200 bg-gray-50/50 whitespace-nowrap">
                            {formatCurrency(calculateTotal(record.deliveries))}
                          </td>
                        )}
                        <td className="px-6 py-4 text-right border-r border-gray-200 text-sm text-green-700 whitespace-nowrap">
                          {delivery.fulfilled > 0 ? formatCurrency(delivery.fulfilled) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right border-r border-gray-200 text-sm text-red-700 whitespace-nowrap">
                          {delivery.notFulfilled > 0 ? formatCurrency(delivery.notFulfilled) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right border-r border-gray-200 text-sm text-orange-700 whitespace-nowrap">
                          {delivery.fulfilledWithReturns > 0 ? formatCurrency(delivery.fulfilledWithReturns) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-yellow-700 whitespace-nowrap">
                          {delivery.fulfilledWithConcerns > 0 ? formatCurrency(delivery.fulfilledWithConcerns) : '-'}
                        </td>
                      </tr>
                    );
                  })
                ))
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