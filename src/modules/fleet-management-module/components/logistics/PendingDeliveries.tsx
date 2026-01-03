import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Package, ChevronLeft, ChevronRight, Layers, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Printer, X, Calendar } from 'lucide-react';
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

// --- Print Configuration Interface ---
interface PrintConfig {
    cluster: string;
    salesman: string;
    status: string; // 'All', 'For Approval', 'For Picking', etc.
    dateRange: DateRange;
    customFrom: string;
    customTo: string;
}

export function PendingDeliveries() {
    // --- State ---
    const [rawGroups, setRawGroups] = useState<ClusterGroupRaw[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dashboard Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [salesmanFilter, setSalesmanFilter] = useState<string>('All');
    const [clusterFilter, setClusterFilter] = useState<string>('All');
    const [dateRange, setDateRange] = useState<DateRange>('this-month');
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');

    // Print Modal State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printConfig, setPrintConfig] = useState<PrintConfig>({
        cluster: 'All',
        salesman: 'All',
        status: 'All',
        dateRange: 'this-month',
        customFrom: '',
        customTo: ''
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50);

    // Sorting
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    // --- Helpers ---

    const formatCurrency = (amount: number) => {
        if (amount === 0) return '-';
        return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatTotalCurrency = (amount: number) => {
        return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatNumberForPDF = (amount: number) => {
        if (amount === 0) return '-';
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Generic Date Logic (Used by both Dashboard and Print)
    const checkDateRange = (dateString: string, range: DateRange, customFrom?: string, customTo?: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (range === 'custom') {
            if (!customFrom || !customTo) return true;
            const from = new Date(customFrom);
            const to = new Date(customTo);
            return date >= from && date <= to;
        }

        if (range === 'today') return targetDate.getTime() === startOfToday.getTime();
        if (range === 'yesterday') {
            const yesterday = new Date(startOfToday);
            yesterday.setDate(yesterday.getDate() - 1);
            return targetDate.getTime() === yesterday.getTime();
        }
        if (range === 'this-week') {
            const dayOfWeek = startOfToday.getDay();
            const diff = startOfToday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const startOfWeek = new Date(startOfToday);
            startOfWeek.setDate(diff);
            return date >= startOfWeek;
        }
        if (range === 'this-month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        if (range === 'this-year') return date.getFullYear() === now.getFullYear();
        return true;
    };

    // --- Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Mock data fetch - replace with your actual API call
                const res = await fetch('/api/pending-deliveries');
                if (!res.ok) throw new Error('Failed to fetch data');
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

    // --- Flattening Logic (Reusable) ---
    // We create a function so we can use it for Dashboard (view) and Print (pdf) separately
    const getFlattenedRows = (
        data: ClusterGroupRaw[],
        filters: { cluster: string, salesman: string, search?: string, status?: string },
        dateSettings: { range: DateRange, from: string, to: string }
    ) => {
        const rows: TableRow[] = [];
        const searchLower = (filters.search || '').toLowerCase();

        data.forEach(group => {
            if (filters.cluster !== 'All' && group.clusterName !== filters.cluster) return;

            let clusterTotal = 0;
            const groupRows: TableRow[] = [];

            group.customers.forEach(customer => {
                const filteredOrders = customer.orders.filter(o => {
                    // Date Filter
                    if (!checkDateRange(o.order_date, dateSettings.range, dateSettings.from, dateSettings.to)) return false;

                    // Salesman Filter
                    if (filters.salesman !== 'All' && customer.salesmanName !== filters.salesman) return false;

                    // Status Filter (Specific to Print usually, but logic holds)
                    // If filter.status is provided and not 'All', we strictly match it
                    if (filters.status && filters.status !== 'All') {
                        const orderStatusLower = (o.order_status || '').toLowerCase();
                        // Mapping simple dropdown values to string inclusion
                        const target = filters.status.toLowerCase().replace('for ', ''); // e.g., "For Picking" -> "picking"
                        if (!orderStatusLower.includes(target)) return false;
                    }

                    // Search Filter (Dashboard only usually)
                    if (filters.search) {
                         return customer.customerName.toLowerCase().includes(searchLower) ||
                                customer.salesmanName.toLowerCase().includes(searchLower);
                    }
                    return true;
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

        // Apply Sorting (default by cluster then customer)
        // Note: For PDF we usually just want them grouped by cluster
        return rows;
    };

    // Dashboard Data
    const tableRows = useMemo(() => {
        return getFlattenedRows(
            rawGroups,
            { cluster: clusterFilter, salesman: salesmanFilter, search: searchTerm },
            { range: dateRange, from: customDateFrom, to: customDateTo }
        );
    }, [rawGroups, searchTerm, salesmanFilter, clusterFilter, dateRange, customDateFrom, customDateTo]);

    // Sorting Logic
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

    // --- PDF GENERATION LOGIC ---
    const executePrint = () => {
        // 1. Get Data specific to the Print Configuration
        // Note: We ignore the search term for printing as per typical requirements, unless specified otherwise
        const printRows = getFlattenedRows(
            rawGroups,
            { cluster: printConfig.cluster, salesman: printConfig.salesman, status: printConfig.status },
            { range: printConfig.dateRange, from: printConfig.customFrom, to: printConfig.customTo }
        );

        const doc = new jsPDF('l', 'mm', 'a4');

        // 2. Header Info
        const dateLabel = printConfig.dateRange === 'custom' 
            ? `${printConfig.customFrom} to ${printConfig.customTo}` 
            : printConfig.dateRange.replace('-', ' ').toUpperCase();
            
        doc.setFontSize(14);
        doc.text("Delivery Monitor Report", 14, 15);
        doc.setFontSize(10);
        doc.text(`Period: ${dateLabel}`, 14, 22);
        
        // Add Filter Context to Header
        let filterText = `Cluster: ${printConfig.cluster} | Salesman: ${printConfig.salesman} | Status: ${printConfig.status}`;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(filterText, 14, 27);
        doc.setTextColor(0);

        // 3. Calculate Stats for Printed Data
        const grandTotal = printRows.reduce((sum, r) => sum + r.amount, 0);
        const totalOrders = printRows.length;
        const uniqueClusters = new Set(printRows.map(r => r.clusterName)).size;

        // 4. Draw Cards
        const startX = 80;
        const startY = 10;
        const cardWidth = 65;
        const cardHeight = 22;
        const gap = 5;

        const drawCard = (x: number, title: string, value: string, iconColor: [number, number, number]) => {
            doc.setDrawColor(220, 220, 220);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'FD');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(title, x + 4, startY + 7);
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.text(value, x + 4, startY + 17);
            doc.setFont("helvetica", "normal");
            doc.setFillColor(...iconColor);
            doc.circle(x + cardWidth - 8, startY + 11, 4, 'F');
        };

        drawCard(startX, "Active Clusters", uniqueClusters.toString(), [219, 234, 254]);
        drawCard(startX + cardWidth + gap, "Pending Orders", totalOrders.toString(), [243, 232, 255]);
        drawCard(startX + (cardWidth + gap) * 2, "Total Pending Amount", `P ${formatNumberForPDF(grandTotal)}`, [220, 252, 231]);

        // 5. Dynamic Columns Logic
        // Base Columns
        let tableHeader = ["Cluster", "Customer", "Salesman", "Date"];
        
        // Dynamic Status Columns
        const statusMap = [
            { label: "Approval", key: "approval" as keyof TableRow },
            { label: "Conso", key: "consolidation" as keyof TableRow },
            { label: "Picking", key: "picking" as keyof TableRow },
            { label: "Invoicing", key: "invoicing" as keyof TableRow },
            { label: "Loading", key: "loading" as keyof TableRow },
            { label: "Shipping", key: "shipping" as keyof TableRow },
        ];

        let activeStatusKeys: (keyof TableRow)[] = [];

        if (printConfig.status === 'All') {
            // Show all
            tableHeader.push(...statusMap.map(s => s.label));
            activeStatusKeys = statusMap.map(s => s.key);
        } else {
            // Show only the selected status
            // Normalize "For Picking" -> "Picking"
            const selectedLabel = printConfig.status.replace('For ', '');
            const found = statusMap.find(s => s.label.toLowerCase() === selectedLabel.toLowerCase() || s.label.toLowerCase().includes(selectedLabel.toLowerCase()));
            
            if (found) {
                tableHeader.push(found.label);
                activeStatusKeys = [found.key];
            } else {
                // Fallback if mismatch, show all
                tableHeader.push(...statusMap.map(s => s.label));
                activeStatusKeys = statusMap.map(s => s.key);
            }
        }

        // Add Totals
        tableHeader.push("Total", "Cluster Total");

        // 6. Map Data to Dynamic Columns
        const tableRowsData = printRows.map(row => {
            const rowData = [
                row.clusterName,
                row.customerName,
                row.salesmanName,
                formatDate(row.orderDate)
            ];

            // Add value for active status columns
            activeStatusKeys.forEach(key => {
                rowData.push(formatNumberForPDF(row[key] as number));
            });

            // Add Totals
            rowData.push(formatNumberForPDF(row.amount));
            rowData.push(formatNumberForPDF(row.clusterTotal)); // We need to recalculate cluster total based on filtered rows if strictly needed, but usually cluster total reflects the group context. 
            // Note: In flattened logic above, row.clusterTotal IS calculated based on the filtered group. So this is correct.

            return rowData;
        });

        // 7. Define Column Styles Dynamically
        const baseColStyles: any = {
            0: { cellWidth: 25 },
            3: { cellWidth: 15, halign: 'center' }
        };
        
        // Determine index where status columns start (Index 4)
        let colIndex = 4;
        activeStatusKeys.forEach(() => {
            baseColStyles[colIndex] = { halign: 'right' };
            colIndex++;
        });
        // Total Column
        baseColStyles[colIndex] = { halign: 'right', fontStyle: 'bold' };
        // Cluster Total Column
        baseColStyles[colIndex + 1] = { halign: 'right', fontStyle: 'bold', fillColor: [249, 250, 251] };


        // 8. Generate Table
        autoTable(doc, {
            head: [tableHeader],
            body: tableRowsData,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1, halign: 'left' },
            headStyles: { fillColor: [243, 244, 246], textColor: [20, 20, 20], fontStyle: 'bold' },
            columnStyles: baseColStyles
        });

        // 9. Cluster Summary at Bottom
        // Re-calculate summary based on Print Rows
        const clusterTotals: Record<string, number> = {};
        printRows.forEach(row => {
            if (!clusterTotals[row.clusterName]) clusterTotals[row.clusterName] = 0;
            // To avoid adding the same order multiple times if uniqueId is not unique in list? 
            // flattened rows are unique orders.
            clusterTotals[row.clusterName] += row.amount;
        });
        
        // Fix: The clusterTotals logic in flattened list sums every row. 
        // We need to sum uniquely? No, amount is per row. So simple sum is fine.
        // However, the object logic above: `clusterTotals[row.clusterName] += row.amount` is correct for a flat list of orders.
        // BUT `clusterTotal` in row object is the group total. 
        
        // We will rebuild summary from scratch based on `printRows`
        const summaryMap = new Map<string, number>();
        printRows.forEach(r => {
             const current = summaryMap.get(r.clusterName) || 0;
             summaryMap.set(r.clusterName, current + r.amount);
        });

        const summaryData = Array.from(summaryMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([name, total]) => [name, formatNumberForPDF(total)]);
            
        let finalY = (doc as any).lastAutoTable.finalY || 50;
        if (finalY > 160) {
            doc.addPage();
            finalY = 20;
        } else {
            finalY += 10;
        }

        doc.setFontSize(10);
        doc.text("Cluster Summary", 14, finalY);

        autoTable(doc, {
            head: [['Cluster Name', 'Total Amount']],
            body: summaryData,
            startY: finalY + 5,
            theme: 'grid',
            tableWidth: 90,
            margin: { left: 14 },
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
            columnStyles: { 1: { halign: 'right' } },
            didDrawPage: (data) => {
                if (data.pageCount === data.pageNumber) {
                    const grandTotalStartY = data.cursor.y + 5;
                    autoTable(doc, {
                        body: [['GRAND TOTAL', formatNumberForPDF(grandTotal)]],
                        startY: grandTotalStartY,
                        theme: 'grid',
                        tableWidth: 80,
                        margin: { left: 120 },
                        styles: { fontSize: 10, cellPadding: 3, fontStyle: 'bold', valign: 'middle' },
                        columnStyles: {
                            0: { fillColor: [229, 231, 235], cellWidth: 40 },
                            1: { halign: 'right', cellWidth: 40 }
                        }
                    });
                }
            }
        });

        doc.save(`delivery_monitor_print.pdf`);
        setIsPrintModalOpen(false);
    };

    // --- Pagination & Spans ---
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

    // Available Statuses (Hardcoded or derived)
    const availableStatuses = ['For Approval', 'For Conso', 'For Picking', 'For Invoicing', 'For Loading', 'For Shipping'];

    useEffect(() => { setCurrentPage(1); }, [searchTerm, dateRange, salesmanFilter, clusterFilter]);
    const handlePageChange = (newPage: number) => { if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage); };
    const handleSort = (key: keyof TableRow) => {
        let direction: SortDirection = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

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
        <div className="p-8 relative">
            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h1 className="text-gray-900 text-2xl font-bold mb-1">Delivery Monitor</h1><p className="text-gray-600">Pending deliveries matrix</p></div>
                <button onClick={() => setIsPrintModalOpen(true)} className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-colors font-medium text-sm">
                    <Printer className="w-4 h-4 mr-2" /> Print PDF
                </button>
            </div>

            {/* Dashboard Filters */}
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

            {/* Print Modal */}
            {isPrintModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" 
                style={{ backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">What needs to be printed?</h3>
                            <button onClick={() => setIsPrintModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5"/></button>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            {/* Filters Row 1 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cluster</label>
                                    <select 
                                        value={printConfig.cluster} 
                                        onChange={(e) => setPrintConfig({...printConfig, cluster: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="All">All Clusters</option>
                                        {availableClusters.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Salesman</label>
                                    <select 
                                        value={printConfig.salesman} 
                                        onChange={(e) => setPrintConfig({...printConfig, salesman: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="All">All Salesmen</option>
                                        {availableSalesmen.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                                <select 
                                    value={printConfig.status} 
                                    onChange={(e) => setPrintConfig({...printConfig, status: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="All">All Statuses (Full Matrix)</option>
                                    {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <p className="text-xs text-gray-400 mt-1">If a specific status is selected, only that column will be printed.</p>
                            </div>

                            {/* Date Range */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date Range</label>
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    {(['today', 'this-week', 'this-month', 'custom'] as DateRange[]).map((range) => (
                                        <button 
                                            key={range} 
                                            onClick={() => setPrintConfig({...printConfig, dateRange: range})}
                                            className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${printConfig.dateRange === range ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            {range === 'custom' ? 'Custom' : range.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </button>
                                    ))}
                                </div>
                                {printConfig.dateRange === 'custom' && (
                                    <div className="flex gap-3 bg-gray-50 p-3 rounded-md border border-gray-200">
                                        <div className="flex-1">
                                            <span className="text-[10px] uppercase text-gray-400 font-bold">From</span>
                                            <input type="date" value={printConfig.customFrom} onChange={(e) => setPrintConfig({...printConfig, customFrom: e.target.value})} className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm" />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-[10px] uppercase text-gray-400 font-bold">To</span>
                                            <input type="date" value={printConfig.customTo} onChange={(e) => setPrintConfig({...printConfig, customTo: e.target.value})} className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setIsPrintModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
                            <button onClick={executePrint} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm flex items-center">
                                <Printer className="w-4 h-4 mr-2"/> Print Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Active Clusters</p><p className="text-2xl font-bold text-gray-900 mt-1">{loading ? <span className="animate-pulse bg-gray-200 rounded h-8 w-12 inline-block"></span> : new Set(tableRows.map(r => r.clusterName)).size}</p></div><div className="p-3 bg-blue-50 rounded-full text-blue-600"><Layers className="w-6 h-6" /></div></div>
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Pending Orders</p><p className="text-2xl font-bold text-gray-900 mt-1">{loading ? <span className="animate-pulse bg-gray-200 rounded h-8 w-12 inline-block"></span> : tableRows.length}</p></div><div className="p-3 bg-purple-50 rounded-full text-purple-600"><Package className="w-6 h-6" /></div></div>
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Total Pending Amount</p><p className="text-2xl font-bold text-gray-900 mt-1">{loading ? <span className="animate-pulse bg-gray-200 rounded h-8 w-24 inline-block"></span> : formatTotalCurrency(tableRows.reduce((acc, r) => acc + r.amount, 0))}</p></div><div className="p-3 bg-green-50 rounded-full text-green-600"><span className="font-bold text-xl">₱</span></div></div>
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