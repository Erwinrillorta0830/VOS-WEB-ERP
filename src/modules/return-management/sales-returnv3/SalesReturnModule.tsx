"use client";

import React, { useState } from "react";

import { Plus } from "lucide-react";

// Components

import { SalesReturnHistory } from "./components/SalesReturnHistory";

import { CreateSalesReturnModal } from "./components/CreateSalesReturnModal";

export function SalesReturnModule() {
  // 🟣 STATE for the Modal

  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      {/* 🟢 TOP NAVIGATION HEADER */}

      {/* 🔵 CONTENT AREA - DIRECTLY SHOW HISTORY */}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 min-h-[500px]">
        <div className="animate-in fade-in duration-300">
          <SalesReturnHistory />
        </div>
      </div>

      {/* 🟣 THE MODAL COMPONENT */}

      <CreateSalesReturnModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
