import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { SalesReturn } from "../types";

interface DataTableProps {
  data: SalesReturn[];
  onViewDetails: (item: SalesReturn) => void;
}

// 1. Add onViewDetails here 
export function DataTable({ data, onViewDetails }: DataTableProps) {
  if (data.length === 0) {
    return <div className="p-8 text-center border rounded-md text-muted-foreground">No results found.</div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[200px]">Return No.</TableHead>
            <TableHead>Salesman</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Return Date</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Remarks</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium text-blue-600">{row.returnNo}</TableCell>
              <TableCell>{row.salesman}</TableCell>
              <TableCell>{row.customer}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{row.returnDate}</TableCell>
              <TableCell className="text-right font-medium">
                {new Intl.NumberFormat('en-PH', { style: 'decimal', minimumFractionDigits: 2 }).format(row.totalAmount)}
              </TableCell>
              <TableCell><StatusBadge status={row.status} /></TableCell>
              <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">{row.remarks}</TableCell>
              <TableCell className="text-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                  // 2. Add the Click Handler here!
                  onClick={() => onViewDetails(row)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}