// src/app/api/items/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_BASE = process.env.UPSTREAM_API_BASE_URL; // e.g. http://100.110.197.61:8091

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    if (!UPSTREAM_BASE) {
      return withCors(
        NextResponse.json(
          { error: "UPSTREAM_API_BASE_URL is not set" },
          { status: 500 }
        )
      );
    }

    // Build upstream URL
    const upstreamUrl = new URL(`${UPSTREAM_BASE.replace(/\/+$/, "")}/${params.path.join("/")}`);

    // Forward query params
    req.nextUrl.searchParams.forEach((v, k) => upstreamUrl.searchParams.append(k, v));

    // Forward Authorization if present
    const auth = req.headers.get("authorization");

    const headers: Record<string, string> = {};
    if (auth) headers["authorization"] = auth;

    // Preserve content-type if provided
    const contentType = req.headers.get("content-type");
    if (contentType) headers["content-type"] = contentType;

    const body =
      req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

    const upstreamRes = await fetch(upstreamUrl.toString(), {
      method: req.method,
      headers,
      body,
    });

    // Try JSON; fallback to text
    const text = await upstreamRes.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    return withCors(NextResponse.json(data, { status: upstreamRes.status }));
  } catch (err: any) {
    return withCors(
      NextResponse.json(
        { error: err?.message || "Proxy error" },
        { status: 500 }
      )
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;

export const OPTIONS = () => withCors(new NextResponse(null, { status: 204 }));
