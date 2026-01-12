"use client";

import { useMemo } from "react";
import { useFilters } from "../contexts/filter-context";

interface FilterableData {
  collection_date?: string;
  date?: string;
  salesman_id?: number;
  status?: string;
  isPosted?: { data: number[] };
}

export function useFilteredData<T extends FilterableData>(data: T[]): T[] {
  const { filters } = useFilters();

  return useMemo(() => {
    let filtered = [...data];

    // Filter by date range
    if (filters.dateFrom || filters.dateTo) {
      const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      if (toDate) toDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter((item) => {
        const dateStr = item.date || item.collection_date;
        if (!dateStr) return true;

        const itemDate = new Date(dateStr);
        const matchesFrom = fromDate ? itemDate >= fromDate : true;
        const matchesTo = toDate ? itemDate <= toDate : true;

        return matchesFrom && matchesTo;
      });
    }

    // Filter by salesman
    if (filters.salesmanId !== null) {
      filtered = filtered.filter((item) => {
        // Handle both direct salesman_id and nested structures
        if (item.salesman_id !== undefined) {
          return item.salesman_id === filters.salesmanId;
        }
        return true; // If no salesman_id field, don't filter out
      });
    }

    // Filter by status
    if (filters.status !== "all") {
      filtered = filtered.filter((item) => {
        // Check if item has status field (string)
        if (item.status) {
          return filters.status === "posted"
            ? item.status.toLowerCase() === "posted"
            : item.status.toLowerCase() === "unposted";
        }
        // Check if item has isPosted field (Buffer format)
        if (item.isPosted?.data) {
          const isPosted = item.isPosted.data[0] === 1;
          return filters.status === "posted" ? isPosted : !isPosted;
        }
        return true;
      });
    }

    return filtered;
  }, [data, filters]);
}
