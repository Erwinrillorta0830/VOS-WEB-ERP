import { NextRequest, NextResponse } from "next/server";

// Use environment variable
const BASE_URL = process.env.REMOTE_API_BASE;

interface ApiSalesItem {
  id: number;
  invoice_id: number;
  dispatch_date: string;
  total_amount: string;
  discount_amount: string;
}

interface ApiDeliveryItem {
  id: number;
  invoice_id: number;
  status: string;
}

interface ChartEntry {
  name: string;
  sortIndex: number;
  'Fulfilled': number;
  'Not Fulfilled': number;
  'Fulfilled With Concerns': number;
  'Fulfilled With Returns': number;
  sales: number;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const viewType = searchParams.get('viewType') || 'month'; 

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start and End dates are required" }, { status: 400 });
    }

    const salesUrl = `${BASE_URL}/sales_invoice?limit=-1&filter[dispatch_date][_between]=${startDate},${endDate}`;
    
    const salesRes = await fetch(salesUrl, { cache: 'no-store' });
    if (!salesRes.ok) throw new Error("Failed to fetch sales data");
    const salesJson = await salesRes.json();
    const salesItems: ApiSalesItem[] = salesJson.data || [];

    if (salesItems.length === 0) {
        return NextResponse.json({ 
            chartData: [], 
            deliveryStatusCounts: [], 
            totalSales: 0, 
            avgSales: 0 
        });
    }

    const invoiceIds = [...new Set(salesItems.map(s => s.invoice_id).filter(Boolean))];
    
    let deliveryItems: ApiDeliveryItem[] = [];
    
    if (invoiceIds.length > 0) {
        const chunks = chunkArray(invoiceIds, 50);
        
        const chunkPromises = chunks.map(async (chunk) => {
            const ids = chunk.join(',');
            const url = `${BASE_URL}/post_dispatch_invoices?limit=-1&filter[invoice_id][_in]=${ids}&fields=id,invoice_id,status`;
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) return []; 
            const json = await res.json();
            return json.data as ApiDeliveryItem[];
        });

        const results = await Promise.all(chunkPromises);
        deliveryItems = results.flat();
    }

    const deliveryMap = new Map<number, string>(); 
    deliveryItems.forEach(d => deliveryMap.set(d.invoice_id, d.status));

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const groupMap = new Map<string, ChartEntry>();
    
    let totalSales = 0;
    const counts: Record<string, number> = {
      'Fulfilled': 0,
      'Not Fulfilled': 0,
      'Fulfilled With Concerns': 0,
      'Fulfilled With Returns': 0
    };

    salesItems.forEach(sale => {
        const date = new Date(sale.dispatch_date);
        const status = deliveryMap.get(sale.invoice_id);

        if (!status) return; 

        if (counts[status] !== undefined) {
            counts[status]++;
        }

        let netAmount = 0;
        const validStatuses = ['Fulfilled', 'Fulfilled With Returns', 'Fulfilled With Concerns'];
        if (validStatuses.includes(status)) {
            const total = parseFloat(sale.total_amount) || 0;
            const discount = parseFloat(sale.discount_amount) || 0;
            netAmount = total - discount;
            totalSales += netAmount;
        }

        let key: string;
        let sortIndex: number;

        if (viewType === 'month') {
            key = monthNames[date.getMonth()];
            sortIndex = date.getMonth();
        } else {
            const m = monthNames[date.getMonth()];
            const d = date.getDate();
            key = `${m} ${d}`;
            sortIndex = date.getTime(); 
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
        if ((entry as any)[status] !== undefined) {
            (entry as any)[status]++;
        }
        entry.sales += netAmount;
    });

    const sortedChartData = Array.from(groupMap.values()).sort((a, b) => a.sortIndex - b.sortIndex);

    const COLORS = ['#10b981', '#f59e0b', '#facc15', '#ef4444'];
    const deliveryStatusCounts = [
        { name: 'Fulfilled', value: counts['Fulfilled'], color: COLORS[0] },
        { name: 'Not Fulfilled', value: counts['Not Fulfilled'], color: COLORS[1] },
        { name: 'Fulfilled With Concerns', value: counts['Fulfilled With Concerns'], color: COLORS[2] },
        { name: 'Fulfilled With Returns', value: counts['Fulfilled With Returns'], color: COLORS[3] },
    ];

    const totalDeliveries = Object.values(counts).reduce((a, b) => a + b, 0);
    const avgSales = totalDeliveries > 0 ? totalSales / totalDeliveries : 0;

    return NextResponse.json({
        chartData: sortedChartData,
        deliveryStatusCounts,
        totalSales,
        avgSales
    });

  } catch (err: any) {
    console.error("Statistics API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}