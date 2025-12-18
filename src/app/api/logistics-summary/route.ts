import { NextRequest, NextResponse } from "next/server";

// Use environment variable or fallback to localhost for safety
const BASE_URL = process.env.REMOTE_API_BASE;
const ITEMS_PER_PAGE = 50;

// Helper to fetch JSON safely
const fetchJson = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return await res.json();
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get('page') || '1';
    const searchTerm = searchParams.get('search') || '';
    const dateFilter = searchParams.get('dateFilter') || '';

    // --- STEP 1: Fetch Dispatch Invoices (Primary List) ---
    let invoicesUrl = `${BASE_URL}/post_dispatch_invoices?limit=${ITEMS_PER_PAGE}&page=${page}&meta=*`;

    if (searchTerm) {
      invoicesUrl += `&filter[post_dispatch_plan_id][vehicle_id][vehicle_plate][_contains]=${searchTerm}`;
    }

    if (dateFilter) {
      invoicesUrl += `&filter[post_dispatch_plan_id][estimated_time_of_dispatch][_between]=${dateFilter}`;
    }

    invoicesUrl += `&sort=-post_dispatch_plan_id.estimated_time_of_dispatch`;

    const dispatchInvoicesRes = await fetchJson(invoicesUrl);
    const dispatchInvoices = dispatchInvoicesRes.data || [];
    const meta = dispatchInvoicesRes.meta;

    if (dispatchInvoices.length === 0) {
      return NextResponse.json({ data: [], meta: { filter_count: 0 } });
    }

    // --- STEP 2: Gather IDs ---
    const planIds = [...new Set(dispatchInvoices.map((d: any) => d.post_dispatch_plan_id))].join(',');
    const invoiceIds = [...new Set(dispatchInvoices.map((d: any) => d.invoice_id))];

    // --- STEP 3: Parallel Fetching ---
    const [plansRes, invoicesRes] = await Promise.all([
      fetchJson(`${BASE_URL}/post_dispatch_plan?filter[id][_in]=${planIds}&limit=-1`),
      invoiceIds.length > 0
        ? fetchJson(`${BASE_URL}/sales_invoice?filter[invoice_id][_in]=${invoiceIds.join(',')}&limit=-1`)
        : Promise.resolve({ data: [] })
    ]);

    const plans = plansRes.data;
    const invoices = invoicesRes.data;

    // --- STEP 4: Gather Tertiary IDs ---
    const driverIds = [...new Set(plans.map((p: any) => p.driver_id))].join(',');
    const vehicleIds = [...new Set(plans.map((p: any) => p.vehicle_id))].join(',');
    const invoiceNos = invoices.map((i: any) => i.invoice_no);
    const customerCodes = [...new Set(invoices.map((i: any) => i.customer_code))];
    const invoiceIdsStr = invoiceIds.join(',');

    const tertiaryPromises = [
      driverIds ? fetchJson(`${BASE_URL}/user?filter[user_id][_in]=${driverIds}&limit=-1`) : Promise.resolve({ data: [] }),
      vehicleIds ? fetchJson(`${BASE_URL}/vehicles?filter[vehicle_id][_in]=${vehicleIds}&limit=-1`) : Promise.resolve({ data: [] }),
    ];

    if (invoiceNos.length > 0) {
      const invNoStr = invoiceNos.map((n: string) => encodeURIComponent(n)).join(',');
      tertiaryPromises.push(fetchJson(`${BASE_URL}/sales_return?filter[invoice_no][_in]=${invNoStr}&limit=-1`));
    } else { tertiaryPromises.push(Promise.resolve({ data: [] })); }

    if (invoiceIdsStr) {
      tertiaryPromises.push(fetchJson(`${BASE_URL}/unfulfilled_sales_transaction?filter[sales_invoice_id][_in]=${invoiceIdsStr}&limit=-1`));
    } else { tertiaryPromises.push(Promise.resolve({ data: [] })); }

    if (customerCodes.length > 0) {
      const custCodeStr = customerCodes.map((c: string) => encodeURIComponent(c)).join(',');
      tertiaryPromises.push(fetchJson(`${BASE_URL}/customer?filter[customer_code][_in]=${custCodeStr}&limit=-1`));
    } else { tertiaryPromises.push(Promise.resolve({ data: [] })); }

    const [usersRes, vehiclesRes, returnsRes, concernsRes, customersRes] = await Promise.all(tertiaryPromises);
    
    // --- STEP 5: Cluster Logic ---
    const customers = customersRes.data;
    const uniqueCities = [...new Set(customers.map((c: any) => c.city).filter(Boolean))];
    let areaClusters: any[] = [];
    let clusters: any[] = [];

    if (uniqueCities.length > 0) {
      const cityFilter = uniqueCities.map((c: any) => encodeURIComponent(c)).join(',');
      const areasRes = await fetchJson(`${BASE_URL}/area_per_cluster?filter[city][_in]=${cityFilter}&limit=-1`);
      areaClusters = areasRes.data;

      const clusterIds = [...new Set(areaClusters.map((a: any) => a.cluster_id))];
      if (clusterIds.length > 0) {
        const clusterRes = await fetchJson(`${BASE_URL}/cluster?filter[id][_in]=${clusterIds.join(',')}&limit=-1`);
        clusters = clusterRes.data;
      }
    }

    // --- STEP 6: Build Response ---
    const driversMap = new Map(usersRes.data.map((u: any) => [u.user_id, `${u.user_fname} ${u.user_lname}`]));
    const vehiclesMap = new Map(vehiclesRes.data.map((v: any) => [v.vehicle_id, v.vehicle_plate]));
    const invoicesMap = new Map(invoices.map((i: any) => [i.invoice_id, i]));
    const customersMap = new Map(customers.map((c: any) => [c.customer_code, c]));
    const returnsMap = new Map(returnsRes.data.map((r: any) => [r.invoice_no, parseFloat(r.total_amount || '0')]));
    const concernsMap = new Map(concernsRes.data.map((c: any) => [c.sales_invoice_id, c.variance_amount]));

    const cityToClusterIdMap = new Map();
    areaClusters.forEach((area: any) => cityToClusterIdMap.set(area.city.toUpperCase(), area.cluster_id));
    const clusterIdToNameMap = new Map();
    clusters.forEach((cl: any) => clusterIdToNameMap.set(cl.id, cl.cluster_name));

    const getClusterName = (city: string) => {
      if (!city) return 'Unassigned';
      const cId = cityToClusterIdMap.get(city.toUpperCase());
      if (cId) return clusterIdToNameMap.get(cId) || 'Unassigned';
      return 'Unassigned';
    };

    const planInvoicesMap = new Map<number, any[]>();
    dispatchInvoices.forEach((di: any) => {
      const current = planInvoicesMap.get(di.post_dispatch_plan_id) || [];
      current.push(di);
      planInvoicesMap.set(di.post_dispatch_plan_id, current);
    });

    const processedData = plans.map((plan: any) => {
      const planDispatches = planInvoicesMap.get(plan.id) || [];
      if (planDispatches.length === 0) return null;

      const deliveries = planDispatches.map((dispatchItem: any) => {
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

      deliveries.sort((a: any, b: any) => a.clusterName.localeCompare(b.clusterName));

      return {
        id: plan.id.toString(),
        truckPlate: vehiclesMap.get(plan.vehicle_id) || 'Unknown Plate',
        driver: driversMap.get(plan.driver_id) || 'Unknown Driver',
        deliveries: deliveries
      };
    }).filter((item: any) => item !== null);

    const sortedProcessedData = processedData.sort((a: any, b: any) => {
        const indexA = planIds.indexOf(parseInt(a.id));
        const indexB = planIds.indexOf(parseInt(b.id));
        return indexA - indexB;
    });

    return NextResponse.json({ 
        data: sortedProcessedData, 
        meta: { filter_count: meta?.filter_count || 0 } 
    });

  } catch (err: any) {
    console.error("Logistics API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}