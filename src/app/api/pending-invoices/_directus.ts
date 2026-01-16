// src/app/api/pending-invoices/_directus.ts
import { NextResponse } from "next/server";

const REMOTE_API_BASE = process.env.REMOTE_API_BASE;
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

if (!REMOTE_API_BASE) {
  // Do not throw at import-time in Next, but do fail fast per request.
  console.error("Missing REMOTE_API_BASE in .env.local");
}

export type DirectusListResponse<T> = {
  data: T[];
  meta?: { total_count?: number; filter_count?: number };
};

export function directusUrl(path: string, params?: Record<string, string>) {
  const base = REMOTE_API_BASE || "";
  const url = new URL(`${base}${path.startsWith("/") ? "" : "/"}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return url.toString();
}

export async function directusGet<T>(path: string, params?: Record<string, string>) {
  const url = directusUrl(path, params);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (DIRECTUS_STATIC_TOKEN) {
    headers.Authorization = `Bearer ${DIRECTUS_STATIC_TOKEN}`;
  }

  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "Directus request failed", status: res.status, url, details: text },
      { status: 500 }
    );
  }
  return (await res.json()) as T;
}

// Small helper for chunking large IN filters
export function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
