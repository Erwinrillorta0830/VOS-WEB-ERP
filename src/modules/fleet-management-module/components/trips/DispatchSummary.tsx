import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Eye, TrendingUp, TrendingDown, Clock, CheckCircle, Calendar, Filter, Loader2, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CreateDispatchPlanModal } from './CreateDispatchPlanModal'; // Ensure this path is correct

// --- Type Definitions ---
interface CustomerTransaction {
  id: string; 
  customerName: string; 
  address: string; 
  itemsOrdered: string; 
  amount: number; 
  status: string;
}

export interface DispatchPlan {
  id: string;
  dpNumber: string;
  driverId: string;
  driverName: string;
  salesmanId: string;
  salesmanName: string;
  vehicleId: string;
  vehiclePlateNo: string;
  startingPoint: string;
  timeOfDispatch: string | null;
  timeOfArrival: string | null;
  estimatedDispatch: string;
  estimatedArrival: string;
  customerTransactions: CustomerTransaction[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

// --- Static Modals ---
const ViewDispatchPlanModal = ({ plan, onClose }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="p-6 bg-white shadow-xl rounded-lg w-96 relative">
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-500">✕</button>
          <h3 className="font-bold mb-2">View Plan: {plan.dpNumber}</h3>
          <p>Driver: {plan.driverName}</p>
          <p>Status: {plan.status}</p>
      </div>
  </div>
);

// --- Helper: 12-Hour Time Formatter ---
const formatDateTime = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  const localString = dateString.replace('Z', ''); 
  const date = new Date(localString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleString('en-US', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true 
  });
};

// --- DispatchSummary Component ---

export function DispatchSummary() {
  const [dispatchPlans, setDispatchPlans] = useState<DispatchPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State for Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DispatchPlan | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- Main Table Filters State ---
  const [dateFilter, setDateFilter] = useState<string>('All Time');
  const [statusFilter, setStatusFilter] = useState<string>('All Statuses');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // --- Print Modal State ---
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDriver, setPrintDriver] = useState('All Drivers');
  const [printSalesman, setPrintSalesman] = useState('All Salesmen');
  const [printVehicle, setPrintVehicle] = useState('All Vehicles');
  const [printStatus, setPrintStatus] = useState('All Statuses (Full Matrix)');
  const [printDateRange, setPrintDateRange] = useState('This Month');
  const [printCustomStart, setPrintCustomStart] = useState('');
  const [printCustomEnd, setPrintCustomEnd] = useState('');

  // --- Data Loading with AbortController ---
  const loadData = useCallback(async () => {
    const controller = new AbortController();
    const signal = controller.signal;

    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/dispatch-summary', { signal });
      if (!res.ok) throw new Error("Failed to fetch dispatch plans");
      const json = await res.json();
      setDispatchPlans(json.data || []);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error("Failed to load data:", e);
        setDispatchPlans([]); 
        setError((e as Error).message);
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const cleanup = loadData();
    return () => { if(typeof cleanup === 'object' && cleanup !== null) (cleanup as any)(); };
  }, [loadData]);

  // --- Handlers ---
  const handleCreatePlan = (newPlan: DispatchPlan) => { setDispatchPlans([...dispatchPlans, newPlan]); };
  const handleUpdatePlan = (updatedPlan: DispatchPlan) => {
    setDispatchPlans(dispatchPlans.map(plan => plan.id === updatedPlan.id ? updatedPlan : plan));
  };
  const handleView = (plan: DispatchPlan) => { setSelectedPlan(plan); setIsViewModalOpen(true); };
  const handleModalClose = () => { setIsViewModalOpen(false); setSelectedPlan(null); };

