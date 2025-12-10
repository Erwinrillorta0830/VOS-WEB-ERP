import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Package, ChevronLeft, ChevronRight, Layers, Loader2 } from 'lucide-react';

// --- API Interfaces ---

interface ApiCluster {
    id: number;
    cluster_name: string;
}

interface ApiCustomer {
    id: number;
    customer_code: string;
    customer_name: string;
    cluster_id?: number;
    province?: string;
    city?: string;
}

interface ApiSalesman {
    id: number;
    salesman_name: string;
    salesman_code: string;
}

interface ApiSalesOrder {
    order_id: number;
    order_no: string;
    customer_code: string;
    order_status: string;
    total_amount: number;
    order_date: string;
    salesman_id: number;
}

interface ApiAreaPerCluster {
    id: number;
    cluster_id: number;
    province: string;
    city: string;
}

// --- View Model Types ---

type DateRange = 'yesterday' | 'today' | 'tomorrow' | 'this-week' | 'this-month' | 'this-year' | 'custom';

interface CustomerRow {
    id: string;
    customerName: string;
    salesmanName: string;
    orders: ApiSalesOrder[];
}

interface ClusterGroup {
    clusterId: string;
    clusterName: string;
    customers: CustomerRow[];
}

interface CalculatedRow {
    id: string;
    customerName: string;
    salesmanName: string;
    approval: number;
    consolidation: number;
    picking: number;
    invoicing: number;
    loading: number;
    shipping: number;
    customerTotal: number;
}

interface CalculatedCluster {
    clusterName: string;
    clusterTotal: number;
    rows: CalculatedRow[];
}

