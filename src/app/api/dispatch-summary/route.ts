import { NextResponse } from "next/server";

// --- CONFIGURATION ---
const BASE_URL = process.env.REMOTE_API_BASE;
const CACHE_TTL_SECONDS = 300; // Cache static data for 5 minutes

// --- IN-MEMORY CACHE SYSTEM ---
const globalCache: Record<string, { data: any; timestamp: number }> = {};

const getCachedData = async (key: string, fetcher: () => Promise<any>) => {
  const now = Date.now();
  const cached = globalCache[key];

  // If cached data exists and is less than 5 minutes old, use it.
  if (cached && (now - cached.timestamp < CACHE_TTL_SECONDS * 1000)) {
    return cached.data;
  }

  // Otherwise, fetch fresh data from the upstream API
  console.log(`[API] Cache MISS for ${key}. Fetching upstream...`);
  try {
    const data = await fetcher();
    globalCache[key] = { data, timestamp: now };
    return data;
  } catch (error) {
    console.error(`[API] Failed to fetch ${key}`, error);
    return { data: [] }; // Return empty structure on failure to prevent crash
  }
};

// --- ENDPOINTS ---
const API_ENDPOINTS = {
  // Live Data (Always fetched fresh)
  PLANS: (limit: string) => `${BASE_URL}/post_dispatch_plan?limit=${limit}`,
  STAFF: (limit: string) => `${BASE_URL}/post_dispatch_plan_staff?limit=${limit}`,
  INVOICES: (limit: string) => `${BASE_URL}/post_dispatch_invoices?limit=${limit}`,
  
  // Static/Heavy Data (Cached)
  SALES_INVOICES: `${BASE_URL}/sales_invoice?limit=-1`,
  VEHICLES: `${BASE_URL}/vehicles?limit=-1`,
  USERS: `${BASE_URL}/user?limit=-1`,
  CUSTOMERS: `${BASE_URL}/customer?limit=-1`,
  SALESMEN: `${BASE_URL}/salesman?limit=-1`,
};

const normalizeCode = (code: string) => code ? code.replace(/\s+/g, '') : '';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '-1'; 

    console.log("[API] Starting Optimized Dispatch Summary Fetch...");

    // 1. Parallel Fetch with Caching Strategy
    const [
      plansData,
      staffData,
      dispatchInvoicesData,
      salesInvoicesData,
      vehiclesData,
      usersData,
      customersData,
      salesmenData
    ] = await Promise.all([
      // Live Data
      fetch(API_ENDPOINTS.PLANS(limit), { cache: 'no-store' }).then(r => r.json()),
      fetch(API_ENDPOINTS.STAFF(limit), { cache: 'no-store' }).then(r => r.json()),
      fetch(API_ENDPOINTS.INVOICES(limit), { cache: 'no-store' }).then(r => r.json()),

      // Cached Data
      getCachedData('sales_invoices', () => fetch(API_ENDPOINTS.SALES_INVOICES).then(r => r.json())),
      getCachedData('vehicles', () => fetch(API_ENDPOINTS.VEHICLES).then(r => r.json())),
      getCachedData('users', () => fetch(API_ENDPOINTS.USERS).then(r => r.json())),
      getCachedData('customers', () => fetch(API_ENDPOINTS.CUSTOMERS).then(r => r.json())),
      getCachedData('salesmen', () => fetch(API_ENDPOINTS.SALESMEN).then(r => r.json())),
    ]);

    const rawPlans = plansData.data || [];
    if (rawPlans.length === 0) return NextResponse.json({ data: [] });

    // 2. High-Performance Mapping (O(N) Complexity)
    // Create Hash Maps for instant lookups instead of finding in arrays
    const userMap = new Map((usersData.data || []).map((u: any) => [String(u.user_id), `${u.user_fname} ${u.user_lname}`.trim()]));
    const vehicleMap = new Map((vehiclesData.data || []).map((v: any) => [String(v.vehicle_id), v.vehicle_plate]));
    const salesmanMap = new Map((salesmenData.data || []).map((s: any) => [String(s.id), s.salesman_name]));
    const salesInvoiceMap = new Map((salesInvoicesData.data || []).map((si: any) => [String(si.invoice_id), si]));
    
    const customerMap = new Map();
    (customersData.data || []).forEach((c: any) => {
        if (c.customer_code) customerMap.set(normalizeCode(c.customer_code), c);
    });

    // Group Invoices by Plan ID
    const invoicesByPlan = new Map<string, any[]>();
    (dispatchInvoicesData.data || []).forEach((inv: any) => {
        if (!inv.post_dispatch_plan_id) return;
        const pId = String(inv.post_dispatch_plan_id);
        if (!invoicesByPlan.has(pId)) invoicesByPlan.set(pId, []);
        invoicesByPlan.get(pId)!.push(inv);
    });

    // Group Drivers by Plan ID
    const driverByPlan = new Map<string, string>();
    (staffData.data || []).forEach((s: any) => {
        if (s.role === 'Driver') driverByPlan.set(String(s.post_dispatch_plan_id), String(s.user_id));
    });

    // 3. Assemble the Data
    const mappedPlans = rawPlans.map((plan: any) => {
        const planIdStr = String(plan.id);
        
        // Lookup Driver
        const driverUserId = driverByPlan.get(planIdStr) || String(plan.driver_id);
        const driverName = userMap.get(driverUserId) || 'Unknown Driver';
        
        // Lookup Vehicle
        const vehicleIdStr = plan.vehicle_id ? String(plan.vehicle_id) : '';
        const vehiclePlateNo = vehicleMap.get(vehicleIdStr) || 'Unknown Plate';

        const planInvoices = invoicesByPlan.get(planIdStr) || [];
        
        // Identify Salesman (from first valid invoice)
        let foundSalesmanName = 'Unknown Salesman';
        let foundSalesmanId = 'N/A';
        const representativeInvoice = planInvoices.find(inv => {
            const si = salesInvoiceMap.get(String(inv.invoice_id));
            return si && si.salesman_id;
        });

        if (representativeInvoice) {
            const salesInv = salesInvoiceMap.get(String(representativeInvoice.invoice_id));
            const sIdStr = String(salesInv.salesman_id);
            foundSalesmanName = salesmanMap.get(sIdStr) || 'Unknown Salesman';
            foundSalesmanId = sIdStr;
        }

        // Map Transactions
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
            vehiclePlateNo,
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

    console.log(`[API] Mapped ${mappedPlans.length} plans successfully.`);
    return NextResponse.json({ data: mappedPlans });

  } catch (err: any) {
    console.error("Dispatch Summary API Error:", err);
    return NextResponse.json({ error: "Failed to load dispatch summary data" }, { status: 500 });
  }
}