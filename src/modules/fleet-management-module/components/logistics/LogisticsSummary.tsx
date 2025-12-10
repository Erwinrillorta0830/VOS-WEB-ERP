import { useState, useEffect } from 'react';
import { Search, Truck, User, MapPin, Building, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

// --- Interfaces ---
interface ApiPlan { id: number; driver_id: number; vehicle_id: number; status: string; date_encoded: string; }
interface ApiDispatchInvoice { id: number; post_dispatch_plan_id: number; invoice_id: number; status: string; }
interface ApiInvoice { invoice_id: number; invoice_no: string; customer_code: string; total_amount: number | string; }
interface ApiCustomer { customer_code: string; customer_name: string; city: string; }
interface ApiReturn { invoice_no: string; total_amount: string; }
interface ApiConcern { sales_invoice_id: number; variance_amount: number; }
interface ApiUser { user_id: number; user_fname: string; user_lname: string; }
interface ApiVehicle { vehicle_id: number; vehicle_plate: string; }
interface ApiAreaCluster { id: number; cluster_id: number; city: string; province: string; }
interface ApiCluster { id: number; cluster_name: string; }

interface DeliveryDetail {
    clusterName: string;
    customerName: string;
    fulfilled: number; notFulfilled: number;
    fulfilledWithReturns: number; fulfilledWithConcerns: number;
}
interface LogisticsRecord {
    id: string; truckPlate: string; driver: string; deliveries: DeliveryDetail[];
}

type DateRange = 'yesterday' | 'today' | 'tomorrow' | 'this-week' | 'this-month' | 'this-year' | 'custom';

export function LogisticsSummary() {
    const [data, setData] = useState<LogisticsRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState<DateRange>('this-month');
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const ITEMS_PER_PAGE = 4;

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

        if (dateRange === 'today') {
            const todayStr = formatDate(now);
            return `${todayStr},${todayStr}T23:59:59`;
        }
        if (dateRange === 'yesterday') {
            start.setDate(now.getDate() - 1);
            const yestStr = formatDate(start);
            return `${yestStr},${yestStr}T23:59:59`;
        }
        if (dateRange === 'tomorrow') {
            start.setDate(now.getDate() + 1);
            const tomStr = formatDate(start);
            return `${tomStr},${tomStr}T23:59:59`;
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
            return `${customDateFrom},${customDateTo}T23:59:59`;
        }

        return `${formatDate(start)},${formatDate(end)}T23:59:59`;
    };

    useEffect(() => {
        const fetchWaterfallData = async () => {
            try {
                setLoading(true);
                setError('');

                const fetchJson = async (url: string) => {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`Fetch failed: ${url}`);
                    return await res.json();
                };

                // --- STEP 1: Fetch Plans ---
                let plansUrl = `http://100.126.246.124:8060/items/post_dispatch_plan?limit=${ITEMS_PER_PAGE}&page=${currentPage}&meta=*`;

                if (searchTerm) {
                    plansUrl += `&filter[vehicle_id][vehicle_plate][_contains]=${searchTerm}`;
                }

                const dateFilter = getDateFilterString();
                if (dateFilter) {
                    plansUrl += `&filter[date_encoded][_between]=${dateFilter}`;
                }

                const plansRes = await fetchJson(plansUrl);
                const plans = plansRes.data as ApiPlan[];

                if (plansRes.meta?.filter_count) {
                    setTotalPages(Math.ceil(plansRes.meta.filter_count / ITEMS_PER_PAGE));
                } else {
                    setTotalPages(plans.length > 0 ? 1 : 0);
                }

                if (plans.length === 0) {
                    setData([]);
                    setLoading(false);
                    return;
                }

                // IDs
                const planIds = plans.map(p => p.id).join(',');
                const driverIds = [...new Set(plans.map(p => p.driver_id))].join(',');
                const vehicleIds = [...new Set(plans.map(p => p.vehicle_id))].join(',');

                // --- STEP 2: Fetch Links ---
                const [dispatchInvoicesRes, usersRes, vehiclesRes] = await Promise.all([
                    fetchJson(`http://100.126.246.124:8060/items/post_dispatch_invoices?filter[post_dispatch_plan_id][_in]=${planIds}&limit=-1`),
                    fetchJson(`http://100.126.246.124:8060/items/user?filter[user_id][_in]=${driverIds}&limit=-1`),
                    fetchJson(`http://100.126.246.124:8060/items/vehicles?filter[vehicle_id][_in]=${vehicleIds}&limit=-1`)
                ]);

                const dispatchInvoices = dispatchInvoicesRes.data as ApiDispatchInvoice[];
                const invoiceIds = [...new Set(dispatchInvoices.map(d => d.invoice_id))];

                // --- STEP 3: Fetch Invoices & Details ---
                let invoices: ApiInvoice[] = [];
                let customers: ApiCustomer[] = [];
                let returns: ApiReturn[] = [];
                let concerns: ApiConcern[] = [];
                let areaClusters: ApiAreaCluster[] = [];
                let clusters: ApiCluster[] = [];

                if (invoiceIds.length > 0) {
                    const invoiceIdsStr = invoiceIds.join(',');
                    const invoicesRes = await fetchJson(`http://100.126.246.124:8060/items/sales_invoice?filter[invoice_id][_in]=${invoiceIdsStr}&limit=-1`);
                    invoices = invoicesRes.data;

                    const invoiceNos = invoices.map(i => i.invoice_no);
                    const customerCodes = [...new Set(invoices.map(i => i.customer_code))];

                    const promises = [];

                    if (invoiceNos.length > 0) {
                        const invNoStr = invoiceNos.map(n => encodeURIComponent(n)).join(',');
                        promises.push(fetchJson(`http://100.126.246.124:8060/items/sales_return?filter[invoice_no][_in]=${invNoStr}&limit=-1`));
                    } else { promises.push(Promise.resolve({ data: [] })); }

                    if (invoiceIdsStr) {
                        promises.push(fetchJson(`http://100.126.246.124:8060/items/unfulfilled_sales_transaction?filter[sales_invoice_id][_in]=${invoiceIdsStr}&limit=-1`));
                    } else { promises.push(Promise.resolve({ data: [] })); }

                    if (customerCodes.length > 0) {
                        const custCodeStr = customerCodes.map(c => encodeURIComponent(c)).join(',');
                        promises.push(fetchJson(`http://100.126.246.124:8060/items/customer?filter[customer_code][_in]=${custCodeStr}&limit=-1`));
                    } else { promises.push(Promise.resolve({ data: [] })); }

                    const results = await Promise.all(promises);

                    returns = results[0].data;
                    concerns = results[1].data;
                    customers = results[2]?.data || [];

                    // --- STEP 3.5: Fetch Clusters ---
                    const uniqueCities = [...new Set(customers.map(c => c.city).filter(Boolean))];

                    if (uniqueCities.length > 0) {
                        const cityFilter = uniqueCities.map(c => encodeURIComponent(c)).join(',');
                        const areasRes = await fetchJson(`http://100.126.246.124:8060/items/area_per_cluster?filter[city][_in]=${cityFilter}&limit=-1`);
                        areaClusters = areasRes.data;

                        const clusterIds = [...new Set(areaClusters.map(a => a.cluster_id))];
                        if (clusterIds.length > 0) {
                            const clusterRes = await fetchJson(`http://100.126.246.124:8060/items/cluster?filter[id][_in]=${clusterIds.join(',')}&limit=-1`);
                            clusters = clusterRes.data;
                        }
                    }
                }

                // --- STEP 4: Build Maps ---
                const driversMap = new Map((usersRes.data as ApiUser[]).map(u => [u.user_id, `${u.user_fname} ${u.user_lname}`]));
                const vehiclesMap = new Map((vehiclesRes.data as ApiVehicle[]).map(v => [v.vehicle_id, v.vehicle_plate]));
                const invoicesMap = new Map(invoices.map(i => [i.invoice_id, i]));
                const customersMap = new Map(customers.map(c => [c.customer_code, c]));
                const returnsMap = new Map(returns.map(r => [r.invoice_no, parseFloat(r.total_amount || '0')]));
                const concernsMap = new Map(concerns.map(c => [c.sales_invoice_id, c.variance_amount]));

                const cityToClusterIdMap = new Map<string, number>();
                areaClusters.forEach(area => cityToClusterIdMap.set(area.city.toUpperCase(), area.cluster_id));
                const clusterIdToNameMap = new Map<number, string>();
                clusters.forEach(cl => clusterIdToNameMap.set(cl.id, cl.cluster_name));

                const getClusterName = (city: string) => {
                    if (!city) return 'Unassigned';
                    const cId = cityToClusterIdMap.get(city.toUpperCase());
                    if (cId) return clusterIdToNameMap.get(cId) || 'Unassigned';
                    return 'Unassigned';
                };

                const planInvoicesMap = new Map<number, ApiDispatchInvoice[]>();
                dispatchInvoices.forEach(di => {
                    const current = planInvoicesMap.get(di.post_dispatch_plan_id) || [];
                    current.push(di);
                    planInvoicesMap.set(di.post_dispatch_plan_id, current);
                });

                const processedData = plans.map(plan => {
                    const planDispatches = planInvoicesMap.get(plan.id) || [];

                    const deliveries = planDispatches.map(dispatchItem => {
                        const invoice = invoicesMap.get(dispatchItem.invoice_id);
                        const customer = invoice ? customersMap.get(invoice.customer_code) : null;

                        let fulfilled = 0, notFulfilled = 0, fulfilledWithReturns = 0, fulfilledWithConcerns = 0;

                        if (invoice) {
                            const invTotal = typeof invoice.total_amount === 'string' ? parseFloat(invoice.total_amount) : invoice.total_amount;
                            const invNo = invoice.invoice_no;

                            if (dispatchItem.status === 'Not Fulfilled') notFulfilled = invTotal;
                            else if (returnsMap.has(invNo)) fulfilledWithReturns = invTotal - (returnsMap.get(invNo) || 0);
                            else if (concernsMap.has(invoice.invoice_id)) fulfilledWithConcerns = invTotal - (concernsMap.get(invoice.invoice_id) || 0);
                            else fulfilled = invTotal;
                        }

                        const city = customer?.city || '';
                        return {
                            clusterName: getClusterName(city),
                            customerName: customer?.customer_name || 'Unknown Customer',
                            fulfilled, notFulfilled, fulfilledWithReturns, fulfilledWithConcerns
                        };
                    });

                    // Sort by Cluster Name for proper row grouping
                    deliveries.sort((a, b) => a.clusterName.localeCompare(b.clusterName));

                    if (deliveries.length === 0) return null;

                    return {
                        id: plan.id.toString(),
                        truckPlate: vehiclesMap.get(plan.vehicle_id) || 'Unknown Plate',
                        driver: driversMap.get(plan.driver_id) || 'Unknown Driver',
                        deliveries: deliveries
                    };
                }).filter((item): item is LogisticsRecord => item !== null);

                setData(processedData);
                setLoading(false);

            } catch (err: any) {
                console.error("Error fetching data:", err);
                setError(err.message || 'An error occurred');
                setLoading(false);
            }
        };

        fetchWaterfallData();
    }, [currentPage, searchTerm, dateRange, customDateFrom, customDateTo]);

    // --- Handlers ---
    const handleRangeChange = (range: DateRange) => { setDateRange(range); setCurrentPage(1); };
    const handlePageChange = (newPage: number) => { if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage); };
    const calculateTotal = (deliveries: DeliveryDetail[]) =>
        deliveries.reduce((sum, d) => sum + d.fulfilled + d.notFulfilled + d.fulfilledWithReturns + d.fulfilledWithConcerns, 0);
    const formatCurrency = (amount: number) =>
        `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-gray-900 mb-2">Logistics Summary</h1>
                <p className="text-gray-600">Comprehensive delivery tracking and performance overview</p>
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

            {/* Results Table - WITH HORIZONTAL SCROLL */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    {/* Added min-w-[1200px] to force horizontal scrolling on smaller screens */}
                    <table className="min-w-[1200px] w-full divide-y divide-gray-200 border-collapse">
                        <thead className="bg-gray-50">
                        <tr>
                            {/* Fixed widths applied to columns to ensure they don't squeeze */}
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase border-r border-gray-200 min-w-[150px]">Truck Plate</th>
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase border-r border-gray-200 min-w-[200px]">Driver</th>
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase border-r border-gray-200 min-w-[180px]">Cluster</th>
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase border-r border-gray-200 min-w-[250px]">Customer Name</th>
                            <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase border-r border-gray-200 min-w-[120px]">Total</th>
                            <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase border-r border-gray-200 min-w-[120px]">Fulfilled</th>
                            <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase border-r border-gray-200 min-w-[120px]">Not Fulfilled</th>
                            <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase border-r border-gray-200 min-w-[120px]">W/ Returns</th>
                            <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase min-w-[120px]">W/ Concerns</th>
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
                        ) : data.length === 0 ? (
                            <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-500">No records found.</td></tr>
                        ) : (
                            data.map((record) => (
                                record.deliveries.map((delivery, index) => {
                                    // Logic for rowSpan calculations
                                    const isFirstRowOfTruck = index === 0;

                                    // Cluster Grouping Logic
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
                                            {/* Truck Plate (Spans all deliveries) */}
                                            {isFirstRowOfTruck && (
                                                <td rowSpan={record.deliveries.length} className="px-6 py-4 align-top bg-gray-50/50 border-r border-gray-200">
                                                    <div className="flex items-center font-medium text-gray-900 whitespace-nowrap">
                                                        <Truck className="w-4 h-4 text-gray-400 mr-2" />
                                                        {record.truckPlate}
                                                    </div>
                                                </td>
                                            )}

                                            {/* Driver (Spans all deliveries) */}
                                            {isFirstRowOfTruck && (
                                                <td rowSpan={record.deliveries.length} className="px-6 py-4 align-top bg-gray-50/50 border-r border-gray-200">
                                                    <div className="flex items-center text-gray-900 whitespace-nowrap">
                                                        <User className="w-4 h-4 text-gray-400 mr-2" />
                                                        {record.driver}
                                                    </div>
                                                </td>
                                            )}

                                            {/* Cluster (Spans clustered group) */}
                                            {isNewCluster && (
                                                <td rowSpan={clusterRowSpan} className="px-6 py-4 align-top border-r border-gray-200 bg-white">
                                                    <div className="flex items-center text-sm">
                                                        <MapPin className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
                                                        <span className="font-medium text-gray-700 whitespace-nowrap">{delivery.clusterName}</span>
                                                    </div>
                                                </td>
                                            )}

                                            {/* Customer (Never spans) */}
                                            <td className="px-6 py-4 border-r border-gray-200">
                                                <div className="flex items-center text-sm">
                                                    <Building className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
                                                    <span className="text-gray-900 whitespace-nowrap">{delivery.customerName}</span>
                                                </div>
                                            </td>

                                            {/* Total (Spans all deliveries to show truck total once) */}
                                            {isFirstRowOfTruck && (
                                                <td rowSpan={record.deliveries.length} className="px-6 py-4 align-top text-right font-bold text-gray-900 border-r border-gray-200 bg-gray-50/50 whitespace-nowrap">
                                                    {formatCurrency(calculateTotal(record.deliveries))}
                                                </td>
                                            )}

                                            {/* Individual Amounts */}
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
