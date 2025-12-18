import { NextResponse } from "next/server";

// --- Interfaces (Moved to Server) ---
interface ApiCluster { id: number; cluster_name: string; }
interface ApiCustomer { id: number; customer_code: string; customer_name: string; cluster_id?: number; province?: string; city?: string; }
interface ApiSalesman { id: number; salesman_name: string; salesman_code: string; }
interface ApiSalesOrder { order_id: number; order_no: string; customer_code: string; order_status: string; total_amount: number; order_date: string; salesman_id: number; }
interface ApiAreaPerCluster { id: number; cluster_id: number; province: string; city: string; }

// Output Interfaces
interface CustomerGroupRaw { id: string; customerName: string; salesmanName: string; orders: ApiSalesOrder[]; }
interface ClusterGroupRaw { clusterId: string; clusterName: string; customers: CustomerGroupRaw[]; }

const BASE_URL = "http://100.110.197.61:8091/items";

export async function GET() {
  try {
    // 1. Fetch all required data in parallel
    const [clustersRes, customersRes, ordersRes, salesmanRes, areaRes] = await Promise.all([
      fetch(`${BASE_URL}/cluster?limit=-1`, { cache: 'no-store' }),
      fetch(`${BASE_URL}/customer?limit=-1`, { cache: 'no-store' }),
      fetch(`${BASE_URL}/sales_order?limit=-1`, { cache: 'no-store' }),
      fetch(`${BASE_URL}/salesman?limit=-1`, { cache: 'no-store' }),
      fetch(`${BASE_URL}/area_per_cluster?limit=-1`, { cache: 'no-store' })
    ]);

    // Check for failures
    if (!clustersRes.ok || !customersRes.ok || !ordersRes.ok || !salesmanRes.ok || !areaRes.ok) {
        throw new Error("Failed to fetch one or more upstream APIs");
    }

    const clustersData: { data: ApiCluster[] } = await clustersRes.json();
    const customersData: { data: ApiCustomer[] } = await customersRes.json();
    const ordersData: { data: ApiSalesOrder[] } = await ordersRes.json();
    const salesmanData: { data: ApiSalesman[] } = await salesmanRes.json();
    const areaData: { data: ApiAreaPerCluster[] } = await areaRes.json();

    // 2. Filter Invalid Orders
    const bannedTerms = [
        'en route', 'en_route', 'delivered', 'on hold', 'on_hold', 
        'cancelled', 'no fulfilled', 'no_fulfilled', 'not fulfilled', 'not_fulfilled'
    ];
    
    const validOrders = (ordersData.data || []).filter(order => {
        const rawStatus = order.order_status || '';
        const normalizedStatus = rawStatus.toLowerCase().replace('_', ' ').trim();
        return !bannedTerms.includes(normalizedStatus);
    });

    // 3. Prepare Maps for Joining
    const clusters = clustersData.data || [];
    const customers = customersData.data || [];
    const salesmen = salesmanData.data || [];
    const areas = areaData.data || [];

    const areaMap = new Map<string, number>();
    areas.forEach(area => {
        if (area.city && area.province) {
            const key = `${area.city.trim().toLowerCase()}|${area.province.trim().toLowerCase()}`;
            areaMap.set(key, area.cluster_id);
        }
    });

    const salesmanMap = new Map<number, string>();
    salesmen.forEach(s => {
        salesmanMap.set(s.id, s.salesman_name);
    });

    const customerMap = new Map<string, { name: string, clusterName: string }>();
    customers.forEach(c => {
        let finalClusterId: number | undefined;
        if (c.city && c.province) {
            const geoKey = `${c.city.trim().toLowerCase()}|${c.province.trim().toLowerCase()}`;
            finalClusterId = areaMap.get(geoKey);
        }
        if (!finalClusterId) finalClusterId = c.cluster_id;

        const foundCluster = clusters.find(cl => cl.id === finalClusterId);
        const clusterName = foundCluster ? foundCluster.cluster_name : (c.province || "Unassigned Cluster");

        customerMap.set(c.customer_code, {
            name: c.customer_name,
            clusterName: clusterName
        });
    });

    // 4. Group Data
    const tempGroups: Record<string, { customers: Record<string, CustomerGroupRaw> }> = {};

    validOrders.forEach(order => {
        const custDetails = customerMap.get(order.customer_code);
        const customerName = custDetails ? custDetails.name : `Unknown (${order.customer_code})`;
        const clusterName = custDetails ? custDetails.clusterName : 'Unassigned Cluster';
        
        if (!tempGroups[clusterName]) {
            tempGroups[clusterName] = { customers: {} };
        }

        const customerKey = order.customer_code;

        if (!tempGroups[clusterName].customers[customerKey]) {
            const salesmanName = salesmanMap.get(order.salesman_id) || 'Unknown Salesman';
            tempGroups[clusterName].customers[customerKey] = {
                id: customerKey,
                customerName: customerName,
                salesmanName: salesmanName,
                orders: [] 
            };
        }

        tempGroups[clusterName].customers[customerKey].orders.push(order);
    });

    const result: ClusterGroupRaw[] = Object.entries(tempGroups).map(([clusterName, groupData]) => ({
        clusterId: clusterName,
        clusterName: clusterName,
        customers: Object.values(groupData.customers)
    }));

    return NextResponse.json({ data: result });

  } catch (err: any) {
    console.error("Pending Deliveries API Error:", err);
    return NextResponse.json({ error: "Failed to load pending deliveries" }, { status: 500 });
  }
}