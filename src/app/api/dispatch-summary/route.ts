import { NextResponse } from "next/server";

// --- Configuration ---
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

export async function GET() {
  try {
    // 1. Fetch all upstream data in parallel
    const [
        plansRes, staffRes, dispatchInvoicesRes, salesInvoicesRes, 
        vehiclesRes, usersRes, customersRes, salesmenRes
    ] = await Promise.all([
        fetch(API_ENDPOINTS.PLANS, { cache: 'no-store' }),
        fetch(API_ENDPOINTS.STAFF, { cache: 'no-store' }),
        fetch(API_ENDPOINTS.INVOICES, { cache: 'no-store' }),
        fetch(API_ENDPOINTS.SALES_INVOICES, { cache: 'no-store' }),
        fetch(API_ENDPOINTS.VEHICLES, { cache: 'no-store' }),
        fetch(API_ENDPOINTS.USERS, { cache: 'no-store' }),
        fetch(API_ENDPOINTS.CUSTOMERS, { cache: 'no-store' }),
        fetch(API_ENDPOINTS.SALESMEN, { cache: 'no-store' })
    ]);

    // Check if any critical fetch failed
    if (!plansRes.ok) throw new Error("Failed to fetch Dispatch Plans");

    // 2. Parse JSON
    const plansData = await plansRes.json();
    const staffData = await staffRes.json();
    const dispatchInvoicesData = await dispatchInvoicesRes.json();
    const salesInvoicesData = await salesInvoicesRes.json();
    const vehiclesData = await vehiclesRes.json();
    const usersData = await usersRes.json();
    const customersData = await customersRes.json();
    const salesmenData = await salesmenRes.json();

    const rawPlans = plansData.data || [];

    // --- 3. Build Lookup Maps (Optimization) ---
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

    // --- 4. Map & Join Data ---
    const mappedPlans = rawPlans.map((plan: any) => {
        const planIdStr = String(plan.id);
        const driverUserId = driverByPlan.get(planIdStr) || String(plan.driver_id);
        const driverName = userMap.get(driverUserId) || 'Unknown Driver';
        const vehicleIdStr = plan.vehicle_id ? String(plan.vehicle_id) : '';
        const vehiclePlateNo = vehicleMap.get(vehicleIdStr) || 'Unknown Plate';

        const planInvoices = invoicesByPlan.get(planIdStr) || [];
        let foundSalesmanName = 'Unknown Salesman';
        let foundSalesmanId = 'N/A';

        // Attempt to find salesman from the linked invoices
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

    return NextResponse.json({ data: mappedPlans });

  } catch (err: any) {
    console.error("Dispatch Summary API Error:", err);
    return NextResponse.json({ error: "Failed to load dispatch summary data" }, { status: 500 });
  }
}