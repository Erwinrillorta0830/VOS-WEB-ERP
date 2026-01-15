"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Components
import { ReturnToSupplierList } from "./components/ReturnToSupplierList";
import { CreateReturnModal } from "./components/CreateReturnModal";

export default function ReturnToSupplierModule() {
  // 🟣 STATE for the Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">
      
      {/* 🟢 TOP NAVIGATION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Return to Supplier</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage returns of goods and bad stocks to suppliers
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" /> Create Return to Supplier
        </Button>
      </div>

      {/* 🔵 CONTENT AREA - DIRECTLY SHOW HISTORY */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="animate-in fade-in duration-300">
          <ReturnToSupplierList />
        </div>
      </div>

      {/* 🟣 THE MODAL COMPONENT */}
      <CreateReturnModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

    </div>
  );
}