export function PendingDeliveries() {
    // --- State ---
    const [rawGroups, setRawGroups] = useState<ClusterGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [salesmanFilter, setSalesmanFilter] = useState<string>('All');

    // Date Range
    const [dateRange, setDateRange] = useState<DateRange>('this-month');
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [clustersPerPage] = useState(5);

    // --- Helpers ---

    const formatCurrency = (amount: number) => {
        if (amount === 0) return '-';
        return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatTotalCurrency = (amount: number) => {
        return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

        if (dateRange === 'tomorrow') {
            const tomorrow = new Date(startOfToday);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return targetDate.getTime() === tomorrow.getTime();
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

    // --- Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [clustersRes, customersRes, ordersRes, salesmanRes, areaRes] = await Promise.all([
                    fetch('http://100.126.246.124:8060/items/cluster?limit=-1'),
                    fetch('http://100.126.246.124:8060/items/customer?limit=-1'),
                    fetch('http://100.126.246.124:8060/items/sales_order?limit=-1'),
                    fetch('http://100.126.246.124:8060/items/salesman?limit=-1'),
                    fetch('http://100.126.246.124:8060/items/area_per_cluster?limit=-1')
                ]);

                const clustersData: { data: ApiCluster[] } = await clustersRes.json();
                const customersData: { data: ApiCustomer[] } = await customersRes.json();
                const ordersData: { data: ApiSalesOrder[] } = await ordersRes.json();
                const salesmanData: { data: ApiSalesman[] } = await salesmanRes.json();
                const areaData: { data: ApiAreaPerCluster[] } = await areaRes.json();

                // 1. Filter Invalid Orders
                const bannedTerms = [
                    'en route', 'en_route', 'delivered', 'on hold', 'on_hold',
                    'cancelled', 'no fulfilled', 'no_fulfilled', 'not fulfilled', 'not_fulfilled'
                ];
                const validOrders = (ordersData.data || []).filter(order => {
                    const rawStatus = order.order_status || '';
                    const normalizedStatus = rawStatus.toLowerCase().replace('_', ' ').trim();
                    return !bannedTerms.includes(normalizedStatus);
                });

                // 2. Maps
                const clusters = clustersData.data || [];
                const customers = customersData.data || [];
                const salesmen = salesmanData.data || [];
                const areas = areaData.data || [];

                const areaMap = new Map<string, number>();
                areas.forEach(area => {
                    if (area.city && area.province) {
                        const key = `${area.city.trim().toLowerCase()}|${area.province.trim().toLowerCase()}`;
                        areaMap.set(key, area.cluster_id);
                    }
                });

                const salesmanMap = new Map<number, string>();
                salesmen.forEach(s => {
                    salesmanMap.set(s.id, s.salesman_name);
                });

                const customerMap = new Map<string, { name: string, clusterName: string }>();
                customers.forEach(c => {
                    let finalClusterId: number | undefined;
                    if (c.city && c.province) {
                        const geoKey = `${c.city.trim().toLowerCase()}|${c.province.trim().toLowerCase()}`;
                        finalClusterId = areaMap.get(geoKey);
                    }
                    if (!finalClusterId) finalClusterId = c.cluster_id;

                    const foundCluster = clusters.find(cl => cl.id === finalClusterId);
                    const clusterName = foundCluster ? foundCluster.cluster_name : (c.province || "Unassigned Cluster");

                    customerMap.set(c.customer_code, {
                        name: c.customer_name,
                        clusterName: clusterName
                    });
                });

                // 3. Grouping: Cluster -> Customer -> Orders
                const tempGroups: Record<string, { customers: Record<string, CustomerRow> }> = {};

                validOrders.forEach(order => {
                    const custDetails = customerMap.get(order.customer_code);
                    const customerName = custDetails ? custDetails.name : `Unknown (${order.customer_code})`;
                    const clusterName = custDetails ? custDetails.clusterName : 'Unassigned Cluster';

                    if (!tempGroups[clusterName]) {
                        tempGroups[clusterName] = { customers: {} };
                    }

                    const customerKey = order.customer_code;

                    if (!tempGroups[clusterName].customers[customerKey]) {
                        const salesmanName = salesmanMap.get(order.salesman_id) || 'Unknown Salesman';
                        tempGroups[clusterName].customers[customerKey] = {
                            id: customerKey,
                            customerName: customerName,
                            salesmanName: salesmanName,
                            orders: []
                        };
                    }

                    tempGroups[clusterName].customers[customerKey].orders.push(order);
                });

                const result: ClusterGroup[] = Object.entries(tempGroups).map(([clusterName, groupData]) => ({
                    clusterId: clusterName,
                    clusterName: clusterName,
                    customers: Object.values(groupData.customers)
                }));

                setRawGroups(result);
            } catch (err) {
                console.error(err);
                setError("Failed to load data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // --- The Pivot Logic (useMemo) ---
    const pivotData = useMemo(() => {
        const processed: CalculatedCluster[] = [];

        rawGroups.forEach(group => {
            let clusterTotal = 0;
            const validRows: CalculatedRow[] = [];

            group.customers.forEach(customer => {
                const filteredOrders = customer.orders.filter(o => isDateInRange(o.order_date));

                if (filteredOrders.length === 0) return;

                const searchLower = searchTerm.toLowerCase();
                const matchesSearch =
                    group.clusterName.toLowerCase().includes(searchLower) ||
                    customer.customerName.toLowerCase().includes(searchLower) ||
                    customer.salesmanName.toLowerCase().includes(searchLower);

                const matchesSalesman = salesmanFilter === 'All' || customer.salesmanName === salesmanFilter;

                if (!matchesSearch || !matchesSalesman) return;

                let row: CalculatedRow = {
                    id: customer.id,
                    customerName: customer.customerName,
                    salesmanName: customer.salesmanName,
                    approval: 0,
                    consolidation: 0,
                    picking: 0,
                    invoicing: 0,
                    loading: 0,
                    shipping: 0,
                    customerTotal: 0
                };

                filteredOrders.forEach(o => {
                    const status = (o.order_status || '').toLowerCase();
                    const amt = o.total_amount;

                    if (status.includes('approval')) row.approval += amt;
                    else if (status.includes('consolidation')) row.consolidation += amt;
                    else if (status.includes('picking')) row.picking += amt;
                    else if (status.includes('invoicing')) row.invoicing += amt;
                    else if (status.includes('loading')) row.loading += amt;
                    else if (status.includes('shipping')) row.shipping += amt;

                    row.customerTotal += amt;
                });

                clusterTotal += row.customerTotal;
                validRows.push(row);
            });

            if (validRows.length > 0) {
                processed.push({
                    clusterName: group.clusterName,
                    clusterTotal: clusterTotal,
                    rows: validRows
                });
            }
        });

        return processed;
    }, [rawGroups, searchTerm, salesmanFilter, dateRange, customDateFrom, customDateTo]);

    // --- Pagination ---
    const indexOfLastCluster = currentPage * clustersPerPage;
    const indexOfFirstCluster = indexOfLastCluster - clustersPerPage;
    const currentClusters = pivotData.slice(indexOfFirstCluster, indexOfLastCluster);
    const totalPages = Math.ceil(pivotData.length / clustersPerPage);

    const grandTotal = pivotData.reduce((sum, g) => sum + g.clusterTotal, 0);
    const totalCustomers = pivotData.reduce((sum, g) => sum + g.rows.length, 0);

    const availableSalesmen = useMemo(() => {
        const salesmen = new Set<string>();
        rawGroups.forEach(group => group.customers.forEach(c => salesmen.add(c.salesmanName)));
        return Array.from(salesmen).sort();
    }, [rawGroups]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateRange, salesmanFilter]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-gray-900 mb-2">Delivery Monitor</h1>
                <p className="text-gray-600">Pending deliveries matrix</p>
            </div>

            {/* --- Filters --- */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-700 mb-2">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Cluster, Customer, Salesman..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
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
                                    {availableSalesmen.map(salesman => (
                                        <option key={salesman} value={salesman}>{salesman}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-700 mb-2">Quick Range</label>
                        <div className="flex gap-2 flex-wrap">
                            {(['yesterday', 'today', 'tomorrow', 'this-week', 'this-month', 'this-year', 'custom'] as DateRange[]).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    className={`px-4 py-2 rounded-lg text-sm transition-colors capitalize ${
                                        dateRange === range
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
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
                            <label className="block text-sm text-gray-700 mb-2">From</label>
                            <input type="date" value={customDateFrom} onChange={(e) => setCustomDateFrom(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 mb-2">To</label>
                            <input type="date" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                    </div>
                )}
            </div>

            {/* --- Stats --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Active Clusters</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                            {loading ? <span className="animate-pulse bg-gray-200 rounded h-8 w-12 inline-block"></span> : pivotData.length}
                        </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600"><Layers className="w-6 h-6" /></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pending Customers</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                            {loading ? <span className="animate-pulse bg-gray-200 rounded h-8 w-12 inline-block"></span> : totalCustomers}
                        </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-full text-purple-600"><Package className="w-6 h-6" /></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Pending Amount</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                            {loading ? <span className="animate-pulse bg-gray-200 rounded h-8 w-24 inline-block"></span> : formatTotalCurrency(grandTotal)}
                        </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-full text-green-600"><span className="font-bold text-xl">₱</span></div>
                </div>
            </div>

            {/* --- Matrix Table --- */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <tr>
                            <th className="px-4 py-3 text-left bg-gray-100 border-r border-gray-200">Cluster</th>
                            <th className="px-4 py-3 text-left">Customer</th>
                            <th className="px-4 py-3 text-left">Salesman</th>
                            <th className="px-4 py-3 text-right text-purple-700 bg-purple-50">For Approval</th>
                            <th className="px-4 py-3 text-right text-blue-700 bg-blue-50">For Conso</th>
                            <th className="px-4 py-3 text-right text-cyan-700 bg-cyan-50">For Picking</th>
                            <th className="px-4 py-3 text-right text-yellow-700 bg-yellow-50">For Invoicing</th>
                            <th className="px-4 py-3 text-right text-orange-700 bg-orange-50">For Loading</th>
                            <th className="px-4 py-3 text-right text-green-700 bg-green-50">For Shipping</th>
                            <th className="px-4 py-3 text-right font-bold border-l border-gray-200">Cust. Total</th>
                            <th className="px-4 py-3 text-right font-bold border-l border-gray-200 bg-gray-100">Cluster Total</th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan={11} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                                        <p>Loading delivery data...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr><td colSpan={11} className="px-6 py-12 text-center text-red-500">{error}</td></tr>
                        ) : pivotData.length === 0 ? (
                            <tr><td colSpan={11} className="px-6 py-12 text-center text-gray-500">No pending deliveries found.</td></tr>
                        ) : (
                            currentClusters.map((group) => (
                                group.rows.map((row, index) => (
                                    <tr key={row.id} className="hover:bg-gray-50">

                                        {/* Merged Cluster Name - Restored to Standard Gray Background */}
                                        {index === 0 && (
                                            <td
                                                rowSpan={group.rows.length}
                                                className="px-4 py-4 align-top border-r border-gray-200 bg-gray-50 font-medium text-gray-900"
                                            >
                                                {group.clusterName}
                                                <div className="text-xs text-gray-500 font-normal mt-1">{group.rows.length} customers</div>
                                            </td>
                                        )}

                                        <td className="px-4 py-4 whitespace-nowrap text-gray-900">{row.customerName}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-gray-600 text-xs">{row.salesmanName}</td>

                                        {/* Status Buckets - TEXT COLOR ONLY */}
                                        <td className="px-4 py-4 text-right font-mono text-purple-700">{formatCurrency(row.approval)}</td>
                                        <td className="px-4 py-4 text-right font-mono text-blue-700">{formatCurrency(row.consolidation)}</td>
                                        <td className="px-4 py-4 text-right font-mono text-cyan-700">{formatCurrency(row.picking)}</td>
                                        <td className="px-4 py-4 text-right font-mono text-yellow-700">{formatCurrency(row.invoicing)}</td>
                                        <td className="px-4 py-4 text-right font-mono text-orange-700">{formatCurrency(row.loading)}</td>
                                        <td className="px-4 py-4 text-right font-mono text-green-700">{formatCurrency(row.shipping)}</td>

                                        <td className="px-4 py-4 text-right font-bold text-gray-900 border-l border-gray-200">{formatTotalCurrency(row.customerTotal)}</td>

                                        {index === 0 && (
                                            <td rowSpan={group.rows.length} className="px-4 py-4 align-middle text-right font-bold text-gray-900 border-l border-gray-200 bg-gray-100">
                                                {formatTotalCurrency(group.clusterTotal)}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                {/* --- Pagination --- */}
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between items-center">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                        </button>
                        <span className="text-sm font-medium text-gray-700">Page {currentPage} of {totalPages || 1}</span>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0 || loading}
                            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === totalPages || totalPages === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
