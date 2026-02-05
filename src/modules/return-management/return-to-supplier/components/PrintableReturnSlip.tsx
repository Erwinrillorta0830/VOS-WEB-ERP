import React from "react";
import { ReturnToSupplier, ReturnItem } from "../type";

interface Props {
  data: ReturnToSupplier;
  items: ReturnItem[];
}

export const PrintableReturnSlip = React.forwardRef<HTMLDivElement, Props>(
  ({ data, items }, ref) => {
    return (
      <div
        ref={ref}
        className="p-10 font-sans text-black bg-white w-full max-w-[210mm] mx-auto"
      >
        {/* Header Section */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-wider text-gray-900">
              Return Slip
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-medium uppercase tracking-widest">
              Return to Supplier Record
            </p>
          </div>
          <div className="text-right">
            <div className="bg-gray-100 px-4 py-2 rounded mb-2 inline-block">
              <h2 className="text-xl font-bold text-gray-900">
                {data.returnNo}
              </h2>
            </div>
            <p className="text-sm text-gray-600 block">{data.returnDate}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-10 mb-8">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Supplier
            </span>
            <p className="text-xl font-bold text-gray-800">{data.supplier}</p>
            <p className="text-sm text-gray-500">Registered Supplier</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Branch
            </span>
            <p className="text-xl font-bold text-gray-800 uppercase">
              {data.branch}
            </p>
            <p className="text-sm text-gray-500">Originating Branch</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full text-sm text-left border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="py-3 px-2 font-bold text-gray-600 uppercase text-xs border-r border-gray-200">
                  Code
                </th>
                <th className="py-3 px-2 font-bold text-gray-600 uppercase text-xs w-[35%] border-r border-gray-200">
                  Product Name
                </th>
                <th className="py-3 px-2 font-bold text-gray-600 uppercase text-xs text-center border-r border-gray-200">
                  Unit
                </th>
                <th className="py-3 px-2 font-bold text-gray-600 uppercase text-xs text-center border-r border-gray-200">
                  Qty
                </th>
                <th className="py-3 px-2 font-bold text-gray-600 uppercase text-xs text-right border-r border-gray-200">
                  Price
                </th>
                <th className="py-3 px-2 font-bold text-gray-600 uppercase text-xs text-right border-r border-gray-200">
                  Disc %
                </th>
                <th className="py-3 px-2 font-bold text-gray-600 uppercase text-xs text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-3 px-2 font-mono text-xs text-blue-700 border-r border-gray-200">
                    {item.code}
                  </td>
                  <td className="py-3 px-2 font-medium text-gray-800 border-r border-gray-200">
                    {item.name}
                  </td>
                  <td className="py-3 px-2 text-center text-gray-600 border-r border-gray-200">
                    {item.unit}
                  </td>
                  <td className="py-3 px-2 text-center font-bold text-gray-900 border-r border-gray-200">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-2 text-right text-gray-600 border-r border-gray-200">
                    {item.price.toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-right text-gray-600 border-r border-gray-200">
                    {item.discount?.toFixed(2) || "0.00"}%
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-gray-900">
                    {item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-16">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
              <span className="text-gray-500 font-medium">Total Items</span>
              <span className="font-bold text-gray-900">{items.length}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
              <span className="text-gray-500 font-medium">Total Quantity</span>
              <span className="font-bold text-gray-900">
                {items.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
              <span className="text-gray-500 font-medium">Total Discount</span>
              <span className="font-bold text-gray-900">
                {items
                  .reduce(
                    (acc, i) => acc + i.price * i.quantity * (i.discount / 100),
                    0,
                  )
                  .toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-lg pt-2 border-t-2 border-gray-800">
              <span className="font-bold text-gray-900">Net Amount</span>
              <span className="font-bold text-blue-600">
                {items.reduce((acc, i) => acc + i.total, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Remarks Section */}
        {data.remarks && (
          <div className="mb-12 p-4 bg-gray-50 rounded border border-gray-100">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Remarks
            </span>
            <p className="text-sm text-gray-700">{data.remarks}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-10 pt-4">
          <div className="text-center">
            <div className="border-b border-gray-300 mb-2 h-10"></div>
            <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">
              Prepared By
            </p>
          </div>
          <div className="text-center">
            <div className="border-b border-gray-300 mb-2 h-10"></div>
            <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">
              Verified By
            </p>
          </div>
          <div className="text-center">
            <div className="border-b border-gray-300 mb-2 h-10"></div>
            <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">
              Received By
            </p>
          </div>
        </div>

        {/* Footer Timestamp */}
        <div className="mt-12 text-center border-t border-gray-100 pt-4">
          <p className="text-[10px] text-gray-400">
            System Generated Record | Printed on {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    );
  },
);
PrintableReturnSlip.displayName = "PrintableReturnSlip";
