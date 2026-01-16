"use client";

import React, { useState } from "react";
// ✅ ADD THIS IMPORT:
import { Loader2 } from "lucide-react"; 

import { SalesReturnList } from "./components/SalesReturnList";
import { SalesReturnForm } from "./components/SalesReturnForm";
import { SalesReturn } from "./types";
import { SalesReturnProvider } from "./provider/api";

export function SalesReturnModule() {
  const [activeView, setActiveView] = useState<"list" | "create">("list");
  const [selectedInvoice, setSelectedInvoice] = useState<SalesReturn | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);

  const handleInitiateReturn = async (invoice: SalesReturn) => {
    try {
      setIsEnriching(true);
      const items = await SalesReturnProvider.getInvoiceDetails(invoice.invoiceNo);
      
      setSelectedInvoice({
        ...invoice,
        items: items
      });
      
      setActiveView("create");
    } catch (error) {
      console.error("Failed to load invoice items:", error);
      alert("Error loading invoice details. Please try again.");
    } finally {
      setIsEnriching(false);
    }
  };

  const handleBackToList = () => {
    setActiveView("list");
    setSelectedInvoice(null);
  };

  return (
    <div className="container mx-auto py-6">
      {/* Loading Overlay */}
      {isEnriching && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            {/* ✅ Now this will work because it is imported */}
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Loading Invoice Details...</p>
          </div>
        </div>
      )}

      {activeView === "list" ? (
        <SalesReturnList onView={handleInitiateReturn} />
      ) : (
        selectedInvoice && (
          <SalesReturnForm 
            initialData={selectedInvoice} 
            onBack={handleBackToList} 
            onSuccess={handleBackToList}
          />
        )
      )}
    </div>
  );
}