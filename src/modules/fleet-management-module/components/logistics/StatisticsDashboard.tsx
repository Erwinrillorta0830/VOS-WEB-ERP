import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Package, 
  XCircle, 
  CheckCircle, 
  PhilippinePeso,
  Calendar
} from 'lucide-react';

// --- TYPESCRIPT INTERFACES ---

interface DeliveryItem {
  id: number;
  invoice_id: number | string | null;
  status: string;
  // Add other fields if needed, but these are the ones we rely on
}

interface SalesItem {
  id: number | string;
  invoice_id: number | string | null;
  dispatch_date: string | null;
  total_amount: string | number | null;
  discount_amount: string | number | null;
}

interface ChartEntry {
  name: string;
  sortIndex: number;
  'Fulfilled': number;
  'Not Fulfilled': number;
  'Fulfilled With Concerns': number;
  'Fulfilled With Returns': number;
  sales: number;
  [key: string]: string | number; // Allow index access for dynamic keys
}

interface DeliveryStatusCount {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['#10b981', '#f59e0b', '#facc15', '#ef4444']; 

export function StatisticsDashboard() {
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  
  // Typed State for API Data
  const [rawDeliveryItems, setRawDeliveryItems] = useState<DeliveryItem[]>([]);
  const [rawSalesItems, setRawSalesItems] = useState<SalesItem[]>([]);

  // Filter State
  const [filterType, setFilterType] = useState<'thisWeek' | 'thisMonth' | 'thisYear' | 'custom'>('thisYear'); 
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // --- 1. WATERFALL STRATEGY HELPER (GENERIC) ---
  const fetchFullList = async <T,>(baseUrl: string, name: string, setProgress: (msg: string) => void): Promise<T[]> => {
    let allItems: T[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      setProgress(`Fetching ${name}... (${allItems.length} records)`);
      
      const response = await fetch(`${baseUrl}&limit=${limit}&page=${page}`);
      const json = await response.json();
      const items: T[] = json.data || json;

      if (Array.isArray(items) && items.length > 0) {
        allItems = [...allItems, ...items];
        if (items.length < limit) hasMore = false; 
        else page++;
      } else {
        hasMore = false;
      }
    }
    return allItems;
  };

  // --- 2. FETCH DATA ON MOUNT ---
  useEffect(() => {
    const initFetch = async () => {
      try {
        setLoading(true);

        // Run both waterfalls in parallel
        const [deliveries, sales] = await Promise.all([
          fetchFullList<DeliveryItem>('http://100.126.246.124:8060/items/post_dispatch_invoices?fields=*', 'Deliveries', setLoadingStatus),
          fetchFullList<SalesItem>('http://100.126.246.124:8060/items/sales_invoice?fields=*', 'Sales', setLoadingStatus)
        ]);

        setRawDeliveryItems(deliveries);
        setRawSalesItems(sales);

      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    initFetch();
  }, []);

  // --- 3. PROCESS & FILTER DATA ---
  const { chartData, deliveryStatusCounts, totalSales, avgSales } = useMemo(() => {
    if (rawDeliveryItems.length === 0 || rawSalesItems.length === 0) {
      return { 
        chartData: [], 
        deliveryStatusCounts: [], 
        totalSales: 0, 
        avgSales: 0 
      };
    }

    // A. Map Sales for Fast Lookup (ID -> Sale Object)
    const salesMap = new Map<string, SalesItem>();
    rawSalesItems.forEach(sale => {
      if (sale.id) salesMap.set(String(sale.id), sale);
      if (sale.invoice_id) salesMap.set(String(sale.invoice_id), sale);
    });

    // B. Determine Date Range
    const now = new Date();
    let start = new Date('2000-01-01');
    let end = new Date();
    const isYearView = filterType === 'thisYear';

    if (filterType === 'thisWeek') {
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0,0,0,0);
      end = now;
    } else if (filterType === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (filterType === 'thisYear') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } else if (filterType === 'custom' && customStartDate && customEndDate) {
      start = new Date(customStartDate);
      end = new Date(customEndDate);
      end.setHours(23, 59, 59);
    }

    // C. Initialize Aggregators
    // We use a strictly typed object for counts to avoid "implicitly any" errors
    let counts: Record<string, number> = {
      'Fulfilled': 0,
      'Not Fulfilled': 0,
      'Fulfilled With Concerns': 0,
      'Fulfilled With Returns': 0
    };
    
    let salesSum = 0;
    const groupMap = new Map<string, ChartEntry>();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // D. Loop Through Deliveries
    rawDeliveryItems.forEach(item => {
      const status = item.status;
      
      // 1. Find Matching Sale to get DATE and AMOUNT
      const lookupId = String(item.invoice_id);
      const matchingSale = salesMap.get(lookupId);

      // If no sale found or no date, we can't plot it on the timeline
      if (!matchingSale || !matchingSale.dispatch_date) return;

      const date = new Date(matchingSale.dispatch_date);
      
      // Date Filter Check
      if (date < start || date > end) return;

      // 2. Aggregate Global Counts
      if (Object.prototype.hasOwnProperty.call(counts, status)) {
        counts[status]++;
      }

      // 3. Aggregate Sales (Total - Discount)
      const validStatuses = ['Fulfilled', 'Fulfilled With Returns', 'Fulfilled With Concerns'];
      let netAmount = 0;
      
      if (validStatuses.includes(status)) {
        const total = Number(matchingSale.total_amount) || 0;
        const discount = Number(matchingSale.discount_amount) || 0;
        netAmount = total - discount;
        salesSum += netAmount;
      }

      // 4. Group for Charts (Month vs Day)
      let key: string;
      let sortIndex: number;
      
      if (isYearView) {
        key = monthNames[date.getMonth()];
        sortIndex = date.getMonth();
      } else {
        key = date.getDate().toString();
        sortIndex = date.getDate();
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, { 
          name: key, 
          sortIndex, 
          'Fulfilled': 0, 
          'Not Fulfilled': 0, 
          'Fulfilled With Concerns': 0, 
          'Fulfilled With Returns': 0,
          sales: 0 
        });
      }

      const entry = groupMap.get(key)!;
      
      // Safe Update using Type Assertion or Index Signature
      if (Object.prototype.hasOwnProperty.call(entry, status)) {
         // We cast to any here purely because we know the keys match the status strings
         (entry as any)[status]++;
      }
      
      entry.sales += netAmount;
    });

    // Sort Chart Data
    const sortedChartData = Array.from(groupMap.values()).sort((a, b) => a.sortIndex - b.sortIndex);
    
    // Status Counts for Pie
    const finalCounts: DeliveryStatusCount[] = [
      { name: 'Fulfilled', value: counts['Fulfilled'], color: COLORS[0] },
      { name: 'Not Fulfilled', value: counts['Not Fulfilled'], color: COLORS[1] },
      { name: 'Fulfilled With Concerns', value: counts['Fulfilled With Concerns'], color: COLORS[2] },
      { name: 'Fulfilled With Returns', value: counts['Fulfilled With Returns'], color: COLORS[3] },
    ];

    const totalDeliveries = Object.values(counts).reduce((a, b) => a + b, 0);
    const calculatedAvg = totalDeliveries > 0 ? salesSum / totalDeliveries : 0;

    return { 
      chartData: sortedChartData, 
      deliveryStatusCounts: finalCounts, 
      totalSales: salesSum, 
      avgSales: calculatedAvg 
    };

  }, [rawDeliveryItems, rawSalesItems, filterType, customStartDate, customEndDate]);


  // --- UI RENDER HELPERS ---
  const fulfillmentRate = deliveryStatusCounts && deliveryStatusCounts.length > 0 
    ? ((deliveryStatusCounts[0].value / (deliveryStatusCounts.reduce((a,b) => a + b.value, 0) || 1)) * 100).toFixed(1)
    : "0.0";

  const issuesCount = (deliveryStatusCounts?.[2]?.value || 0) + (deliveryStatusCounts?.[3]?.value || 0);

  return (
    <div className="p-8">
      {/* Header & Controls */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-gray-900 mb-1 text-2xl font-semibold">Statistics Dashboard</h1>
          <div className="flex items-center gap-2">
            <p className="text-gray-600">Overview of delivery performance and sales</p>
            {loading && (
              <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded animate-pulse">
                {loadingStatus}
              </span>
            )}
          </div>
        </div>

        {/* Global Filter */}
        <div className="flex flex-wrap gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
          <Calendar className="w-4 h-4 text-gray-500 ml-2" />
          {(['thisWeek', 'thisMonth', 'thisYear'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filterType === type
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type.replace('this', 'This ')}
            </button>
          ))}
          <div className="h-6 w-px bg-gray-300 mx-1"></div>
          <div className="flex gap-2 items-center">
             <input 
               type="date" 
               className="text-xs border border-gray-300 rounded px-2 py-1.5 outline-none"
               value={customStartDate}
               onChange={(e) => { setCustomStartDate(e.target.value); setFilterType('custom'); }}
             />
             <span className="text-gray-400">-</span>
             <input 
               type="date" 
               className="text-xs border border-gray-300 rounded px-2 py-1.5 outline-none"
               value={customEndDate}
               onChange={(e) => { setCustomEndDate(e.target.value); setFilterType('custom'); }}
             />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Fulfilled */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-gray-500 text-sm font-medium">Fulfilled Deliveries</p>
          <p className="text-gray-900 text-2xl font-bold mt-1">{loading ? "..." : deliveryStatusCounts[0]?.value}</p>
          <p className="text-xs text-green-600 mt-2 font-medium bg-green-50 inline-block px-2 py-0.5 rounded">
            {fulfillmentRate}% rate
          </p>
        </div>

        {/* Not Fulfilled */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-gray-500 text-sm font-medium">Not Fulfilled</p>
          <p className="text-gray-900 text-2xl font-bold mt-1">{loading ? "..." : deliveryStatusCounts[1]?.value}</p>
          <p className="text-xs text-amber-600 mt-2 font-medium">Pending completion</p>
        </div>

        {/* Issues */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-gray-500 text-sm font-medium">Concerns & Returns</p>
          <p className="text-gray-900 text-2xl font-bold mt-1">{loading ? "..." : issuesCount}</p>
          <p className="text-xs text-red-600 mt-2 font-medium">Requires attention</p>
        </div>

        {/* Total Sales */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <PhilippinePeso className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-500 text-sm font-medium">Total Sales (Net)</p>
          <p className="text-gray-900 text-2xl font-bold mt-1">
            {loading 
              ? "..." 
              : `₱${totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Avg: ₱{loading ? "..." : avgSales.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / order
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* PIE CHART */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-900 font-semibold mb-6">Status Distribution</h3>
          {loading || deliveryStatusCounts.length === 0 ? (
             <div className="h-[300px] flex items-center justify-center text-gray-400">Loading or No Data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deliveryStatusCounts}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {deliveryStatusCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                {deliveryStatusCounts.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                    <span className="text-sm text-gray-600 font-medium">{item.name}</span>
                    <span className="text-sm text-gray-400">({item.value})</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* DELIVERY TRENDS BAR CHART - Updated with 4 Statuses */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-900 font-semibold">Delivery Trends</h3>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">
               Grouped by: {filterType === 'thisYear' ? 'Month' : 'Day'}
            </span>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 12}} 
                dy={10}
              />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
              
              {/* The 4 Requested Statuses */}
              <Bar dataKey="Fulfilled" fill="#10b981" name="Fulfilled" stackId="a" radius={[0, 0, 4, 4]} />
              <Bar dataKey="Not Fulfilled" fill="#f59e0b" name="Not Fulfilled" stackId="a" />
              <Bar dataKey="Fulfilled With Concerns" fill="#facc15" name="With Concerns" stackId="a" />
              <Bar dataKey="Fulfilled With Returns" fill="#ef4444" name="With Returns" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SALES TREND BAR CHART */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-gray-900 font-semibold mb-6">Sales Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#64748b', fontSize: 12}} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#64748b', fontSize: 12}} 
              tickFormatter={(value) => `₱${(value/1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Sales']}
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="sales" fill="#3b82f6" name="Net Sales" radius={[4, 4, 0, 0]} maxBarSize={50} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}