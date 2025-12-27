"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface FilterState {
  dateFrom: string | null;
  dateTo: string | null;
  salesmanId: number | null;
  status: "all" | "posted" | "unposted";
}

interface FilterContextType {
  filters: FilterState;
  setDateRange: (from: string | null, to: string | null) => void;
  setSalesman: (id: number | null) => void;
  setStatus: (status: "all" | "posted" | "unposted") => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const defaultFilters: FilterState = {
  dateFrom: null,
  dateTo: null,
  salesmanId: null,
  status: "all",
};

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const setDateRange = useCallback((from: string | null, to: string | null) => {
    setFilters((prev) => ({ ...prev, dateFrom: from, dateTo: to }));
  }, []);

  const setSalesman = useCallback((id: number | null) => {
    setFilters((prev) => ({ ...prev, salesmanId: id }));
  }, []);

  const setStatus = useCallback((status: "all" | "posted" | "unposted") => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const hasActiveFilters =
    filters.dateFrom !== null ||
    filters.dateTo !== null ||
    filters.salesmanId !== null ||
    filters.status !== "all";

  return (
    <FilterContext.Provider
      value={{
        filters,
        setDateRange,
        setSalesman,
        setStatus,
        clearFilters,
        hasActiveFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
}
