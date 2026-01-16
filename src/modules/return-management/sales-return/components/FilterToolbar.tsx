"use client"

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SalesReturnStatus } from "../types";

// Define props for the actions
interface FilterToolbarProps {
  onSearchChange: (value: string) => void;
  onStatusChange: (value: SalesReturnStatus | "all") => void;
}

export function FilterToolbar({ onSearchChange, onStatusChange }: FilterToolbarProps) {
  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by return number, salesman, or customer..."
          className="w-full bg-background pl-8 md:w-[500px]"
          // Add onChange handler
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Salesman & Customer Selects (Visual only for now) */}
        <Select>
          <SelectTrigger className="w-[200px]">
             <SelectValue placeholder="Salesman" />
          </SelectTrigger>
          <SelectContent>
            {MOCK_FILTER_OPTIONS.salesmen.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="w-[200px]">
             <SelectValue placeholder="Customer" />
          </SelectTrigger>
          <SelectContent>
            {MOCK_FILTER_OPTIONS.customers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Status Filter - WIRED UP */}
        <Select onValueChange={(val) => onStatusChange(val as SalesReturnStatus | "all")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {MOCK_FILTER_OPTIONS.statuses.map((status) => (
                 <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" className="shrink-0" onClick={() => {
            // Logic to clear filters would go here
            onSearchChange("");
            onStatusChange("all");
        }}>
            <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}