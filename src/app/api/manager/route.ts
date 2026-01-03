// app/api/manager/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    // Redirect old endpoint -> new endpoint
    const url = new URL(request.url);
    const target = new URL(url.toString());
    target.pathname = "/api/sales/manager";
    return NextResponse.redirect(target, 307);
}
