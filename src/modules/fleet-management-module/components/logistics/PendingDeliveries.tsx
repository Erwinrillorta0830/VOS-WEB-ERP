import { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, Filter, Package, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

// --- Types ---

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
}

interface ApiSalesOrder {
  order_id: number;
  order_no: string;
  customer_code: string;
  order_status: string;
  total_amount: number;
  order_date: string;
}

// --- View Model Types ---

type DeliveryStatus = string;
type DateRange = 'this-week' | 'this-month' | 'this-year' | 'custom';

interface ClusterItem {
  id: string;
  customer: string;
  status: DeliveryStatus;
  totalPerCustomer: number;
  orderDate: string;
}

interface ClusterGroup {
  clusterId: string;
  clusterName: string;
  clusterTotal: number;
  items: ClusterItem[];
}

export function PendingDeliveries() {
  // --- State ---
  const [data, setData] = useState<ClusterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  
  // Date Range
  const [dateRange, setDateRange] = useState<DateRange>('this-month');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [clustersPerPage] = useState(5);

  // --- Helpers ---

  const getStatusColor = (status: string) => {
    const normalized = status?.toLowerCase() || '';
    if (normalized.includes('approval')) return 'bg-purple-100 text-purple-800';
    if (normalized.includes('consolidation')) return 'bg-blue-100 text-blue-800';
    if (normalized.includes('picking')) return 'bg-cyan-100 text-cyan-800';
    if (normalized.includes('invoicing')) return 'bg-yellow-100 text-yellow-800';
    if (normalized.includes('loading')) return 'bg-orange-100 text-orange-800';
    if (normalized.includes('shipping')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isDateInRange = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateRange === 'custom') {
      if (!customDateFrom || !customDateTo) return true;
      const from = new Date(customDateFrom);
      const to = new Date(customDateTo);
      return date >= from && date <= to;
    }

    if (dateRange === 'this-week') {
      const dayOfWeek = startOfToday.getDay(); 
      const diff = startOfToday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(startOfToday.setDate(diff));
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
        const [clustersRes, customersRes, ordersRes] = await Promise.all([
            fetch('http://100.126.246.124:8060/items/cluster?limit=-1'),
            fetch('http://100.126.246.124:8060/items/customer?limit=-1'),
            fetch('http://100.126.246.124:8060/items/sales_order?limit=-1')
        ]);

        const clustersData: { data: ApiCluster[] } = await clustersRes.json();
        const customersData: { data: ApiCustomer[] } = await customersRes.json();
        const ordersData: { data: ApiSalesOrder[] } = await ordersRes.json();

        // --- AGGRESSIVE FILTERING LOGIC (UPDATED) ---
        // Added 'not fulfilled' and 'not_fulfilled' to the ban list
        const bannedTerms = [
            'en route', 
            'en_route', 
            'delivered', 
            'on hold', 
            'on_hold', 
            'cancelled', 
            'no fulfilled', 
            'no_fulfilled',
            'not fulfilled', // Added
            'not_fulfilled'  // Added
        ];

        const validOrders = (ordersData.data || []).filter(order => {
            const rawStatus = order.order_status || '';
            const normalizedStatus = rawStatus.toLowerCase().replace('_', ' ').trim();
            
            // If status matches any banned term, exclude it
            return !bannedTerms.includes(normalizedStatus);
        });

        const clusters = clustersData.data || [];
        const customers = customersData.data || [];

        const customerMap = new Map<string, { name: string, clusterName: string }>();
        customers.forEach(c => {
          const foundCluster = clusters.find(cl => cl.id === c.cluster_id);
          const clusterName = foundCluster ? foundCluster.cluster_name : (c.province || "Unassigned Cluster");
          customerMap.set(c.customer_code, {
            name: c.customer_name,
            clusterName: clusterName
          });
        });

        const tempGroups: Record<string, { clusterTotal: number; items: Record<string, ClusterItem> }> = {};

        validOrders.forEach(order => {
            const custDetails = customerMap.get(order.customer_code);
            const customerName = custDetails ? custDetails.name : `Unknown (${order.customer_code})`;
            const clusterName = custDetails ? custDetails.clusterName : 'Unassigned Cluster';
            
            if (!tempGroups[clusterName]) {
                tempGroups[clusterName] = { clusterTotal: 0, items: {} };
            }

            const itemKey = `${customerName}-${order.order_status}`;

            if (!tempGroups[clusterName].items[itemKey]) {
                tempGroups[clusterName].items[itemKey] = {
                    id: itemKey,
                    customer: customerName,
                    status: order.order_status || 'Pending',
                    totalPerCustomer: 0,
                    orderDate: order.order_date
                };
            }

            tempGroups[clusterName].items[itemKey].totalPerCustomer += order.total_amount;
            tempGroups[clusterName].clusterTotal += order.total_amount;
        });

        const result: ClusterGroup[] = Object.entries(tempGroups).map(([clusterName, groupData]) => ({
            clusterId: clusterName,
            clusterName: clusterName,
            clusterTotal: groupData.clusterTotal,
            items: Object.values(groupData.items)
        }));

        setData(result);
      } catch (err) {
        console.error(err);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- Filter Logic ---
  const filteredData = useMemo(() => {
    return data
      .map(group => {
        const filteredItems = group.items.filter(item => {
            if (!isDateInRange(item.orderDate)) return false;
            
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                group.clusterName.toLowerCase().includes(searchLower) ||
                item.customer.toLowerCase().includes(searchLower) ||
                item.status.toLowerCase().includes(searchLower);

            const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        const newTotal = filteredItems.reduce((sum, item) => sum + item.totalPerCustomer, 0);

        return {
            ...group,
            items: filteredItems,
            clusterTotal: newTotal
        };
      })
      .filter(group => group.items.length > 0);
  }, [data, searchTerm, statusFilter, dateRange, customDateFrom, customDateTo]);

  // --- Pagination ---
  const indexOfLastCluster = currentPage * clustersPerPage;
  const indexOfFirstCluster = indexOfLastCluster - clustersPerPage;
  const currentClusters = filteredData.slice(indexOfFirstCluster, indexOfLastCluster);
  const totalPages = Math.ceil(filteredData.length / clustersPerPage);

  const grandTotal = filteredData.reduce((sum, g) => sum + g.clusterTotal, 0);
  const totalCustomers = filteredData.reduce((sum, g) => sum + g.items.length, 0);

  const availableStatuses = useMemo(() => {
      const statuses = new Set<string>();
      data.forEach(group => group.items.forEach(item => statuses.add(item.status)));
      return Array.from(statuses).sort();
  }, [data]);

  // Reset pagination on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange, statusFilter]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading delivery data...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Delivery Monitor</h1>
        <p className="text-gray-600">Pending deliveries and active cluster tracking</p>
      </div>

      {/* --- Filter & Controls Section --- */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Search & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cluster, Customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">Status</label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="All">All Statuses</option>
                  {availableStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right Column: Date Range */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">Quick Range</label>
            <div className="flex gap-2 flex-wrap">
              {(['this-week', 'this-month', 'this-year', 'custom'] as DateRange[]).map((range) => (
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

        {/* Custom Date Inputs */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* --- Summary Stats Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
         <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Active Clusters</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{filteredData.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                <Layers className="w-6 h-6" />
            </div>
         </div>
         <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Pending Customers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalCustomers}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                <Package className="w-6 h-6" />
            </div>
         </div>
         <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Total Pending Amount</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(grandTotal)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full text-green-600">
                <span className="font-bold text-xl">₱</span>
            </div>
         </div>
      </div>

      {/* --- Table Section --- */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider w-1/5">Cluster</th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider w-1/4">Customer</th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider w-1/6">Status</th>
                <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase tracking-wider w-1/6">Customer Total</th>
                <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase tracking-wider w-1/5 border-l border-gray-200">Cluster Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No pending deliveries found.
                  </td>
                </tr>
              ) : (
                currentClusters.map((group) => (
                  group.items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      
                      {/* Merged Cluster Cell */}
                      {index === 0 && (
                          <td 
                              rowSpan={group.items.length} 
                              className="px-6 py-4 align-top border-r border-gray-100 bg-gray-50/30"
                          >
                              <div className="font-medium text-gray-900">{group.clusterName}</div>
                              <div className="text-xs text-gray-500 mt-1">{group.items.length} customers</div>
                          </td>
                      )}

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.customer}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {item.status}
                          </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 font-mono">
                          {formatCurrency(item.totalPerCustomer)}
                      </td>

                      {/* Merged Cluster Total Cell */}
                      {index === 0 && (
                          <td 
                              rowSpan={group.items.length} 
                              className="px-6 py-4 align-middle text-right border-l border-gray-200 bg-gray-50/20"
                          >
                              <div className="font-bold text-gray-900">{formatCurrency(group.clusterTotal)}</div>
                          </td>
                      )}
                    </tr>
                  ))
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- Pagination Footer --- */}
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </button>
            
            <span className="text-sm font-medium text-gray-700">
               Page {currentPage} of {totalPages || 1}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                currentPage === totalPages || totalPages === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
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