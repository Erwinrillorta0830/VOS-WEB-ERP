// src/hooks/use-executive-data.ts
import { useState, useEffect, useCallback } from "react";
import type { DashboardFilters, DashboardData } from "../types";

/**
 * Normalize UI date strings into ISO YYYY-MM-DD for API stability.
 * Accepts:
 * - YYYY-MM-DD
 * - MM/DD/YYYY
 * - DD/MM/YYYY (auto-detect: if first part > 12, treat as DD/MM)
 */
function normalizeDateForApi(input?: string): string | undefined {
    if (!input) return undefined;

    // Already ISO-like
    if (/^\d{4}-\d{2}-\d{2}/.test(input)) return input.substring(0, 10);

    if (input.includes("/")) {
        const parts = input.split("/");
        if (parts.length === 3) {
            const a = Number(parts[0]);
            const b = Number(parts[1]);
            const year = parts[2];

            // Auto-detect: if a > 12 -> DD/MM/YYYY else -> MM/DD/YYYY
            const day = a > 12 ? String(a) : String(b);
            const month = a > 12 ? String(b) : String(a);

            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
    }

    // Fallback: send as-is (API may still normalize)
    return input;
}

async function fetchWithTimeout(input: RequestInfo, init?: RequestInit, timeoutMs = 60_000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(input, {
            ...init,
            signal: controller.signal,
            cache: "no-store",
        });
        return res;
    } finally {
        clearTimeout(id);
    }
}

export const useExecutiveData = () => {
    const [filters, setFilters] = useState<DashboardFilters>({
        fromDate: "01/01/2024",
        toDate: "12/31/2025",
        division: undefined,
        branch: undefined,
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [dataSource, setDataSource] = useState<"directus" | "mock">("directus");

    // Optional: if your API return-management warnings (recommended), keep them here.
    const [warnings, setWarnings] = useState<string[]>([]);

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();

            const fromIso = normalizeDateForApi(filters.fromDate);
            const toIso = normalizeDateForApi(filters.toDate);

            if (fromIso) params.set("fromDate", fromIso);
            if (toIso) params.set("toDate", toIso);

            // Keep division explicit; API already interprets "all"
            if (filters.division) params.set("division", filters.division);

            // If later you add branch support in the API route, pass it through.
            if (filters.branch) params.set("branch", String(filters.branch));

            const url = `/api/sales/executive?${params.toString()}`;
            console.log("🔍 Fetching:", url);

            // First attempt
            let response = await fetchWithTimeout(url, undefined, 90_000);

            // Optional one retry if the API return-management transient server error
            if (!response.ok && (response.status === 500 || response.status === 503)) {
                console.warn(`⚠️ Transient error (${response.status}). Retrying once...`);
                response = await fetchWithTimeout(url, undefined, 90_000);
            }

            if (!response.ok) {
                const text = await response.text().catch(() => "");
                throw new Error(`HTTP ${response.status}: ${text.substring(0, 300)}`);
            }

            const data = await response.json();

            if (data?.error) {
                throw new Error(`API Error: ${data.error}`);
            }

            console.log("✅ Dashboard data loaded:", data);

            setDashboardData(data);
            setWarnings(Array.isArray(data?.warnings) ? data.warnings : []);
            setDataSource("directus");
        } catch (err: unknown) {
            console.error("💥 Fetch failed:", err);
            setError(err instanceof Error ? err.message : "Failed to load data");
            // Do not clear dashboardData automatically; preserves last good render
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const handleFilterChange = useCallback((newFilters: DashboardFilters) => {
        setFilters(newFilters);
    }, []);

    return {
        filters,
        loading,
        error,
        dashboardData,
        warnings, // expose to page if you want to render it
        dataSource,
        fetchDashboardData,
        handleFilterChange,
    };
};
