// src/app/api/pending-invoices/_directus.ts
export const RAW_DIRECTUS_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.DIRECTUS_URL ||
  "";

export const DIRECTUS_BASE = RAW_DIRECTUS_URL.replace(/\/+$/, "");

export const DIRECTUS_TOKEN =
  process.env.DIRECTUS_TOKEN ||
  process.env.DIRECTUS_ACCESS_TOKEN ||
  process.env.DIRECTUS_STATIC_TOKEN ||
  "";

export type AnyRecord = Record<string, any>;

function toSearchParams(params?: Record<string, any>) {
  const sp = new URLSearchParams();
  if (!params) return sp;

  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  return sp;
}

export async function directusGet<T = AnyRecord>(
  path: string,
  params?: Record<string, any>
): Promise<T> {
  if (!DIRECTUS_BASE) {
    throw new Error("Missing DIRECTUS base URL. Set NEXT_PUBLIC_API_BASE_URL or DIRECTUS_URL.");
  }

  const sp = toSearchParams(params);
  const url = `${DIRECTUS_BASE}${path}${sp.toString() ? `?${sp.toString()}` : ""}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: DIRECTUS_TOKEN
      ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` }
      : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Directus GET failed: ${res.status} ${res.statusText} :: ${url} :: ${text}`);
  }

  return (await res.json()) as T;
}

export async function fetchAllItems(
  collection: string,
  params?: Record<string, any>,
  pageSize = 500
): Promise<AnyRecord[]> {
  const out: AnyRecord[] = [];
  let offset = 0;

  // Directus: /items/{collection}?limit=&offset=
  while (true) {
    const json = await directusGet<{ data: AnyRecord[] }>(`/items/${collection}`, {
      ...params,
      limit: pageSize,
      offset,
    });

    const chunk = json?.data || [];
    out.push(...chunk);

    if (chunk.length < pageSize) break;
    offset += pageSize;

    // hard safety
    if (offset > 200_000) break;
  }

  return out;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}
