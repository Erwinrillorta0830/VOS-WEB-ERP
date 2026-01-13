// modules/fleet-management-module/components/pending-invoices/components/FiltersBar.tsx
"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { FiltersState, PendingInvoiceOptions } from "../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FiltersBar({
  filters,
  setFilters,
  options,
}: {
  filters: FiltersState;
  setFilters: (next: FiltersState) => void;
  options: PendingInvoiceOptions | null;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by invoice, customer, salesman, or dispatch plan..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })}
        />
      </div>

      <div className="w-full md:w-[220px]">
        <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v as any, page: 1 })}>
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {(options?.statuses ?? ["All", "Unlinked", "For Dispatch", "Inbound", "Cleared"]).map((s) => (
              <SelectItem key={s} value={s}>
                {s === "All" ? "All Statuses" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
