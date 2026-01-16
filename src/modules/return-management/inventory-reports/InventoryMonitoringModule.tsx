"use client"

import React, { useState } from 'react';
import { useInventory } from './hooks/useInventory';
import { columns } from './components/InventoryColumns';
import { InventoryTable } from './components/InventoryTable';
import { InventoryFilters } from './components/InventoryFilters';
import { InventoryCharts } from './components/InventoryCharts';
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";

export default function InventoryMonitoringModule() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const [filters, setFilters] = useState({ branch: 'all', supplier: 'all', search: '' });

  // Pass page/limit to hook again
  const { data, loading, error } = useInventory(page, limit, filters);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to page 1 on filter change
  };

  const totalOnHand = data?.aggregations?.byBranch.reduce((sum, item) => sum + item.value, 0) || 0;

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Reports</h2>
          <p className="text-slate-500">View and analyze product inventory across branches.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="gap-2"><FileSpreadsheet className="h-4 w-4" /> CSV</Button>
           <Button className="bg-blue-600 hover:bg-blue-700 gap-2 text-white"><Download className="h-4 w-4" /> Excel</Button>
        </div>
      </div>

      {/* Charts Section */}
      <InventoryCharts 
        branchData={data?.aggregations?.byBranch || []}
        categoryData={data?.aggregations?.byCategory || []}
        loading={loading}
      />

      {/* --- 1. SEPARATED FILTERS CARD --- */}
      <div className="bg-white border rounded-lg shadow-sm pb-4">
        <InventoryFilters 
          onBranchChange={(val) => handleFilterChange('branch', val)}
          onSupplierChange={(val) => handleFilterChange('supplier', val)}
          onSearchChange={(val) => handleFilterChange('search', val)}
        />
      </div>

      {/* --- 2. SEPARATED TABLE CARD --- */}
      <div className="bg-white border rounded-lg shadow-sm">
        
        {error && <div className="mx-4 mt-4 p-4 bg-red-50 text-red-600 border border-red-200 rounded-md">{error}</div>}

        <div className="p-4">
            <InventoryTable 
              columns={columns} 
              data={data?.data || []} 
              loading={loading} 
            />
        </div>
        
        {/* SERVER-SIDE PAGINATION CONTROLS */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50 rounded-b-lg">
          <div className="text-sm text-slate-500">
             {data ? `Showing ${((page - 1) * limit) + 1} to ${Math.min(page * limit, data.meta.total)} of ${data.meta.total} results` : 'Loading...'}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            <div className="flex items-center px-4 font-mono text-sm bg-white border rounded shadow-sm">{page}</div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => p + 1)} 
              disabled={!data || page >= data.meta.totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Total */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t p-2 px-6 text-sm font-bold text-slate-700 shadow-lg z-10">
        Total On Hand: <span className="font-mono ml-2">{new Intl.NumberFormat().format(totalOnHand)}</span> 
      </div>

    </div>
  );
}