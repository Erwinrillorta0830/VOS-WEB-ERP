"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, Filter, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useFilters } from "../../src/app/contexts/filter-context";
import { ExportButton } from "./export-button";
import { exportColumns } from "../../src/app/lib/summary-report-utils";
import { CollectionDetail } from "./shared/data-table/summary-report-data-table/type";

interface Salesman {
  id: number;
  salesman_name: string;
}

interface AdvancedFilterProps {
  filteredData: CollectionDetail[];
  salesmen?: Salesman[];
  showDateFilter?: boolean;
  showSalesmanFilter?: boolean;
  showStatusFilter?: boolean;
}

export function AdvancedFilter({
  filteredData,
  salesmen = [],
  showDateFilter = true,
  showSalesmanFilter = true,
  showStatusFilter = true,
}: AdvancedFilterProps) {
  const {
    filters,
    setDateRange,
    setSalesman,
    setStatus,
    clearFilters,
    hasActiveFilters,
  } = useFilters();

  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(
    filters.dateFrom ? new Date(filters.dateFrom) : undefined
  );
  const [dateTo, setDateTo] = React.useState<Date | undefined>(
    filters.dateTo ? new Date(filters.dateTo) : undefined
  );
  const [isApplying, setIsApplying] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleApplyDateRange = async () => {
    setIsApplying(true);
    try {
      await setDateRange(
        dateFrom ? format(dateFrom, "yyyy-MM-dd") : null,
        dateTo ? format(dateTo, "yyyy-MM-dd") : null
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
    } finally {
      setIsApplying(false);
    }
  };

  const handleClearDateRange = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setDateRange(null, null);
  };

  const activeFilterCount = [
    filters.dateFrom !== null,
    filters.salesmanId !== null,
    filters.status !== "all",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-wrap sm:grid sm:grid-cols-[1fr_auto] items-center gap-4">
      <div className="flex flex-cols gap-2">
        {/* Date Range Filter */}
        {showDateFilter && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={
                  filters.dateFrom || filters.dateTo ? "default" : "outline"
                }
                className={cn(
                  "justify-start text-left font-normal",
                  !filters.dateFrom && !filters.dateTo
                )}
              >
                <CalendarIcon className="hidden sm:flex mr-2 h-4 w-4" />
                {filters.dateFrom && filters.dateTo ? (
                  <>
                    {format(new Date(filters.dateFrom), "MMM dd, yyyy")} -{" "}
                    {format(new Date(filters.dateTo), "MMM dd, yyyy")}
                  </>
                ) : filters.dateFrom ? (
                  <>From {format(new Date(filters.dateFrom), "MMM dd, yyyy")}</>
                ) : filters.dateTo ? (
                  <>To {format(new Date(filters.dateTo), "MMM dd, yyyy")}</>
                ) : (
                  "Date Range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Date</label>
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">To Date</label>
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    disabled={(date) => (dateFrom ? date < dateFrom : false)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleApplyDateRange}
                    className="flex-1"
                    disabled={isApplying}
                  >
                    {isApplying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      </>
                    ) : (
                      "Apply"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearDateRange}
                    className="flex-1"
                    disabled={isApplying}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Salesman Filter */}
        {showSalesmanFilter && (
          <Select
            value={filters.salesmanId?.toString() || "all"}
            onValueChange={(value) =>
              setSalesman(value === "all" ? null : parseInt(value))
            }
          >
            <SelectTrigger
              className={cn(
                "w-auto sm:w-[200px]",
                filters.salesmanId !== null && "border-primary"
              )}
            >
              <SelectValue placeholder="All Salesman">
                {filters.salesmanId
                  ? salesmen.find((s) => s.id === filters.salesmanId)
                      ?.salesman_name
                  : "All Salesman"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Salesman</SelectItem>
              {salesmen.length === 0 ? (
                <SelectItem value="loading" disabled>
                  Loading salesmen...
                </SelectItem>
              ) : (
                salesmen.map((salesman) => (
                  <SelectItem key={salesman.id} value={salesman.id.toString()}>
                    {salesman.salesman_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}

        {/* Status Filter */}
        {showStatusFilter && (
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setStatus(value as "all" | "posted" | "unposted")
            }
          >
            <SelectTrigger
              className={cn(
                "w-auto sm:w-[150px]",
                filters.status !== "all" && "border-primary"
              )}
            >
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="unposted">Unposted</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Active Filters Indicator */}
        {hasActiveFilters && (
          <Badge variant="secondary" className="gap-1">
            <Filter className="h-3 w-3" />
            {activeFilterCount} Active
          </Badge>
        )}

        {/* Clear All Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 px-2"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>
      {/* <div>
        <ExportButton
          data={filteredData}
          filename="summary-report"
          columns={exportColumns}
        />
      </div> */}
    </div>
  );
}
