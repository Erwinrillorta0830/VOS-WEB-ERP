"use client"

import { ColumnDef } from "@tanstack/react-table"
import { InventoryRow, InventoryVariant } from "../types"

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export const columns: ColumnDef<InventoryRow>[] = [
  {
    accessorKey: "supplierName",
    header: "Supplier",
    cell: ({ row }) => <div className="font-medium text-slate-700">{row.getValue("supplierName")}</div>,
  },
  {
    accessorKey: "branchName",
    header: "Branch",
    cell: ({ row }) => <div className="text-xs uppercase font-semibold text-slate-500">{row.getValue("branchName")}</div>,
  },
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <div className="font-mono text-xs text-slate-500">{row.getValue("code")}</div>,
  },
  {
    accessorKey: "productName",
    header: "Product Name",
    cell: ({ row }) => (
      <div className="max-w-[250px] truncate font-medium" title={row.getValue("productName")}>
        {row.getValue("productName")}
      </div>
    ),
  },
  // --- STACKED COLUMNS START HERE ---
  {
    accessorKey: "variants", // accessing the array
    header: "Unit",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        {row.original.variants.map((v, i) => (
          <div key={i} className="text-slate-500 h-5 text-sm">{v.unit}</div>
        ))}
      </div>
    ),
  },
  {
    id: "unitCount",
    header: "Count",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        {row.original.variants.map((v, i) => (
          <div key={i} className="text-center font-mono text-slate-400 h-5 text-xs">
             {/* Show count only if it's > 1 (e.g. show 50 for box, hide 1 for piece) */}
             {v.unitCount > 1 ? `x${v.unitCount}` : '-'}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "lastCutoff",
    header: "Last Cutoff",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        {row.original.variants.map((v, i) => (
          <div key={i} className="text-xs text-slate-400 h-5 truncate">
            {!v.lastCutoff || v.lastCutoff === '-' ? '-' : new Date(v.lastCutoff).toLocaleDateString()}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "lastCount",
    header: () => <div className="text-right">Last Count</div>,
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        {row.original.variants.map((v, i) => (
          <div key={i} className="text-right font-mono text-slate-600 h-5">
            {formatNumber(v.lastCount)}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "movement",
    header: () => <div className="text-right">Movement</div>,
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        {row.original.variants.map((v, i) => {
           const color = v.movement < 0 ? "text-red-600" : v.movement > 0 ? "text-green-600" : "text-slate-400";
           return (
             <div key={i} className={`text-right font-mono font-bold h-5 ${color}`}>
               {formatNumber(v.movement)}
             </div>
           )
        })}
      </div>
    ),
  },
  {
    id: "onHand",
    header: () => <div className="text-right">On Hand</div>,
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        {row.original.variants.map((v, i) => {
           // RED COLOR FOR NEGATIVES
           const color = v.onHand < 0 ? "text-red-600" : "text-slate-800";
           return (
            <div key={i} className={`text-right font-mono font-bold h-5 ${color}`}>
              {formatNumber(v.onHand)}
            </div>
           )
        })}
      </div>
    ),
  },
]