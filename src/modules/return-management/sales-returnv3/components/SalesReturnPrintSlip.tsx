import React, { forwardRef } from "react";
import { format } from "date-fns";
import { SalesReturnItem } from "../type"; // Adjust path to where your types are

// Define the shape of data specifically for the Print Slip
interface PrintData {
  returnNo: string;
  returnDate: string;
  status: string;
  remarks: string;
  salesmanName: string;
  salesmanCode: string;
  customerName: string;
  customerCode: string;
  branchName: string;
  items: SalesReturnItem[];
  totalAmount: number;
}

interface SalesReturnPrintSlipProps {
  data: PrintData | null;
}

export const SalesReturnPrintSlip = forwardRef<HTMLDivElement, SalesReturnPrintSlipProps>(
  ({ data }, ref) => {
    if (!data) return null;

    // 1. Get Real-Time Date for the "Printed At" timestamp
    const printTimestamp = format(new Date(), "M/d/yy, h:mm a");

    // Calculate totals based on items
    const calculatedGross = data.items.reduce((acc, item) => acc + (item.grossAmount || (item.quantity * item.unitPrice)), 0);
    const calculatedDiscount = data.items.reduce((acc, item) => acc + (item.discountAmount || 0), 0);

    return (
      <div ref={ref} className="p-8 bg-white text-black font-sans text-sm hidden print:block">
        {/* CSS specific for the Print Window */}
        <style type="text/css" media="print">
          {`
            @page { size: A4; margin: 15mm; }
            body { -webkit-print-color-adjust: exact; }
            .print-hidden { display: none !important; }
          `}
        </style>

        {/* --- TOP META HEADER (Time & Doc Ref) --- */}
        <div className="flex justify-between items-end mb-4 text-[10px] text-gray-900 font-medium font-sans">
            <span>{printTimestamp}</span>
            <span>Return Slip - {data.returnNo}</span>
        </div>

        {/* MAIN HEADER */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wide">VOS ERP INVENTORY</h1>
          <p className="text-gray-600 mt-1">Sales Return Slip</p>
        </div>

        <hr className="border-black mb-6" />

        {/* METADATA GRID */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-6 text-sm">
          {/* Left Column */}
          <div className="grid grid-cols-[110px_1fr] gap-1 items-baseline">
            <span className="font-bold">Return No:</span>
            <span>{data.returnNo}</span>

            <span className="font-bold">Date:</span>
            <span>{data.returnDate}</span>

            <span className="font-bold">Status:</span>
            <span>{data.status}</span>

            <span className="font-bold">Salesman:</span>
            <span className="uppercase">{data.salesmanName}</span>

            <span className="font-bold">Salesman Code:</span>
            <span className="uppercase">{data.salesmanCode}</span>
          </div>

          {/* Right Column */}
          <div className="grid grid-cols-[110px_1fr] gap-1 items-baseline">
            <span className="font-bold">Customer:</span>
            <span className="uppercase">{data.customerName}</span>

            <span className="font-bold">Customer Code:</span>
            <span className="uppercase">{data.customerCode}</span>

            <span className="font-bold">Branch:</span>
            <span className="uppercase">{data.branchName}</span>
          </div>
        </div>

        {/* REMARKS */}
        <div className="mb-6">
          <span className="font-bold mr-2">Remarks:</span>
          <span>{data.remarks || "No remarks provided."}</span>
        </div>

        {/* TABLE - Fixed Layout */}
        <div className="w-full mb-6">
          <table className="w-full text-xs border-collapse table-fixed">
            <thead>
              <tr className="border-b border-gray-300 text-gray-500 text-left">
                <th className="py-2 font-semibold w-[8%]">Code</th>
                <th className="py-2 font-semibold w-[32%]">Description</th>
                <th className="py-2 font-semibold w-[5%]">Unit</th>
                <th className="py-2 font-semibold w-[5%] text-center">Qty</th>
                <th className="py-2 font-semibold w-[10%] text-right">Unit Price</th>
                <th className="py-2 font-semibold w-[10%] text-right">Gross</th>
                <th className="py-2 font-semibold w-[8%] text-right">Discount</th>
                <th className="py-2 font-semibold w-[8%] text-right">Total</th>
                <th className="py-2 font-semibold w-[8%] pl-2">Reason</th>
                <th className="py-2 font-semibold w-[6%]">Type</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 align-top">{item.code || "N/A"}</td>
                  <td className="py-3 align-top pr-2">{item.description}</td>
                  <td className="py-3 align-top">{item.unit || "Pcs"}</td>
                  <td className="py-3 align-top text-center">{item.quantity}</td>
                  <td className="py-3 align-top text-right">₱{Number(item.unitPrice).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="py-3 align-top text-right">₱{Number(item.grossAmount || (item.quantity * item.unitPrice)).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="py-3 align-top text-right">₱{Number(item.discountAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="py-3 align-top text-right font-bold">₱{Number(item.totalAmount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="py-3 align-top pl-2">{item.reason}</td>
                  <td className="py-3 align-top">{item.returnType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTALS */}
        <div className="flex justify-end mb-12">
          <div className="w-64">
            <div className="flex justify-between py-1">
              <span className="font-semibold">Gross Amount:</span>
              <span className="font-bold">₱{calculatedGross.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-black pb-2">
              <span className="font-semibold">Discount Amount:</span>
              <span className="font-bold">₱{calculatedDiscount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between py-2 text-lg">
              <span className="font-bold">Net Amount:</span>
              <span className="font-bold">₱{Number(data.totalAmount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <hr className="border-black border-2" />
          </div>
        </div>

        {/* FOOTER SIGNATURES */}
        <div className="grid grid-cols-2 gap-24 mt-20">
          <div className="text-center">
            <div className="border-t border-black pt-2 font-semibold">Prepared By</div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-2 font-semibold">Received By</div>
          </div>
        </div>
      </div>
    );
  }
);

SalesReturnPrintSlip.displayName = "SalesReturnPrintSlip";