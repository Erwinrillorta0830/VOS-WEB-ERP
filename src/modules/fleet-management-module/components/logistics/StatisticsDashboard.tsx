import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Package, XCircle, CheckCircle, PhilippinePeso, Calendar, Loader2
} from 'lucide-react';

// --- TYPESCRIPT INTERFACES ---
interface DeliveryStatusCount {
  name: string;
  value: number;
  color: string;
}

interface ChartEntry {
  name: string;
  sales: number;
  'Fulfilled': number;
  'Not Fulfilled': number;
  'Fulfilled With Concerns': number;
  'Fulfilled With Returns': number;
}

interface DashboardData {
    chartData: ChartEntry[];
    deliveryStatusCounts: DeliveryStatusCount[];
    totalSales: number;
    avgSales: number;
}

const COLORS = ['#10b981', '#f59e0b', '#facc15', '#ef4444']; 

export function StatisticsDashboard() {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<DashboardData>({
      chartData: [],
      deliveryStatusCounts: [],
      totalSales: 0,
      avgSales: 0
  });

  // Filter State
  const [filterType, setFilterType] = useState<'thisWeek' | 'thisMonth' | 'thisYear' | 'custom'>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // --- HELPER: Calculate Date Range for API ---
  const getDateRangeParams = () => {
      const now = new Date();
      let start = new Date();
      let end = new Date();
      let viewType = 'day'; 

      const formatDate = (d: Date) => d.toISOString().split('T')[0]; // YYYY-MM-DD

      if (filterType === 'thisWeek') {
          const day = now.getDay(); 
          const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday start? or Sunday.
          start.setDate(diff);
          end.setDate(start.getDate() + 6);
          viewType = 'day';
      } else if (filterType === 'thisMonth') {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          viewType = 'day';
      } else if (filterType === 'thisYear') {
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear(), 11, 31);
          viewType = 'month'; // Important: We tell server to group by Month
      } else if (filterType === 'custom' && customStartDate && customEndDate) {
          return { start: customStartDate, end: customEndDate, viewType: 'day' };
      }

      return { start: formatDate(start), end: formatDate(end), viewType };
  };

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      const { start, end, viewType } = getDateRangeParams();
      
      // If custom date is selected but not filled yet, don't fetch
      if (filterType === 'custom' && (!start || !end)) return;

      try {
        setLoading(true);
        
        // Use the new API route
        const response = await fetch(`/api/statistics-deliveries?startDate=${start}&endDate=${end}&viewType=${viewType}`);
        
        if (!response.ok) throw new Error("Failed to fetch statistics");
        
        const result = await response.json();
        setData(result);

      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filterType, customStartDate, customEndDate]);

  // --- DERIVED METRICS ---
  const { deliveryStatusCounts, chartData, totalSales, avgSales } = data;

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
          <p className="text-gray-600">Overview of delivery performance and sales</p>
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
          <p className="text-gray-900 text-2xl font-bold mt-1">
             {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : deliveryStatusCounts[0]?.value || 0}
          </p>
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
          <p className="text-gray-900 text-2xl font-bold mt-1">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : deliveryStatusCounts[1]?.value || 0}
          </p>
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
          <p className="text-gray-900 text-2xl font-bold mt-1">
             {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : issuesCount}
          </p>
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
              ? <Loader2 className="w-5 h-5 animate-spin" />
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
          {loading ? (
             <div className="h-[300px] flex items-center justify-center text-gray-400">Loading...</div>
          ) : deliveryStatusCounts.length === 0 ? (
             <div className="h-[300px] flex items-center justify-center text-gray-400">No Data</div>
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

        {/* DELIVERY TRENDS BAR CHART */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-900 font-semibold">Delivery Trends</h3>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">
               Grouped by: {filterType === 'thisYear' ? 'Month' : 'Day'}
            </span>
          </div>

          {loading ? (
             <div className="h-[300px] flex items-center justify-center text-gray-400">Loading...</div>
          ) : (
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
                
                <Bar dataKey="Fulfilled" fill="#10b981" name="Fulfilled" stackId="a" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Not Fulfilled" fill="#f59e0b" name="Not Fulfilled" stackId="a" />
                <Bar dataKey="Fulfilled With Concerns" fill="#facc15" name="With Concerns" stackId="a" />
                <Bar dataKey="Fulfilled With Returns" fill="#ef4444" name="With Returns" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* SALES TREND BAR CHART */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-gray-900 font-semibold mb-6">Sales Revenue Trend</h3>
        {loading ? (
             <div className="h-[300px] flex items-center justify-center text-gray-400">Loading...</div>
        ) : (
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
        )}
      </div>

    </div>
  );
}