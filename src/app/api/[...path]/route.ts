import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-HTTP-Method-Override");
  return res;
}

// ✅ SHARED LOGIC for building the URL
async function getTargetUrl(pathPromise: Promise<{ path: string[] }>, req: NextRequest) {
  const UPSTREAM_BASE = process.env.UPSTREAM_API_BASE_URL;
  if (!UPSTREAM_BASE) throw new Error("UPSTREAM_API_BASE_URL missing");

  const { path } = await pathPromise; 
  const targetUrl = new URL(`${UPSTREAM_BASE}/${path.join("/")}`);
  req.nextUrl.searchParams.forEach((v, k) => targetUrl.searchParams.append(k, v));
  return targetUrl;
}

// ✅ GET HANDLER
export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const targetUrl = await getTargetUrl(context.params, req);
    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const data = await response.json();
    return withCors(NextResponse.json(data, { status: response.status }));
  } catch (error: any) {
    return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
  }
}

// ✅ POST HANDLER
export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const targetUrl = await getTargetUrl(context.params, req);
    const body = await req.json(); 

    // Check for Tunneling Header (just in case you use it later)
    const methodOverride = req.headers.get("X-HTTP-Method-Override");
    const method = methodOverride || "POST";

    const response = await fetch(targetUrl.toString(), {
      method: method, // Use override if present, else POST
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), 
    });

    const data = await response.json();
    return withCors(NextResponse.json(data, { status: response.status }));
  } catch (error: any) {
    return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
  }
}

// 🟢 NEW: PATCH HANDLER (Crucial for "Receive" Button)
export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const targetUrl = await getTargetUrl(context.params, req);
    const body = await req.json();

    console.log(`🛠️ PATCH Proxy: ${targetUrl.toString()}`);

    const response = await fetch(targetUrl.toString(), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Handle 204 No Content gracefully
    if (response.status === 204) {
        return withCors(new NextResponse(null, { status: 204 }));
    }

    const data = await response.json();
    return withCors(NextResponse.json(data, { status: response.status }));
  } catch (error: any) {
    console.error("❌ PATCH Error:", error.message);
    return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
  }
}

// 🟢 NEW: PUT HANDLER (Often used for full updates)
export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const targetUrl = await getTargetUrl(context.params, req);
    const body = await req.json();

    console.log(`🛠️ PUT Proxy: ${targetUrl.toString()}`);

    const response = await fetch(targetUrl.toString(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return withCors(NextResponse.json(data, { status: response.status }));
  } catch (error: any) {
    console.error("❌ PUT Error:", error.message);
    return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
  }
}

// 🟢 NEW: DELETE HANDLER (You might need this later to delete items)
export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const targetUrl = await getTargetUrl(context.params, req);
    
    console.log(`🗑️ DELETE Proxy: ${targetUrl.toString()}`);

    const response = await fetch(targetUrl.toString(), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (response.status === 204) {
      return withCors(new NextResponse(null, { status: 204 }));
    }
    
    const data = await response.json();
    return withCors(NextResponse.json(data, { status: response.status }));
  } catch (error: any) {
    return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
  }
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}