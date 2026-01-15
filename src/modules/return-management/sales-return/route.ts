import { NextResponse } from "next/server";
// Assuming you have a global prisma client. If not, see Step 3 below.
import { prisma } from "@/lib/prisma"; 
import { salesReturnSchema } from "@/lib/validator/sales-return";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  
  // 1. Get Filters from URL (matches your UI dropdowns)
  const search = searchParams.get("search") || "";
  const salesman = searchParams.get("salesman");
  const customer = searchParams.get("customer");
  const status = searchParams.get("status");

  // 2. Build Query Filters dynamically
  const whereClause: any = {
    AND: [],
  };

  // Search Logic (searches 3 columns at once)
  if (search) {
    whereClause.AND.push({
      OR: [
        { returnNo: { contains: search } },
        { salesman: { contains: search } },
        { customer: { contains: search } },
      ],
    });
  }

  // Dropdown Filters (Ignore 'all' or empty strings)
  if (salesman && salesman !== "all") {
    whereClause.AND.push({ salesman: { equals: salesman } });
  }
  if (customer && customer !== "all") {
    whereClause.AND.push({ customer: { equals: customer } });
  }
  if (status && status !== "all") {
    whereClause.AND.push({ status: { equals: status } });
  }

  try {
    // 3. Fetch Data from DB
    const salesReturns = await prisma.salesReturn.findMany({
      where: whereClause,
      orderBy: {
        returnDate: 'desc', // Latest returns first
      },
    });

    return NextResponse.json(salesReturns);
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch sales returns" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validate the body using Zod
    const validation = salesReturnSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation Failed", details: validation.error.errors }, 
        { status: 400 }
      );
    }
    
    const data = validation.data;

    // 2. Generate Return No (SR-AUTO-00X)
    // In a real app, you might want a more robust sequence generator
    const count = await prisma.salesReturn.count();
    const returnNo = `SR-AUTO-${(count + 1).toString().padStart(3, '0')}`;

    // 3. Save to Database
    const newReturn = await prisma.salesReturn.create({
      data: {
        returnNo,
        salesman: data.salesman,
        customer: data.customer,
        returnDate: new Date(data.returnDate),
        totalAmount: data.totalAmount,
        status: data.status,
        remarks: data.remarks || "",
      },
    });

    return NextResponse.json(newReturn, { status: 201 });
  } catch (error) {
    console.error("Create error:", error);
    return NextResponse.json({ error: "Failed to create return" }, { status: 500 });
  }
}