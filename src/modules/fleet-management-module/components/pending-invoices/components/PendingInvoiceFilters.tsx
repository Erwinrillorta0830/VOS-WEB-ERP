"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePendingInvoiceOptions } from "../hooks/usePendingInvoiceOptions";

export function PendingInvoiceFilters(props: {
  search: string;
  status: string;
  salesmanId: string;
  customerCode: string;
  dateFrom: string;
  dateTo: string;
  onChange: (key: string, value: string) => void;
}) {
  const { data } = usePendingInvoiceOptions();

  const [openSalesman, setOpenSalesman] = React.useState(false);
  const [openCustomer, setOpenCustomer] = React.useState(false);

  const statuses = ["all", "Unlinked", "For Dispatch", "Inbound", "Cleared"];

  return (
    <div className="p-4 pb-0 space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            value={props.search}
            onChange={(e) => props.onChange("search", e.target.value)}
            placeholder="Search by invoice, customer, salesman, or dispatch plan..."
            className="pl-9"
          />
        </div>

        {/* STATUS */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-between min-w-[180px]">
              {props.status === "all" ? "All Statuses" : props.status}
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[220px]" align="end">
            <Command>
              <CommandInput placeholder="Search status..." />
              <CommandList>
                <CommandEmpty>No status found.</CommandEmpty>
                <CommandGroup>
                  {statuses.map((s) => (
                    <CommandItem
                      key={s}
                      value={s}
                      onSelect={() => props.onChange("status", s)}
                    >
                      <Check className={cn("mr-2 h-4 w-4", props.status === s ? "opacity-100" : "opacity-0")} />
                      {s === "all" ? "All Statuses" : s}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* SALESMAN */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-500">Salesman</label>
          <Popover open={openSalesman} onOpenChange={setOpenSalesman}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={openSalesman} className="w-full justify-between font-normal">
                {props.salesmanId === "all"
                  ? "All Salesmen"
                  : data?.salesmen?.find((s) => String(s.id) === props.salesmanId)?.salesman_name || "Select salesman..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Search salesman..." />
                <CommandList>
                  <CommandEmpty>No salesman found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        props.onChange("salesmanId", "all");
                        setOpenSalesman(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", props.salesmanId === "all" ? "opacity-100" : "opacity-0")} />
                      All Salesmen
                    </CommandItem>

                    {(data?.salesmen || []).map((s) => (
                      <CommandItem
                        key={s.id}
                        value={s.salesman_name}
                        onSelect={() => {
                          props.onChange("salesmanId", String(s.id));
                          setOpenSalesman(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", props.salesmanId === String(s.id) ? "opacity-100" : "opacity-0")} />
                        {s.salesman_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* CUSTOMER */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-500">Customer</label>
          <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={openCustomer} className="w-full justify-between font-normal">
                {props.customerCode === "all"
                  ? "All Customers"
                  : data?.customers?.find((c) => c.customer_code === props.customerCode)?.customer_name || "Select customer..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Search customer..." />
                <CommandList>
                  <CommandEmpty>No customer found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        props.onChange("customerCode", "all");
                        setOpenCustomer(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", props.customerCode === "all" ? "opacity-100" : "opacity-0")} />
                      All Customers
                    </CommandItem>

                    {(data?.customers || []).map((c) => (
                      <CommandItem
                        key={c.customer_code}
                        value={c.customer_name}
                        onSelect={() => {
                          props.onChange("customerCode", c.customer_code);
                          setOpenCustomer(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", props.customerCode === c.customer_code ? "opacity-100" : "opacity-0")} />
                        {c.customer_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* DATE FROM */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-500">Date From</label>
          <Input
            type="date"
            value={props.dateFrom}
            onChange={(e) => props.onChange("dateFrom", e.target.value)}
          />
        </div>

        {/* DATE TO */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-500">Date To</label>
          <Input
            type="date"
            value={props.dateTo}
            onChange={(e) => props.onChange("dateTo", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
