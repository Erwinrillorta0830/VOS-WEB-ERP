"use client";

import React from "react";
import { Search, Eye, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SalesReturn } from "../types";

// ✅ MOCK DATA (Matches your screenshots)
const MOCK_RETURNS: SalesReturn[] = [
  { 
    returnNo: "SR-PANG-001", 
    salesman: "Roberto Cruz", 
    salesmanCode: "PANG-EXT-2",
    customer: "TWIN PEAKS MART", 
    customerCode: "CUST-001",
    branch: "PANGASNAN-VAN 2",
    thirdParty: false,
    returnDate: "2025-12-13", 
    totalAmount: 1762.51, 
    status: "Pending", 
    orderNo: "ORD-123",
    invoiceNo: "INV-123",
    remarks: "Seasonal overstock",
    items: [ // This row has items!
        {
            code: "CDO-ABC123",
            description: "CDO Meat Loaf 150g",
            unit: "Pieces",
            quantity: 10,
            unitPrice: 45.50,
            grossAmount: 455.00,
            discountType: "No Discount",
            discountAmount: 0,
            totalAmount: 455.00,
            reason: "Damaged packaging",
            returnType: "Bad Order"
        },
        {
            code: "NES-XYZ789",
            description: "Nestle Coffee 200g",
            unit: "Box",
            quantity: 5,
            unitPrice: 320.00,
            grossAmount: 1600.00,
            discountType: "Fixed",
            discountAmount: 100,
            totalAmount: 1500.00,
            reason: "Near expiry",
            returnType: "Expired"
        }
    ]
  },
  { 
    returnNo: "SR-ENG-002", 
    salesman: "Carlos Mendoza", 
    salesmanCode: "ENG-EXT-1",
    customer: "MARGIE STORE", 
    customerCode: "CUST-002",
    branch: "PANGASNAN-VAN 2",
    thirdParty: false,
    returnDate: "2025-12-13", 
    totalAmount: 186.68, 
    status: "Received", 
    orderNo: "ORD-124",
    invoiceNo: "INV-124",
    remarks: "Customer request",
    items: []
  },
  { 
    returnNo: "SR-RENG-003", 
    salesman: "Juan Dela Cruz", 
    salesmanCode: "ENG-EXT-1",
    customer: "PINE RIDGE GROCERY", 
    customerCode: "CUST-003",
    branch: "PANGASNAN-VAN 2",
    thirdParty: false,
    returnDate: "2025-12-13", 
    totalAmount: 68.19, 
    status: "Received", 
    orderNo: "ORD-125",
    invoiceNo: "INV-125",
    remarks: "Customer change of mind",
    items: []
  },
];

interface SalesReturnListProps {
  onCreateNew: () => void;
  // ✅ This function triggers when Eye is clicked
  onView: (data: SalesReturn) => void; 
}

export function SalesReturnList({ onCreateNew, onView }: SalesReturnListProps) {
  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sales Returns</h1>
            <p className="text-sm text-muted-foreground">Manage customer product returns</p>
        </div>
        <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Add New Sales Return
        </Button>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by return number, salesman, or customer..." className="pl-9" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Salesman</label>
                <Select><SelectTrigger><SelectValue placeholder="All Salesmen" /></SelectTrigger><SelectContent><SelectItem value="all">All Salesmen</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Customer</label>
                <Select><SelectTrigger><SelectValue placeholder="All Customers" /></SelectTrigger><SelectContent><SelectItem value="all">All Customers</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select><SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem></SelectContent></Select>
            </div>
            <div className="flex items-end">
                <Button variant="outline" className="w-full text-xs text-muted-foreground"><RotateCcw className="mr-2 h-3 w-3" /> Reset</Button>
            </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold text-xs text-gray-700">Return No.</TableHead>
              <TableHead className="font-semibold text-xs text-gray-700">Salesman</TableHead>
              <TableHead className="font-semibold text-xs text-gray-700">Customer</TableHead>
              <TableHead className="font-semibold text-xs text-gray-700">Return Date</TableHead>
              <TableHead className="font-semibold text-xs text-gray-700">Total Amount</TableHead>
              <TableHead className="font-semibold text-xs text-gray-700">Status</TableHead>
              <TableHead className="font-semibold text-xs text-gray-700">Remarks</TableHead>
              <TableHead className="font-semibold text-xs text-gray-700 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_RETURNS.map((row) => (
              <TableRow key={row.returnNo} className="hover:bg-slate-50">
                <TableCell className="font-medium text-xs text-blue-600 cursor-pointer hover:underline" onClick={() => onView(row)}>
                    {row.returnNo}
                </TableCell>
                <TableCell className="text-xs">{row.salesman}</TableCell>
                <TableCell className="text-xs">{row.customer}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.returnDate}</TableCell>
                <TableCell className="text-xs font-medium">₱{row.totalAmount.toFixed(2)}</TableCell>
                <TableCell className="text-xs">
                    <Badge variant="secondary" className={
                        row.status === "Received" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-orange-100 text-orange-700 hover:bg-orange-100"
                    }>
                        {row.status}
                    </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.remarks}</TableCell>
                <TableCell className="text-center">
                    {/* ✅ CLICKING THIS OPENS THE MODAL WITH DATA */}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500" onClick={() => onView(row)}>
                        <Eye className="h-3 w-3" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}