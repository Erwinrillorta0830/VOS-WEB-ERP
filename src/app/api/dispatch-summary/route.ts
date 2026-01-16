import { NextResponse } from "next/server";

// --- CONFIGURATION ---
const BASE_URL = process.env.REMOTE_API_BASE;
const CACHE_TTL_SECONDS = 300; // Cache static data for 5 minutes

// --- SIMPLE IN-MEMORY CACHE ---
// In a serverless environment (Vercel), this cache persists only as long as the container is warm.
// For production clusters, consider Redis. For now, this fixes the immediate crash.
const globalCache: Record<string, { data: any; timestamp: number }> = {};

const getCachedData = async (key: string, fetcher: () => Promise<any>) => {
  const now = Date.now();
  const cached = globalCache[key];

  // If cached and valid (less than 5 mins old), return it
  if (cached && (now - cached.timestamp < CACHE_TTL_SECONDS * 1000)) {
    return cached.data;
  }

  // Otherwise fetch, cache, and return
  console.log(`[API] Cache MISS for ${key}. Fetching upstream...`);
  const data = await fetcher();
  globalCache[key] = { data, timestamp: now };
  return data;
};

// --- ENDPOINTS ---
const API_ENDPOINTS = {
  // Transactional Data (We still fetch these, but ideally filter by date if upstream supports it)
  PLANS: (limit: string) => `${BASE_URL}/post_dispatch_plan?limit=${limit}`, 
  STAFF: (limit: string) => `${BASE_URL}/post_dispatch_plan_staff?limit=${limit}`,
  INVOICES: (limit: string) => `${BASE_URL}/post_dispatch_invoices?limit=${limit}`,
  
  // Lookup Data (These rarely change, perfect for Caching)
  SALES_INVOICES: `${BASE_URL}/sales_invoice?limit=-1`, // Warning: Heavy
  VEHICLES: `${BASE_URL}/vehicles?limit=-1`,
  USERS: `${BASE_URL}/user?limit=-1`,
  CUSTOMERS: `${BASE_URL}/customer?limit=-1`,
  SALESMEN: `${BASE_URL}/salesman?limit=-1`,
};

const normalizeCode = (code: string) => code ? code.replace(/\s+/g, '') : '';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // OPTIMIZATION: Allow frontend to request smaller chunks if needed. 
    // Defaulting to -1 for now to maintain logic, but in V2, remove limit=-1.
    const limit = searchParams.get('limit') || '-1'; 

    console.log("[API] Starting Optimized Dispatch Summary Fetch...");

    // 1. Parallel Fetch with Strategy
    // We group "Live" data (needs to be fresh) vs "Static" data (can be cached)
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
      // --- LIVE DATA (Always fetch fresh) ---
      fetch(API_ENDPOINTS.PLANS(limit), { cache: 'no-store' }).then(r => r.json()),
      fetch(API_ENDPOINTS.STAFF(limit), { cache: 'no-store' }).then(r => r.json()),
      fetch(API_ENDPOINTS.INVOICES(limit), { cache: 'no-store' }).then(r => r.json()),

      // --- CACHED DATA (Fetch once every 5 mins) ---
      getCachedData('sales_invoices', () => fetch(API_ENDPOINTS.SALES_INVOICES).then(r => r.json())),
      getCachedData('vehicles', () => fetch(API_ENDPOINTS.VEHICLES).then(r => r.json())),
      getCachedData('users', () => fetch(API_ENDPOINTS.USERS).then(r => r.json())),
      getCachedData('customers', () => fetch(API_ENDPOINTS.CUSTOMERS).then(r => r.json())),
      getCachedData('salesmen', () => fetch(API_ENDPOINTS.SALESMEN).then(r => r.json())),
    ]);

    // 2. Optimized Processing
    // We use Maps to avoid O(N^2) complexity.
    
    const rawPlans = plansData.data || [];
    if (rawPlans.length === 0) return NextResponse.json({ data: [] });

    // Build Maps
    const userMap = new Map((usersData.data || []).map((u: any) => [String(u.user_id), `${u.user_fname} ${u.user_lname}`.trim()]));
    const vehicleMap = new Map((vehiclesData.data || []).map((v: any) => [String(v.vehicle_id), v.vehicle_plate]));
    const salesmanMap = new Map((salesmenData.data || []).map((s: any) => [String(s.id), s.salesman_name]));
    const salesInvoiceMap = new Map((salesInvoicesData.data || []).map((si: any) => [String(si.invoice_id), si]));
    
    // Optimize Customer Map (Normalize keys once)
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

    // 3. Mapping Logic
    const mappedPlans = rawPlans.map((plan: any) => {
        const planIdStr = String(plan.id);
        const driverUserId = driverByPlan.get(planIdStr) || String(plan.driver_id);
        const driverName = userMap.get(driverUserId) || 'Unknown Driver';
        const vehicleIdStr = plan.vehicle_id ? String(plan.vehicle_id) : '';
        const vehiclePlateNo = vehicleMap.get(vehicleIdStr) || 'Unknown Plate';

        const planInvoices = invoicesByPlan.get(planIdStr) || [];
        
        // Find salesman from the first valid invoice to avoid looping all
        let foundSalesmanName = 'Unknown Salesman';
        let foundSalesmanId = 'N/A';
        
        // Optimization: Only look for salesman until found
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
                itemsOrdered: 'N/A', // Reduced payload if not used
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

    console.log(`[API] Successfully mapped ${mappedPlans.length} plans.`);
    
    return NextResponse.json({ data: mappedPlans });

  } catch (err: any) {
    console.error("Dispatch Summary API Error:", err);
    return NextResponse.json({ error: "Failed to load dispatch summary data" }, { status: 500 });
  }
}