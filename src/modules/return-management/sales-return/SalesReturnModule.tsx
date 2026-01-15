"use client";

import React, { useState } from "react";
// ✅ 1. Import DialogTitle
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"; 
import { SalesReturnList } from "./components/SalesReturnList";
import { SalesReturnForm } from "./components/SalesReturnForm";
import { SalesReturn } from "./types";

const NEW_RETURN_DATA: SalesReturn = {
  returnNo: "NEW",
  status: "Draft",
  returnDate: new Date().toISOString().split('T')[0],
  salesman: "",
  salesmanCode: "PANG-EXT-2",
  customer: "",
  customerCode: "",
  branch: "PANGASNAN-VAN 2",
  thirdParty: false,
  orderNo: "",
  invoiceNo: "",
  remarks: "",
  items: [],
  totalAmount: 0,
};

export default function SalesReturnModule() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<SalesReturn>(NEW_RETURN_DATA);

  const handleCreateNew = () => {
    setFormData(NEW_RETURN_DATA);
    setIsModalOpen(true);
  };

  const handleView = (data: SalesReturn) => {
    setFormData(data);
    setIsModalOpen(true);
  };

  return (
    <>
      <SalesReturnList 
        onCreateNew={handleCreateNew} 
        onView={handleView} 
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 gap-0 bg-gray-50 overflow-hidden sm:max-w-[95vw]">
            
            {/* ✅ 2. FIX: Add a Title for accessibility, but hide it visually */}
            <DialogTitle className="sr-only">Sales Return Form</DialogTitle>

            <SalesReturnForm 
                key={formData.returnNo} 
                initialData={formData} 
                onBack={() => setIsModalOpen(false)} 
            />
            
        </DialogContent>
      </Dialog>
    </>
  );
}