"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface InventoryFiltersProps {
  onBranchChange: (val: string) => void;
  onSupplierChange: (val: string) => void;
  onSearchChange: (val: string) => void;
}

export function InventoryFilters({ onBranchChange, onSupplierChange, onSearchChange }: InventoryFiltersProps) {
  const [branches, setBranches] = React.useState<{id: number, branch_name: string}[]>([]);
  const [suppliers, setSuppliers] = React.useState<{id: number, supplier_name: string}[]>([]);

  // State for popovers
  const [openSupplier, setOpenSupplier] = React.useState(false);
  const [openBranch, setOpenBranch] = React.useState(false);

  // State for selected values (to display the label)
  const [selectedSupplier, setSelectedSupplier] = React.useState("all");
  const [selectedBranch, setSelectedBranch] = React.useState("all");

  React.useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch('/api/inventory-options');
        if (res.ok) {
          const data = await res.json();
          setBranches(data.branches || []);
          setSuppliers(data.suppliers || []);
        }
      } catch (e) {
        console.error("Filter Error:", e);
      }
    };
    fetchOptions();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 pb-0">
      
      {/* SEARCHABLE SUPPLIER DROPDOWN */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-500">Supplier</label>
        <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openSupplier}
              className="w-full justify-between font-normal"
            >
              {selectedSupplier === "all"
                ? "All Suppliers"
                : suppliers.find((s) => s.id.toString() === selectedSupplier)?.supplier_name || "Select Supplier..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Search supplier..." />
              <CommandList>
                <CommandEmpty>No supplier found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      setSelectedSupplier("all");
                      onSupplierChange("all");
                      setOpenSupplier(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedSupplier === "all" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    All Suppliers
                  </CommandItem>
                  {suppliers.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={s.supplier_name} // Search by name
                      onSelect={() => {
                        const val = s.id.toString();
                        setSelectedSupplier(val);
                        onSupplierChange(val);
                        setOpenSupplier(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedSupplier === s.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {s.supplier_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* SEARCHABLE BRANCH DROP DOWN */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-500">Branch</label>
        <Popover open={openBranch} onOpenChange={setOpenBranch}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openBranch}
              className="w-full justify-between font-normal"
            >
              {selectedBranch === "all"
                ? "All Branches"
                : branches.find((b) => b.id.toString() === selectedBranch)?.branch_name || "Select Branch..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Search branch..." />
              <CommandList>
                <CommandEmpty>No branch found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      setSelectedBranch("all");
                      onBranchChange("all");
                      setOpenBranch(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedBranch === "all" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    All Branches 
                  </CommandItem>
                  {branches.map((b) => (
                    <CommandItem
                      key={b.id}
                      value={b.branch_name} // Search by name
                      onSelect={() => {
                        const val = b.id.toString();
                        setSelectedBranch(val);
                        onBranchChange(val);
                        setOpenBranch(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedBranch === b.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {b.branch_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* SEARCH INPUT (Unchanged) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-500">Search Product</label>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by name or code..." 
            className="pl-8 w-full" 
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}