  const getStatusCategory = (apiStatus: string) => {
    if (!apiStatus) return 'Other';
    const status = apiStatus; 
    switch (status) {
      case 'Approved': case 'For Dispatch': return 'For Dispatch';
      case 'For Inbound': case 'Dispatched': case 'Inbound': case 'In Transit': return 'For Inbound'; 
      case 'Arrived': case 'For Clearance': return 'For Clearance';
      case 'Posted': return 'For Approval'; 
      case 'Cleared': case 'Completed': return 'Completed'; 
      default: return 'Other';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const category = getStatusCategory(status);
    const statusMap: Record<string, string> = {
      'For Approval': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'For Dispatch': 'bg-blue-100 text-blue-800 border-blue-200',
      'For Inbound': 'bg-purple-100 text-purple-800 border-purple-200',
      'For Clearance': 'bg-pink-100 text-pink-800 border-pink-200',
      'Completed': 'bg-green-100 text-green-800 border-green-200',
      'Other': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return statusMap[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Base list of ALL "Active" plans
  const visibleTablePlans = useMemo(() => dispatchPlans.filter(plan => {
    const category = getStatusCategory(plan.status);
    return category === 'For Dispatch' || category === 'For Inbound' || category === 'For Clearance';
  }), [dispatchPlans]);

  // --- Unique Lists for Dropdowns ---
  const uniqueDrivers = useMemo(() => Array.from(new Set(visibleTablePlans.map(p => p.driverName).filter(Boolean))), [visibleTablePlans]);
  const uniqueSalesmen = useMemo(() => Array.from(new Set(visibleTablePlans.map(p => p.salesmanName).filter(Boolean))), [visibleTablePlans]);
  const uniqueVehicles = useMemo(() => Array.from(new Set(visibleTablePlans.map(p => p.vehiclePlateNo).filter(Boolean))), [visibleTablePlans]);
  const uniqueStatuses = useMemo(() => Array.from(new Set(visibleTablePlans.map(p => p.status).filter(Boolean))), [visibleTablePlans]);

  // --- FILTERED TABLE DATA LOGIC ---
  const filteredTableData = useMemo(() => {
    return visibleTablePlans.filter(plan => {
      if (statusFilter !== 'All Statuses') {
        const category = getStatusCategory(plan.status);
        if (category !== statusFilter) return false;
      }

      if (dateFilter !== 'All Time') {
        const planDate = new Date(plan.createdAt);
        const now = new Date();
        
        if (dateFilter === 'This Week') {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          return planDate >= startOfWeek;
        } 
        else if (dateFilter === 'This Month') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          return planDate >= startOfMonth;
        } 
        else if (dateFilter === 'This Year') {
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          return planDate >= startOfYear;
        }
        else if (dateFilter === 'Custom' && customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999); 
          return planDate >= start && planDate <= end;
        }
      }
      return true;
    });
  }, [visibleTablePlans, statusFilter, dateFilter, customStartDate, customEndDate]);

  // --- PAGINATION LOGIC ---
  // Reset to page 1 if filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredTableData.length]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTableData = filteredTableData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTableData.length / itemsPerPage);

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // --- PDF GENERATION LOGIC ---
  const generatePDF = () => {
    const dataToPrint = visibleTablePlans.filter(plan => {
      if (printDriver !== 'All Drivers' && plan.driverName !== printDriver) return false;
      if (printSalesman !== 'All Salesmen' && plan.salesmanName !== printSalesman) return false;
      if (printVehicle !== 'All Vehicles' && plan.vehiclePlateNo !== printVehicle) return false;
      if (printStatus !== 'All Statuses (Full Matrix)' && plan.status !== printStatus) return false;
      
      const planDate = new Date(plan.createdAt);
      const now = new Date();

      if (printDateRange === 'Today') {
        const today = new Date();
        today.setHours(0,0,0,0);
        return planDate >= today;
      } else if (printDateRange === 'This Week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return planDate >= startOfWeek;
      } else if (printDateRange === 'This Month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return planDate >= startOfMonth;
      } else if (printDateRange === 'Custom' && printCustomStart && printCustomEnd) {
        const start = new Date(printCustomStart);
        const end = new Date(printCustomEnd);
        end.setHours(23, 59, 59, 999);
        return planDate >= start && planDate <= end;
      }
      return true;
    });

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Active Dispatch Plans Report', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Filters: ${printDriver}, ${printSalesman}, ${printStatus}`, 14, 36);

    const tableColumn = ["DP #", "Driver", "Salesman", "Vehicle", "Dispatch From", "Dispatch To", "Status"];
    const tableRows = dataToPrint.map(plan => [
      plan.dpNumber,
      plan.driverName,
      plan.salesmanName,
      plan.vehiclePlateNo,
      formatDateTime(plan.timeOfDispatch),
      formatDateTime(plan.timeOfArrival),
      plan.status
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Dispatch_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    setIsPrintModalOpen(false);
  };

  // Stats & Chart Data Calculation
  const stats = useMemo(() => visibleTablePlans.reduce((acc, dp) => {
    const category = getStatusCategory(dp.status);
    acc.total += 1;
    if (category === 'For Dispatch') acc.forDispatch += 1; 
    if (category === 'For Inbound') acc.forInbound += 1; 
    if (category === 'For Clearance') acc.forClearance += 1; 
    return acc;
  }, { total: 0, forDispatch: 0, forInbound: 0, forClearance: 0 }), [visibleTablePlans]);

  const statusChartData = [
    { name: 'For Dispatch', value: stats.forDispatch, color: '#3b82f6' },
    { name: 'For Inbound', value: stats.forInbound, color: '#8b5cf6' },
    { name: 'For Clearance', value: stats.forClearance, color: '#ec4899' },
  ].filter(item => item.value > 0);

  const weeklyTrendData = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
    const seed = labels.map((day) => ({ day, dispatches: 0 }));
    const startOfWeek = new Date();
    const jsDay = startOfWeek.getDay(); 
    const diffToMonday = (jsDay + 6) % 7; 
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    for (const plan of visibleTablePlans) {
      if (!plan?.createdAt) continue;
      const localString = plan.createdAt.replace(/Z$/, "");
      const dt = new Date(localString);
      if (isNaN(dt.getTime())) continue;
      if (dt < startOfWeek || dt >= endOfWeek) continue;
      const d = dt.getDay(); 
      const idx = (d + 6) % 7; 
      seed[idx].dispatches += 1;
    }
    return seed;
  }, [visibleTablePlans]);

  if (error) return <div className="p-6 text-center text-red-600 bg-red-50 border-red-200 rounded-lg">🚨 Error: {error}</div>;

  return (
    <div className="p-6 max-w-[1600px] mx-auto" data-page="dispatch-summary">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚚 Dispatch Summary Dashboard (Active)</h1>
          <p className="text-gray-600">For Dispatch, In Transit, and For Clearance.</p>
        </div>
      </div>

      <hr className="my-6" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div><p className="text-gray-600 text-sm mb-1 font-medium">Total Visible</p><p className="text-3xl font-semibold text-gray-900">{loading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : stats.total}</p></div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><Clock className="w-6 h-6 text-blue-600" /></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div><p className="text-gray-600 text-sm mb-1 font-medium">For Dispatch</p><p className="text-3xl font-semibold text-gray-900">{loading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : stats.forDispatch}</p></div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><Plus className="w-6 h-6 text-blue-600" /></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
           <div className="flex items-center justify-between">
            <div><p className="text-gray-600 text-sm mb-1 font-medium">For Inbound</p><p className="text-3xl font-semibold text-gray-900">{loading ? <Loader2 className="w-6 h-6 animate-spin text-purple-500" /> : stats.forInbound}</p></div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><TrendingDown className="w-6 h-6 text-purple-600" /></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
           <div className="flex items-center justify-between">
            <div><p className="text-gray-600 text-sm mb-1 font-medium">For Clearance</p><p className="text-3xl font-semibold text-gray-900">{loading ? <Loader2 className="w-6 h-6 animate-spin text-pink-500" /> : stats.forClearance}</p></div>
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center"><CheckCircle className="w-6 h-6 text-pink-600" /></div>
          </div>
        </div>
      </div>

      <hr className="my-6" />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Active Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            {loading ? <div className="flex items-center justify-center h-full text-gray-400"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-2" /> Loading...</div> 
            : statusChartData.length === 0 ? <div className="flex items-center justify-center h-full text-gray-400">No active dispatch data</div> 
            : (
                <PieChart>
                  <Pie data={statusChartData} cx="50%" cy="50%" labelLine={true} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} dataKey="value">
                    {statusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
            )}
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📈 Weekly Trend</h2>
          <div className="relative h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip /> <Legend />
                <Line type="monotone" dataKey="dispatches" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <hr className="my-6" />

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">📑 Active Dispatch Plans</h2>
          
          <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
            <button onClick={() => setIsPrintModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm mr-2">
              <Printer className="w-4 h-4" /> Print PDF
            </button>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select className="h-10 pl-10 pr-10 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All Statuses</option><option>For Dispatch</option><option>For Inbound</option><option>For Clearance</option>
              </select>
            </div>

            {/* Date Range Dropdown */}
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select className="h-10 pl-10 pr-10 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <option>All Time</option><option>This Week</option><option>This Month</option><option>This Year</option><option>Custom</option>
              </select>
            </div>

            {/* Custom Date Inputs */}
            {dateFilter === 'Custom' && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <input type="date" className="h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                <span className="text-gray-400 font-medium">-</span>
                <input type="date" className="h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DP #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salesman</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dispatch From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dispatch To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-24 text-center"><div className="flex flex-col items-center justify-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" /><p>Loading dispatch plans...</p></div></td></tr>
              ) : filteredTableData.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No active dispatch plans found matching filters.</td></tr>
              ) : (
                currentTableData.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{plan.dpNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.driverName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-blue-600">{plan.salesmanName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.vehiclePlateNo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDateTime(plan.timeOfDispatch)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDateTime(plan.timeOfArrival)}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-3 py-1 text-xs font-semibold border rounded-full ${getStatusBadgeClass(plan.status)}`}>{plan.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && filteredTableData.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-lg">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to <span className="font-medium">{Math.min(indexOfLastItem, filteredTableData.length)}</span> of <span className="font-medium">{filteredTableData.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button onClick={prevPage} disabled={currentPage === 1} className={`p-2 rounded-lg border ${currentPage === 1 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                   let pNum = i + 1;
                   if (totalPages > 5 && currentPage > 3) {
                      pNum = currentPage - 3 + i;
                      if (pNum > totalPages) pNum = i + (totalPages - 4); 
                   }
                   return (
                     <button key={pNum} onClick={() => setCurrentPage(pNum)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === pNum ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
                       {pNum}
                     </button>
                   );
                })}
              </div>
              <button onClick={nextPage} disabled={currentPage === totalPages} className={`p-2 rounded-lg border ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {isCreateModalOpen && (<CreateDispatchPlanModal onClose={() => setIsCreateModalOpen(false)} onSuccess={() => { loadData(); setIsCreateModalOpen(false); }} />)}
      {isViewModalOpen && selectedPlan && <ViewDispatchPlanModal plan={selectedPlan} onClose={handleModalClose} onUpdatePlan={handleUpdatePlan} />}

      {/* Print Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative">
            <button onClick={() => setIsPrintModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
            <h2 className="text-xl font-bold text-gray-900 mb-6">What needs to be printed?</h2>
            {/* ... Filters for Print (same as previous code) ... */}
            <div className="grid grid-cols-2 gap-4 mb-4">
               <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Vehicle</label><select className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm" value={printVehicle} onChange={(e) => setPrintVehicle(e.target.value)}><option>All Vehicles</option>{uniqueVehicles.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
               <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Salesman</label><select className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm" value={printSalesman} onChange={(e) => setPrintSalesman(e.target.value)}><option>All Salesmen</option>{uniqueSalesmen.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
               <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Driver</label><select className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm" value={printDriver} onChange={(e) => setPrintDriver(e.target.value)}><option>All Drivers</option>{uniqueDrivers.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
               <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label><select className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm" value={printStatus} onChange={(e) => setPrintStatus(e.target.value)}><option>All Statuses (Full Matrix)</option>{uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            {/* Date Range for Print */}
             <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Date Range</label>
              <div className="flex gap-2 mb-3">
                 {['Today', 'This Week', 'This Month'].map((range) => (
                   <button key={range} onClick={() => setPrintDateRange(range)} className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${printDateRange === range ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>{range}</button>
                 ))}
              </div>
              <button onClick={() => setPrintDateRange('Custom')} className={`w-full py-2 text-sm font-medium rounded-lg border transition-colors mb-2 ${printDateRange === 'Custom' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>Custom</button>
              {printDateRange === 'Custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <input type="date" className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm" value={printCustomStart} onChange={(e) => setPrintCustomStart(e.target.value)} />
                  <span className="text-gray-400">-</span>
                  <input type="date" className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm" value={printCustomEnd} onChange={(e) => setPrintCustomEnd(e.target.value)} />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button onClick={() => setIsPrintModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={generatePDF} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"><Printer className="w-4 h-4" /> Print Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}