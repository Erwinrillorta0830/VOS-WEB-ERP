import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_BASE = process.env.UPSTREAM_API_BASE_URL; // http://100.110.197.61:8091

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

async function handle(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = new URL(`${UPSTREAM_BASE}/${path.join("/")}`);
  
  // Forward search params (filters)
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.append(k, v));

  const response = await fetch(url.toString(), {
    method: req.method,
    headers: { "Content-Type": "application/json" },
    body: req.method !== "GET" ? await req.text() : undefined,
  });

  const data = await response.json();
  return withCors(NextResponse.json(data, { status: response.status }));
}

export const GET = handle;
export const POST = handle;
export const OPTIONS = () => withCors(new NextResponse(null, { status: 204 }));