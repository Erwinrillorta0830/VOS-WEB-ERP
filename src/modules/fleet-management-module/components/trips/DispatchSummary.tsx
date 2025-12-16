import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, TrendingUp, TrendingDown, Clock, CheckCircle, Calendar, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

const CreateDispatchPlanModal = ({ onClose, onCreatePlan }: any) => <div className="p-4 bg-white shadow-xl rounded-lg fixed inset-0 m-auto w-96 h-40">Create Plan Modal</div>;
const ViewDispatchPlanModal = ({ plan, onClose, onUpdatePlan }: any) => <div className="p-4 bg-white shadow-xl rounded-lg fixed inset-0 m-auto w-96 h-40">View Plan: {plan.dpNumber}</div>;

// --- API Endpoints ---
const BASE_URL = 'http://100.110.197.61:8091/items/';

const API_ENDPOINTS = {
  PLANS: `${BASE_URL}post_dispatch_plan?limit=-1`,
  STAFF: `${BASE_URL}post_dispatch_plan_staff?limit=-1`,
  INVOICES: `${BASE_URL}post_dispatch_invoices?limit=-1`,
  SALES_INVOICES: `${BASE_URL}sales_invoice?limit=-1`,
  VEHICLES: `${BASE_URL}vehicles?limit=-1`,
  USERS: `${BASE_URL}user?limit=-1`,
  CUSTOMERS: `${BASE_URL}customer?limit=-1`,
  SALESMEN: `${BASE_URL}salesman?limit=-1`,
};

const normalizeCode = (code: string) => code ? code.replace(/\s+/g, '') : '';

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

// --- Data Fetching Logic ---
const fetchAndMapData = async (): Promise<DispatchPlan[]> => {
    console.log("Fetching dispatch data...");
    try {
        const [
            plansRes, staffRes, dispatchInvoicesRes, salesInvoicesRes, 
            vehiclesRes, usersRes, customersRes, salesmenRes
        ] = await Promise.all([
            fetch(API_ENDPOINTS.PLANS),
            fetch(API_ENDPOINTS.STAFF),
            fetch(API_ENDPOINTS.INVOICES),
            fetch(API_ENDPOINTS.SALES_INVOICES),
            fetch(API_ENDPOINTS.VEHICLES),
            fetch(API_ENDPOINTS.USERS),
            fetch(API_ENDPOINTS.CUSTOMERS),
            fetch(API_ENDPOINTS.SALESMEN)
        ]);

        if (!plansRes.ok) throw new Error("Failed to fetch API data");

        const plansData = await plansRes.json();
        const staffData = await staffRes.json();
        const dispatchInvoicesData = await dispatchInvoicesRes.json();
        const salesInvoicesData = await salesInvoicesRes.json();
        const vehiclesData = await vehiclesRes.json();
        const usersData = await usersRes.json();
        const customersData = await customersRes.json();
        const salesmenData = await salesmenRes.json();

        const rawPlans = plansData.data || [];

        // --- 1. Lookup Maps ---
        const userMap = new Map();
        (usersData.data || []).forEach((u: any) => userMap.set(String(u.user_id), `${u.user_fname} ${u.user_lname}`.trim()));

        const vehicleMap = new Map();
        (vehiclesData.data || []).forEach((v: any) => {
            if (v.vehicle_id) vehicleMap.set(String(v.vehicle_id), v.vehicle_plate);
        });

        const salesmanMap = new Map();
        (salesmenData.data || []).forEach((s: any) => salesmanMap.set(String(s.id), s.salesman_name));

        const salesInvoiceMap = new Map();
        (salesInvoicesData.data || []).forEach((si: any) => salesInvoiceMap.set(String(si.invoice_id), si));

        const customerMap = new Map();
        (customersData.data || []).forEach((c: any) => {
            if (c.customer_code) customerMap.set(normalizeCode(c.customer_code), c);
        });

        const invoicesByPlan = new Map<string, any[]>();
        (dispatchInvoicesData.data || []).forEach((inv: any) => {
            if (inv.post_dispatch_plan_id) {
                const pId = String(inv.post_dispatch_plan_id);
                if (!invoicesByPlan.has(pId)) invoicesByPlan.set(pId, []);
                invoicesByPlan.get(pId)?.push(inv);
            }
        });

        const driverByPlan = new Map<string, string>();
        (staffData.data || []).forEach((s: any) => {
            if (s.role === 'Driver') driverByPlan.set(String(s.post_dispatch_plan_id), String(s.user_id));
        });

        // --- 2. Map Plans ---
        const mappedPlans: DispatchPlan[] = rawPlans.map((plan: any) => {
            const planIdStr = String(plan.id);
            const driverUserId = driverByPlan.get(planIdStr) || String(plan.driver_id);
            const driverName = userMap.get(driverUserId) || 'Unknown Driver';
            const vehicleIdStr = plan.vehicle_id ? String(plan.vehicle_id) : '';
            const vehiclePlateNo = vehicleMap.get(vehicleIdStr) || 'Unknown Plate';

            const planInvoices = invoicesByPlan.get(planIdStr) || [];
            let foundSalesmanName = 'Unknown Salesman';
            let foundSalesmanId = 'N/A';

            for (const inv of planInvoices) {
                const salesInv = salesInvoiceMap.get(String(inv.invoice_id));
                if (salesInv && salesInv.salesman_id) {
                    const sIdStr = String(salesInv.salesman_id);
                    const name = salesmanMap.get(sIdStr);
                    if (name) {
                        foundSalesmanName = name;
                        foundSalesmanId = sIdStr;
                        break;
                    }
                }
            }

            const customerTransactions = planInvoices.map((inv: any) => {
                const salesInv = salesInvoiceMap.get(String(inv.invoice_id));
                let customerName = 'Unknown Customer';
                let address = 'N/A';
                let amount = 0;
                if (salesInv) {
                    amount = salesInv.total_amount || 0;
                    if (salesInv.customer_code) {
                        const cObj = customerMap.get(normalizeCode(salesInv.customer_code));
                        if (cObj) {
                            customerName = cObj.customer_name;
                            address = `${cObj.city || ''}, ${cObj.province || ''}`;
                        }
                    }
                }
                return {
                    id: String(inv.id),
                    customerName,
                    address,
                    itemsOrdered: 'N/A',
                    amount,
                    status: inv.status
                };
            });

            return {
                id: planIdStr,
                dpNumber: plan.doc_no,
                driverId: driverUserId,
                driverName,
                salesmanId: foundSalesmanId,
                salesmanName: foundSalesmanName,
                vehicleId: vehicleIdStr,
                vehiclePlateNo: vehiclePlateNo,
                startingPoint: String(plan.starting_point),
                timeOfDispatch: plan.time_of_dispatch, 
                timeOfArrival: plan.time_of_arrival,
                estimatedDispatch: plan.estimated_time_of_dispatch,
                estimatedArrival: plan.estimated_time_of_arrival,
                customerTransactions,
                status: plan.status,
                createdAt: plan.date_encoded,
                updatedAt: plan.date_encoded,
            };
        });

        return mappedPlans;
    } catch (e) {
        console.error("Failed to load dispatch data:", e);
        return []; 
    }
};

