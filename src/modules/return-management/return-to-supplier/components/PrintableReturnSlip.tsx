"use client";

import React from "react";
import { ReturnToSupplier, ReturnItem, LineDiscount } from "../type";

interface Props {
  data: ReturnToSupplier;
  items: ReturnItem[];
  lineDiscounts: LineDiscount[];
}

export const PrintableReturnSlip = React.forwardRef<HTMLDivElement, Props>(
  ({ data, items, lineDiscounts }, ref) => {
    // Helper to find discount name
    const getDiscountName = (percentage: number) => {
      if (percentage === 0) return "-";
      const match = lineDiscounts.find(
        (d) => parseFloat(d.percentage) === percentage,
      );
      return match ? match.line_discount : `${percentage}%`;
    };

    return (
      <div
        ref={ref}
        className="font-sans text-black bg-white w-full h-full mx-auto p-8"
        style={{ width: "297mm", height: "210mm" }} // Landscape A4 dimensions roughly
      >
        <style type="text/css" media="print">
          {`
            @page { size: landscape; margin: 5mm; }
            body { -webkit-print-color-adjust: exact; }
          `}
        </style>

        {/* Header Section */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-4">
          {/* LEFT: Title + Doc Info */}
          <div className="w-1/2">
            <h1 className="text-3xl font-extrabold uppercase tracking-wider text-gray-900 mb-4">
              Return Slip
            </h1>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase w-24">
                  RTS No:
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {data.returnNo}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase w-24">
                  Date:
                </span>
                <span className="text-sm text-gray-900">{data.returnDate}</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Supplier & Branch Info */}
          <div className="w-1/2 flex gap-8 justify-end text-right">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Supplier
              </span>
              <p className="text-lg font-bold text-gray-800 uppercase">
                {data.supplier}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Branch
              </span>
              <p className="text-lg font-bold text-gray-800 uppercase">
                {data.branch}
              </p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <table className="w-full text-[10px] text-left border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="py-1 px-2 font-bold text-gray-600 uppercase border-r border-gray-200 w-[10%]">
                  Code
                </th>
                <th className="py-1 px-2 font-bold text-gray-600 uppercase border-r border-gray-200 w-[40%]">
                  Product Name
                </th>
                <th className="py-1 px-2 font-bold text-gray-600 uppercase text-center border-r border-gray-200 w-[5%]">
                  Unit
                </th>
                <th className="py-1 px-2 font-bold text-gray-600 uppercase text-center border-r border-gray-200 w-[5%]">
                  Qty
                </th>
                <th className="py-1 px-2 font-bold text-gray-600 uppercase text-right border-r border-gray-200 w-[10%]">
                  Price
                </th>
                <th className="py-1 px-2 font-bold text-gray-600 uppercase text-center border-r border-gray-200 w-[10%]">
                  Disc Type
                </th>
                <th className="py-1 px-2 font-bold text-gray-600 uppercase text-right w-[10%]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-1 px-2 font-mono text-gray-700 border-r border-gray-200">
                    {item.code}
                  </td>
                  <td className="py-1 px-2 font-medium text-gray-800 border-r border-gray-200 truncate max-w-[300px]">
                    {item.name}
                  </td>
                  <td className="py-1 px-2 text-center text-gray-600 border-r border-gray-200">
                    {item.unit}
                  </td>
                  <td className="py-1 px-2 text-center font-bold text-gray-900 border-r border-gray-200">
                    {item.quantity}
                  </td>
                  <td className="py-1 px-2 text-right text-gray-600 border-r border-gray-200">
                    {item.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-1 px-2 text-center text-gray-600 border-r border-gray-200">
                    {getDiscountName(item.discount)}
                  </td>
                  <td className="py-1 px-2 text-right font-bold text-gray-900">
                    {item.total.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ✅ FOOTER SECTION: Remarks (Left) & Totals (Right) */}
        <div className="flex items-start gap-8 mb-6">
          {/* Remarks - Takes remaining space */}
          <div className="flex-1 border border-gray-200 p-3 rounded bg-gray-50 min-h-[100px]">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Remarks
            </span>
            <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
              {data.remarks || "No remarks provided."}
            </p>
          </div>

          {/* Totals - Fixed Width */}
          <div className="w-1/3">
            <div className="text-right w-full space-y-1 border-t-2 border-gray-800 pt-2">
              <p className="flex justify-between text-sm">
                <span className="text-gray-500">Total Qty:</span>
                <span className="font-bold">
                  {items.reduce((a, b) => a + b.quantity, 0)}
                </span>
              </p>
              <p className="flex justify-between text-lg mt-2">
                <span className="font-bold text-gray-900">Total Amount:</span>
                <span className="font-bold text-black">
                  {items
                    .reduce((a, b) => a + b.total, 0)
                    .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Signatories - BOTTOM */}
        <div className="absolute bottom-10 left-8 right-8">
          <div className="grid grid-cols-3 gap-16">
            <div className="text-center">
              <div className="border-b border-gray-400 mb-1 h-8"></div>
              <p className="text-[10px] font-bold uppercase text-gray-500">
                Prepared By
              </p>
            </div>
            <div className="text-center">
              <div className="border-b border-gray-400 mb-1 h-8"></div>
              <p className="text-[10px] font-bold uppercase text-gray-500">
                Verified By
              </p>
            </div>
            <div className="text-center">
              <div className="border-b border-gray-400 mb-1 h-8"></div>
              <p className="text-[10px] font-bold uppercase text-gray-500">
                Received By
              </p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-[8px] text-gray-300">
              System Generated | Printed: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  },
);
PrintableReturnSlip.displayName = "PrintableReturnSlip";