// --- DispatchSummary Component ---

export function DispatchSummary() {
  const [dispatchPlans, setDispatchPlans] = useState<DispatchPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DispatchPlan | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // --- Filters State ---
  const [dateFilter, setDateFilter] = useState<string>('All Time');
  const [statusFilter, setStatusFilter] = useState<string>('All Statuses');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const plans = await fetchAndMapData();
      setDispatchPlans(plans);
    } catch (e) {
      console.error("Failed to load data:", e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      case 'Approved': return 'For Dispatch';
      case 'For Dispatch': return 'For Dispatch';
      case 'For Inbound': return 'For Inbound'; 
      case 'Dispatched': return 'For Inbound';
      case 'Inbound': return 'For Inbound'; 
      case 'In Transit': return 'For Inbound'; 
      case 'Arrived': return 'For Clearance';
      case 'For Clearance': return 'For Clearance';
      case 'Posted': return 'For Approval'; 
      case 'Cleared':
      case 'Completed': return 'Completed'; 
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
  const visibleTablePlans = dispatchPlans.filter(plan => {
    const category = getStatusCategory(plan.status);
    return category === 'For Dispatch' || category === 'For Inbound' || category === 'For Clearance';
  });

  // --- FILTERED TABLE DATA LOGIC ---
  const filteredTableData = visibleTablePlans.filter(plan => {
    // 1. Status Filter
    if (statusFilter !== 'All Statuses') {
      const category = getStatusCategory(plan.status);
      if (category !== statusFilter) return false;
    }

    // 2. Date Filter
    if (dateFilter !== 'All Time') {
      const planDate = new Date(plan.createdAt);
      const now = new Date();
      
      if (dateFilter === 'This Week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
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

  // Stats & Chart
  const stats = visibleTablePlans.reduce((acc, dp) => {
    const category = getStatusCategory(dp.status);
    acc.total += 1;
    if (category === 'For Dispatch') acc.forDispatch += 1; 
    if (category === 'For Inbound') acc.forInbound += 1; 
    if (category === 'For Clearance') acc.forClearance += 1; 
    return acc;
  }, { total: 0, forApproval: 0, forDispatch: 0, forInbound: 0, forClearance: 0 });

  const statusChartData = [
    { name: 'For Dispatch', value: stats.forDispatch, color: '#3b82f6' },
    { name: 'For Inbound', value: stats.forInbound, color: '#8b5cf6' },
    { name: 'For Clearance', value: stats.forClearance, color: '#ec4899' },
  ].filter(item => item.value > 0);

  const weeklyTrendData = [
    { day: 'Mon', dispatches: 12 }, { day: 'Tue', dispatches: 19 }, 
    { day: 'Wed', dispatches: 15 }, { day: 'Thu', dispatches: 22 }, 
    { day: 'Fri', dispatches: 18 }, { day: 'Sat', dispatches: 8 }, 
    { day: 'Sun', dispatches: 5 },
  ];

  if (error) return <div className="p-6 text-center text-red-600 bg-red-50 border-red-200 rounded-lg">🚨 Error: {error}</div>;

  return (
    <div className="p-6 max-w-[1600px] mx-auto" data-page="dispatch-summary">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚚 Dispatch Summary Dashboard (Active)</h1>
          <p className="text-gray-600">For Dispatch, In Transit, and For Clearance.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-md">
          <Plus className="w-5 h-5" /> Create Dispatch Plan
        </button>
      </div>

      <hr className="my-6" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div><p className="text-gray-600 text-sm mb-1 font-medium">Total Visible</p><p className="text-3xl font-semibold text-gray-900">{stats.total}</p></div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><Clock className="w-6 h-6 text-blue-600" /></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div><p className="text-gray-600 text-sm mb-1 font-medium">For Dispatch</p><p className="text-3xl font-semibold text-gray-900">{stats.forDispatch}</p></div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><Plus className="w-6 h-6 text-blue-600" /></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div><p className="text-gray-600 text-sm mb-1 font-medium">For Inbound</p><p className="text-3xl font-semibold text-gray-900">{stats.forInbound}</p></div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><TrendingDown className="w-6 h-6 text-purple-600" /></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div><p className="text-gray-600 text-sm mb-1 font-medium">For Clearance</p><p className="text-3xl font-semibold text-gray-900">{stats.forClearance}</p></div>
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
            {statusChartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                    No active dispatch data available
                </div>
            ) : (
                <PieChart>
                  <Pie 
                    data={statusChartData} 
                    cx="50%" 
                    cy="50%" 
                    labelLine={true}
                    label={({ name, value }) => `${name}: ${value}`} 
                    outerRadius={80} 
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
            )}
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📈 Weekly Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="dispatches" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <hr className="my-6" />

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* MODIFIED HEADER: Fixed Alignment and Spacing */}
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">📑 Active Dispatch Plans</h2>
          
          <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
            {/* Status Filter */}
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select 
                // Added h-10 for fixed height
                className="h-10 pl-10 pr-10 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>All Statuses</option>
                <option>For Dispatch</option>
                <option>For Inbound</option>
                <option>For Clearance</option>
              </select>
            </div>

            {/* Date Range Dropdown */}
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select 
                // Added h-10 for fixed height
                className="h-10 pl-10 pr-10 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option>All Time</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>This Year</option>
                <option>Custom</option>
              </select>
            </div>

            {/* Custom Date Inputs - Perfectly aligned with h-10 */}
            {dateFilter === 'Custom' && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <input 
                  type="date" 
                  className="h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
                <span className="text-gray-400 font-medium">-</span>
                <input 
                  type="date" 
                  className="h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTableData.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No active dispatch plans found matching filters.</td></tr>
              ) : (
                filteredTableData.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{plan.dpNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.driverName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-blue-600">{plan.salesmanName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.vehiclePlateNo}</td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDateTime(plan.timeOfDispatch)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDateTime(plan.timeOfArrival)}</td>

                    <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-3 py-1 text-xs font-semibold border rounded-full ${getStatusBadgeClass(plan.status)}`}>{plan.status}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => handleView(plan)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700"><Eye className="w-4 h-4" /> View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && <CreateDispatchPlanModal onClose={() => setIsCreateModalOpen(false)} onCreatePlan={handleCreatePlan} />}
      {isViewModalOpen && selectedPlan && <ViewDispatchPlanModal plan={selectedPlan} onClose={handleModalClose} onUpdatePlan={handleUpdatePlan} />}
    </div>
  );
}